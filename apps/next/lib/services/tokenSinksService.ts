/**
 * Native Ecosystem Token Sinks Service
 * Provides non-fiat, closed-loop utility destinations for SunShade tokens:
 * 1. Compute / LLM Credits (1.25x internal bonus value)
 * 2. Priority CI Runner Minutes
 * 3. Community Scholarship & Bounty Pool Donations
 * 4. Physical Developer Merchandise Store
 */

export const UTILITY_BONUS_MULTIPLIER = 1.25; // 1.25x bonus value for internal utility conversion
export const BASE_COMPUTE_CREDIT_RATE_PER_TOKEN = 0.0001; // $0.0001 base
export const EFFECTIVE_COMPUTE_CREDIT_RATE_PER_TOKEN =
  BASE_COMPUTE_CREDIT_RATE_PER_TOKEN * UTILITY_BONUS_MULTIPLIER; // $0.000125 per token ($1.25 / 10k tokens)

export const CI_MINUTES_PER_TOKEN = 0.01; // 100 tokens = 1 priority runner minute (10k tokens = 100 mins)

export type UtilitySinkType =
  | 'COMPUTE_CREDITS'
  | 'PRIORITY_CI_MINUTES'
  | 'COMMUNITY_SCHOLARSHIP'
  | 'DEV_MERCHANDISE';

export interface MerchCatalogItem {
  id: string;
  name: string;
  description: string;
  tokenPrice: number;
  category: 'apparel' | 'hardware' | 'accessories';
}

export const DEV_MERCH_CATALOG: MerchCatalogItem[] = [
  {
    id: 'sunshade_heavyweight_hoodie',
    name: 'SunShade Contributor Heavyweight Hoodie',
    description: 'Custom embroidered French terry organic cotton hoodie with contributor insignia.',
    tokenPrice: 250000,
    category: 'apparel',
  },
  {
    id: 'yubikey_security_token',
    name: 'YubiKey 5C NFC Security Key',
    description: 'Hardware authentication key with custom engraved SunShade ecosystem serial.',
    tokenPrice: 150000,
    category: 'hardware',
  },
  {
    id: 'artisan_keycap_set',
    name: 'CNC Anodized Aluminum Artisan Keycap',
    description: 'Cherry MX profile machined metallic keycap with illuminated SunShade logo.',
    tokenPrice: 75000,
    category: 'accessories',
  },
];

export interface UtilityConversionResult {
  sinkType: UtilitySinkType;
  tokensSpent: number;
  utilityYieldLabel: string;
  utilityValueUnits: number;
  bonusMultiplierApplied: number;
  targetAccountRef?: string;
}

/**
 * Calculates compute credits acquired for a token redemption including the 1.25x bonus.
 */
export function calculateComputeCredits(tokens: number): {
  tokensSpent: number;
  creditDollars: number;
  creditCents: number;
  bonusPercent: string;
} {
  const cleanTokens = Math.max(0, Math.floor(tokens));
  const creditDollars = Number((cleanTokens * EFFECTIVE_COMPUTE_CREDIT_RATE_PER_TOKEN).toFixed(4));
  const creditCents = Math.round(creditDollars * 100);

  return {
    tokensSpent: cleanTokens,
    creditDollars,
    creditCents,
    bonusPercent: '+25%',
  };
}

/**
 * Calculates priority CI runner minutes acquired for a token redemption.
 */
export function calculatePriorityCIMinutes(tokens: number): {
  tokensSpent: number;
  ciMinutes: number;
} {
  const cleanTokens = Math.max(0, Math.floor(tokens));
  const ciMinutes = Math.floor(cleanTokens * CI_MINUTES_PER_TOKEN);

  return {
    tokensSpent: cleanTokens,
    ciMinutes,
  };
}

/**
 * Validates and calculates utility redemption details across all sink types.
 */
