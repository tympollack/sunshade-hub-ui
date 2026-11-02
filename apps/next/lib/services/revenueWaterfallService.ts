import {
  verifyRedemptionEligibility,
  IRS_1099_SAFETY_BUFFER_CENTS,
  RedemptionEligibilityResult,
} from './complianceGateService';

export const DEFAULT_PLATFORM_OPERATING_RESERVE_PERCENT = 0.20; // 20% platform reserve
export const BOUNTY_POOL_ALLOCATION_PERCENT = 0.80; // 80% customer subscription revenue to sovereign bounty escrow
export const MIN_PAYOUT_RATE_DOLLARS_PER_TOKEN = 0.0001; // $0.0001 floor ($6.00/60k tokens)
export const MAX_PAYOUT_RATE_DOLLARS_PER_TOKEN = 0.0005; // $0.0005 ceiling ($30.00/60k tokens)
export const MIN_REDEMPTION_TOKENS = 10000; // Minimum 10,000 tokens
export const MAX_SINGLE_REDEMPTION_CENTS = 200000; // $2,000.00 max single payout
export const MAX_MONTHLY_REDEMPTION_CENTS = 1000000; // $10,000.00 max monthly user payout
export const DEFAULT_MANDATORY_SOLVENCY_BUFFER_CENTS = 1000000; // $10,000.00 (30-day operating cash buffer)

export interface WaterfallDistribution {
  grossSubscriptionRevenueCents: number;
  operatingReservePercent: number;
  platformOperatingReserveCents: number;
  bountyEscrowAllocationCents: number;
  effectiveRatePerToken: number;
  rateFloor: number;
  rateCeiling: number;
}

export interface TreasurySolvencyStatus {
  isSolvent: boolean;
  treasuryCashReserveCents: number;
  mandatorySolvencyBufferCents: number;
  netAvailableEscrowCashCents: number;
  reason?: string;
}

export interface RedemptionQuote {
  tokensToRedeem: number;
  effectiveRatePerToken: number;
  grossPayoutCents: number;
  grossPayoutDollars: number;
  isSolvent: boolean;
  eligible: boolean;
  circuitBreakerStatus: string;
  reason?: string;
}

/**
 * Calculates revenue waterfall distribution from customer subscription receipts.
 */
export function calculateRevenueWaterfall(
  grossSubscriptionRevenueCents: number,
  operatingReservePercent: number = DEFAULT_PLATFORM_OPERATING_RESERVE_PERCENT
): WaterfallDistribution {
  const gross = Math.max(0, Math.round(grossSubscriptionRevenueCents));
  const reservePct = Math.min(1.0, Math.max(0.0, operatingReservePercent));
  const platformOperatingReserveCents = Math.round(gross * reservePct);
  const bountyEscrowAllocationCents = gross - platformOperatingReserveCents;

  return {
    grossSubscriptionRevenueCents: gross,
    operatingReservePercent: reservePct,
    platformOperatingReserveCents,
    bountyEscrowAllocationCents,
    effectiveRatePerToken: MIN_PAYOUT_RATE_DOLLARS_PER_TOKEN,
    rateFloor: MIN_PAYOUT_RATE_DOLLARS_PER_TOKEN,
    rateCeiling: MAX_PAYOUT_RATE_DOLLARS_PER_TOKEN,
  };
}

/**
 * Calculates dynamic token cash payout rate anchored to available escrow cash
 * and total circulating eligible rebate tokens.
 */
export function calculateDynamicTokenPayoutRate(
  availableEscrowCashCents: number,
  totalEligibleRebateTokens: number
): number {
  if (totalEligibleRebateTokens <= 0 || availableEscrowCashCents <= 0) {
    return MIN_PAYOUT_RATE_DOLLARS_PER_TOKEN;
  }

  const availableCashDollars = availableEscrowCashCents / 100;
  const rawRate = availableCashDollars / totalEligibleRebateTokens;

  // Clamp within calibrated bounds [$0.0001, $0.0005]
  const clampedRate = Math.min(
    MAX_PAYOUT_RATE_DOLLARS_PER_TOKEN,
    Math.max(MIN_PAYOUT_RATE_DOLLARS_PER_TOKEN, rawRate)
  );

  return Number(clampedRate.toFixed(6));
}

/**
 * Checks treasury cash reserves against the mandatory 30-day operating buffer.
 */
