import { createServiceClient } from '../supabase-server';

/**
 * Compliance Gate Service
 * Enforces SEC / FinCEN closed-loop compliance and IRS 1099-NEC reporting thresholds.
 */

// Terminology Audit Constants:
// Defines the token strictly as a 'Verified Contribution Rebate' and 'Closed-Loop Ecosystem Credit'.
// Never 'investment', 'yield', 'APY', or 'dividend'.
export const TOKEN_TERMINOLOGY = {
  OFFICIAL_NAME: 'SunShade Contribution Credit',
  REBATE_UNIT_LABEL: 'Verified Contribution Rebate',
  UTILITY_POINT_LABEL: 'Closed-Loop Ecosystem Credit',
  HOURLY_STANDARD: '20-Hour Sovereign Contribution Standard',
  TERMS_NAME: 'Independent Contributor & Utility Rebate Terms',
  TERMS_VERSION: '1.0',
  LEGAL_DISCLAIMER:
    'SunShade tokens are non-transferable closed-loop utility credits and labor-rebate units. They do not constitute securities, investments, dividends, or debt instruments under SEC or FinCEN regulations.',
  PROHIBITED_TERMS: [
    'investment',
    'yield',
    'apy',
    'dividend',
    'interest',
    'roi',
    'security',
    'token purchase',
  ] as const,
} as const;

export const IRS_1099_NEC_THRESHOLD_CENTS = 60000; // $600.00
export const IRS_1099_SAFETY_BUFFER_CENTS = 59900; // $599.00 ($599 safety buffer below IRS reporting limit)

export interface RedemptionEligibilityResult {
  eligible: boolean;
  status: 'ELIGIBLE' | '403_TAX_VERIFICATION_REQUIRED' | 'INVALID_AMOUNT';
  ytdFiatRedeemedCents: number;
  pendingFiatCents: number;
  requestedUsdCents: number;
  projectedTotalCents: number;
  taxComplianceVerified: boolean;
  message?: string;
  redirectUrl?: string;
}

export interface UserWalletData {
  user_id: string;
  utility_balance: number;
  rebate_units_pending: number;
  rebate_units_vested: number;
  ytd_fiat_redeemed_cents: number;
  tax_compliance_verified: boolean;
}

/**
 * Verifies if a contributor is eligible to disburse a fiat PayPal payout
 * based on IRS 1099-NEC safety buffers, pending queued redemptions, and verified tax status.
 */
export async function verifyRedemptionEligibility(
  userId: string,
  requestedUsdCents: number,
  customClient?: any
): Promise<RedemptionEligibilityResult> {
  if (requestedUsdCents <= 0 || !Number.isInteger(requestedUsdCents)) {
    return {
      eligible: false,
      status: 'INVALID_AMOUNT',
      ytdFiatRedeemedCents: 0,
      pendingFiatCents: 0,
      requestedUsdCents,
      projectedTotalCents: requestedUsdCents,
      taxComplianceVerified: false,
      message: 'Redemption amount must be a positive integer in cents.',
    };
  }

  let ytdFiatRedeemedCents = 0;
  let pendingFiatCents = 0;
  let taxComplianceVerified = false;

  const client = customClient || (typeof createServiceClient === 'function' ? createServiceClient() : null);

  if (client) {
    // 1. Fetch wallet settled YTD fiat and verification status
    const { data: wallet, error } = await client
      .from('user_token_wallets')
      .select('ytd_fiat_redeemed_cents, tax_compliance_verified')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && wallet) {
      ytdFiatRedeemedCents = Number(wallet.ytd_fiat_redeemed_cents || 0);
      taxComplianceVerified = Boolean(wallet.tax_compliance_verified);
    }

    // 2. Query queued or in-flight redemption requests that have not yet settled,
    // preventing concurrent/repeated sub-$599 requests from evading the cumulative gate
    try {
      const { data: pendingEntries } = await client
        .from('hub_tokens_ledger')
        .select('metadata')
        .eq('user_id', userId)
        .eq('transaction_type', 'REDEMPTION_QUEUED');

      if (Array.isArray(pendingEntries)) {
        for (const entry of pendingEntries) {
          const cents = Number(entry?.metadata?.requested_usd_cents || 0);
          if (cents > 0) {
            pendingFiatCents += cents;
          }
        }
      }
    } catch {
      // Table may not have queued rows yet
    }
  }

  const projectedTotalCents = ytdFiatRedeemedCents + pendingFiatCents + requestedUsdCents;

  // IRS 1099-NEC circuit breaker check:
  // If the projected calendar-year redemptions (settled + pending + requested) meet or exceed $599.00 (59,900 cents)
  // without verified tax paperwork (W-9 / identity verification), halt and block payout.
  if (projectedTotalCents >= IRS_1099_SAFETY_BUFFER_CENTS && !taxComplianceVerified) {
    return {
      eligible: false,
      status: '403_TAX_VERIFICATION_REQUIRED',
      ytdFiatRedeemedCents,
      pendingFiatCents,
      requestedUsdCents,
      projectedTotalCents,
      taxComplianceVerified: false,
      message:
        'Cumulative calendar-year redemption reaches or exceeds $599.00 IRS 1099-NEC reporting threshold. Verified W-9 tax documentation required before payout eligibility.',
      redirectUrl: '/dashboard/compliance/w9-verification',
    };
  }

  return {
    eligible: true,
    status: 'ELIGIBLE',
    ytdFiatRedeemedCents,
    pendingFiatCents,
    requestedUsdCents,
    projectedTotalCents,
    taxComplianceVerified,
  };
}

/**
 * Records explicit user consent to the Independent Contributor & Utility Rebate Terms.
 */
export async function recordComplianceConsent(
  userId: string,
  options?: {
    termsName?: string;
    termsVersion?: string;
    ipHash?: string;
    client?: any;
  }
) {
  const client = options?.client || createServiceClient();
  const termsName = options?.termsName || TOKEN_TERMINOLOGY.TERMS_NAME;
  const termsVersion = options?.termsVersion || TOKEN_TERMINOLOGY.TERMS_VERSION;
  const ipHash = options?.ipHash || null;

  const { data, error } = await client
    .from('user_compliance_consents')
    .insert({
      user_id: userId,
      terms_name: termsName,
      terms_version: termsVersion,
      ip_hash: ipHash,
      accepted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record compliance consent: ${error.message}`);
  }

  return data;
}

/**
 * Validates that user has accepted the mandatory terms before accessing the bounty system.
 */
export async function hasAcceptedComplianceTerms(
  userId: string,
  termsVersion: string = TOKEN_TERMINOLOGY.TERMS_VERSION,
  customClient?: any
): Promise<boolean> {
  const client = customClient || createServiceClient();

  const { data, error } = await client
    .from('user_compliance_consents')
    .select('id')
    .eq('user_id', userId)
    .eq('terms_version', termsVersion)
    .limit(1);

  if (error || !data || data.length === 0) {
    return false;
  }

  return true;
}