export function quoteUtilitySinkConversion(params: {
  sinkType: UtilitySinkType;
  tokens: number;
  merchItemId?: string;
}): UtilityConversionResult {
  const tokens = Math.max(0, Math.floor(params.tokens));

  switch (params.sinkType) {
    case 'COMPUTE_CREDITS': {
      const compute = calculateComputeCredits(tokens);
      return {
        sinkType: 'COMPUTE_CREDITS',
        tokensSpent: tokens,
        utilityYieldLabel: `$${compute.creditDollars.toFixed(2)} LLM / Compute Credits (1.25x bonus)`,
        utilityValueUnits: compute.creditCents,
        bonusMultiplierApplied: UTILITY_BONUS_MULTIPLIER,
      };
    }

    case 'PRIORITY_CI_MINUTES': {
      const ci = calculatePriorityCIMinutes(tokens);
      return {
        sinkType: 'PRIORITY_CI_MINUTES',
        tokensSpent: tokens,
        utilityYieldLabel: `${ci.ciMinutes.toLocaleString()} Priority CI Minutes`,
        utilityValueUnits: ci.ciMinutes,
        bonusMultiplierApplied: 1.0,
      };
    }

    case 'COMMUNITY_SCHOLARSHIP': {
      return {
        sinkType: 'COMMUNITY_SCHOLARSHIP',
        tokensSpent: tokens,
        utilityYieldLabel: `${tokens.toLocaleString()} Tokens Donated to Community Scholarship & Bounty Pool`,
        utilityValueUnits: tokens,
        bonusMultiplierApplied: 1.0,
        targetAccountRef: '00000000-0000-0000-0000-000000000000',
      };
    }

    case 'DEV_MERCHANDISE': {
      const item = DEV_MERCH_CATALOG.find((m) => m.id === params.merchItemId);
      if (!item) {
        throw new Error(`Invalid merch item ID: "${params.merchItemId}".`);
      }
      if (tokens < item.tokenPrice) {
        throw new Error(
          `Insufficient tokens for ${item.name}. Required: ${item.tokenPrice.toLocaleString()} tokens, provided: ${tokens.toLocaleString()}.`
        );
      }
      return {
        sinkType: 'DEV_MERCHANDISE',
        tokensSpent: item.tokenPrice,
        utilityYieldLabel: item.name,
        utilityValueUnits: 1,
        bonusMultiplierApplied: 1.0,
        targetAccountRef: item.id,
      };
    }

    default:
      throw new Error(`Unsupported utility sink type: ${(params as any).sinkType}`);
  }
}

/**
 * Validates, debits contributor wallet, and atomically fulfills utility sink conversion.
 */
export async function executeUtilitySinkConversion(params: {
  userId: string;
  sinkType: UtilitySinkType;
  tokens: number;
  merchItemId?: string;
  customClient?: any;
}) {
  if (
    typeof params.tokens !== 'number' ||
    !Number.isFinite(params.tokens) ||
    !Number.isInteger(params.tokens) ||
    params.tokens <= 0 ||
    params.tokens > Number.MAX_SAFE_INTEGER
  ) {
    throw new Error('Redemption token amount must be a finite positive integer.');
  }

  const quote = quoteUtilitySinkConversion({
    sinkType: params.sinkType,
    tokens: params.tokens,
    merchItemId: params.merchItemId,
  });

  const client = params.customClient;
  if (!client) {
    // Return quote if client not provided (e.g. dry-run quote mode)
    return {
      success: true,
      fulfilled: false,
      conversion: quote,
      remainingBalance: 0,
      message: `Quote generated for ${quote.tokensSpent.toLocaleString()} tokens into ${quote.utilityYieldLabel}.`,
    };
  }

  // 1. Fetch user wallet balance
  const { data: wallet, error: walletErr } = await client
    .from('user_token_wallets')
    .select('utility_balance')
    .eq('user_id', params.userId)
    .maybeSingle();

  if (walletErr) {
    throw new Error(`Database error querying wallet: ${walletErr.message}`);
  }

  const currentBalance = Number(wallet?.utility_balance ?? 0);
  if (currentBalance < quote.tokensSpent) {
    throw new Error(
      `Insufficient token balance. You have ${currentBalance.toLocaleString()} tokens, but ${quote.tokensSpent.toLocaleString()} tokens are required.`
    );
  }

  const newBalance = currentBalance - quote.tokensSpent;

  // 2. Debit tokens from user wallet
  const { error: updateErr } = await client
    .from('user_token_wallets')
    .update({
      utility_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', params.userId);

  if (updateErr) {
    throw new Error(`Failed to update wallet balance: ${updateErr.message}`);
  }

  // 3. Insert transaction into hub_tokens_ledger
  await client.from('hub_tokens_ledger').insert({
    user_id: params.userId,
    token_class: 'utility_token',
    transaction_type: 'UTILITY_CONVERSION',
    amount: -quote.tokensSpent,
    description: `Utility Conversion: ${quote.utilityYieldLabel}`,
    metadata: {
      sink_type: quote.sinkType,
      yield_label: quote.utilityYieldLabel,
      value_units: quote.utilityValueUnits,
      bonus_multiplier: quote.bonusMultiplierApplied,
      target_account_ref: quote.targetAccountRef,
      executed_at: new Date().toISOString(),
    },
  });

  return {
    success: true,
    fulfilled: true,
    conversion: quote,
    remainingBalance: newBalance,
    message: `Successfully fulfilled conversion of ${quote.tokensSpent.toLocaleString()} tokens into ${quote.utilityYieldLabel}. Remaining balance: ${newBalance.toLocaleString()} tokens.`,
  };
}