export function checkTreasurySolvency(
  treasuryCashReserveCents: number,
  mandatorySolvencyBufferCents: number = DEFAULT_MANDATORY_SOLVENCY_BUFFER_CENTS
): TreasurySolvencyStatus {
  const netAvailableEscrowCashCents = Math.max(0, treasuryCashReserveCents - mandatorySolvencyBufferCents);
  const isSolvent = treasuryCashReserveCents >= mandatorySolvencyBufferCents;

  if (!isSolvent) {
    return {
      isSolvent: false,
      treasuryCashReserveCents,
      mandatorySolvencyBufferCents,
      netAvailableEscrowCashCents: 0,
      reason: `Treasury cash reserve ($${(treasuryCashReserveCents / 100).toFixed(2)}) is below the mandatory 30-day operating buffer ($${(mandatorySolvencyBufferCents / 100).toFixed(2)}). Cash redemptions are queued until revenue threshold restores solvency. Internal utility conversions (1.25x bonus) remain active.`,
    };
  }

  return {
    isSolvent: true,
    treasuryCashReserveCents,
    mandatorySolvencyBufferCents,
    netAvailableEscrowCashCents,
  };
}

/**
 * Generates an accurate cash redemption quote given token amount, treasury status, and user eligibility.
 */
export async function getRedemptionQuote(params: {
  userId: string;
  tokensToRedeem: number;
  treasuryCashReserveCents: number;
  totalEligibleRebateTokens: number;
  mandatorySolvencyBufferCents?: number;
  customClient?: any;
}): Promise<RedemptionQuote> {
  const tokens = Math.max(0, Math.floor(params.tokensToRedeem));

  if (tokens < MIN_REDEMPTION_TOKENS) {
    return {
      tokensToRedeem: tokens,
      effectiveRatePerToken: MIN_PAYOUT_RATE_DOLLARS_PER_TOKEN,
      grossPayoutCents: 0,
      grossPayoutDollars: 0,
      isSolvent: true,
      eligible: false,
      circuitBreakerStatus: 'BELOW_MINIMUM',
      reason: `Minimum cash redemption is ${MIN_REDEMPTION_TOKENS.toLocaleString()} tokens.`,
    };
  }

  const solvency = checkTreasurySolvency(
    params.treasuryCashReserveCents,
    params.mandatorySolvencyBufferCents
  );

  const effectiveRate = calculateDynamicTokenPayoutRate(
    solvency.netAvailableEscrowCashCents,
    params.totalEligibleRebateTokens
  );

  const grossPayoutDollars = tokens * effectiveRate;
  const grossPayoutCents = Math.round(grossPayoutDollars * 100);

  if (grossPayoutCents > MAX_SINGLE_REDEMPTION_CENTS) {
    return {
      tokensToRedeem: tokens,
      effectiveRatePerToken: effectiveRate,
      grossPayoutCents,
      grossPayoutDollars,
      isSolvent: solvency.isSolvent,
      eligible: false,
      circuitBreakerStatus: 'EXCEEDS_SINGLE_LIMIT',
      reason: `Requested payout ($${(grossPayoutCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}) exceeds maximum single transaction limit of $${(MAX_SINGLE_REDEMPTION_CENTS / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}.`,
    };
  }

  if (!solvency.isSolvent) {
    return {
      tokensToRedeem: tokens,
      effectiveRatePerToken: effectiveRate,
      grossPayoutCents,
      grossPayoutDollars,
      isSolvent: false,
      eligible: false,
      circuitBreakerStatus: 'TREASURY_SOLVENCY_PAUSE',
      reason: solvency.reason,
    };
  }

  // Solvency Post-Condition Guard: Verify the payout itself does not breach the mandatory buffer
  if (solvency.netAvailableEscrowCashCents < grossPayoutCents) {
    return {
      tokensToRedeem: tokens,
      effectiveRatePerToken: effectiveRate,
      grossPayoutCents,
      grossPayoutDollars,
      isSolvent: false,
      eligible: false,
      circuitBreakerStatus: 'TREASURY_SOLVENCY_PAUSE',
      reason: `Payout of $${(grossPayoutCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} exceeds available escrow cash ($${(solvency.netAvailableEscrowCashCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}) above the mandatory 30-day operating buffer. Cash redemptions are paused.`,
    };
  }

  // Verify IRS 1099-NEC & cumulative tax compliance
  const compliance = await verifyRedemptionEligibility(
    params.userId,
    grossPayoutCents,
    params.customClient
  );

  return {
    tokensToRedeem: tokens,
    effectiveRatePerToken: effectiveRate,
    grossPayoutCents,
    grossPayoutDollars,
    isSolvent: true,
    eligible: compliance.eligible,
    circuitBreakerStatus: compliance.status,
    reason: compliance.message,
  };
}
