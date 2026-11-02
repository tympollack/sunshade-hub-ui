import { describe, it, expect, vi } from 'vitest';
import {
  calculateRevenueWaterfall,
  calculateDynamicTokenPayoutRate,
  checkTreasurySolvency,
  getRedemptionQuote,
  MIN_PAYOUT_RATE_DOLLARS_PER_TOKEN,
  MAX_PAYOUT_RATE_DOLLARS_PER_TOKEN,
  MIN_REDEMPTION_TOKENS,
  MAX_SINGLE_REDEMPTION_CENTS,
  BOUNTY_POOL_ALLOCATION_PERCENT,
  DEFAULT_PLATFORM_OPERATING_RESERVE_PERCENT,
} from '../lib/services/revenueWaterfallService';

describe('TASK-HUB-ESCROW-WATERFALL-CALC: Revenue Waterfall & Solvency Engine', () => {
  describe('calculateRevenueWaterfall', () => {
    it('allocates 80% to bounty escrow pool and 20% to operating reserve', () => {
      // $10,000.00 gross subscription revenue = 1,000,000 cents
      const waterfall = calculateRevenueWaterfall(1000000);

      expect(waterfall.grossSubscriptionRevenueCents).toBe(1000000);
      expect(waterfall.operatingReservePercent).toBe(DEFAULT_PLATFORM_OPERATING_RESERVE_PERCENT);
      expect(waterfall.platformOperatingReserveCents).toBe(200000); // $2,000.00 (20%)
      expect(waterfall.bountyEscrowAllocationCents).toBe(800000);   // $8,000.00 (80%)
    });

    it('handles custom reserve percentages safely clamped to [0, 1]', () => {
      const waterfall = calculateRevenueWaterfall(500000, 0.15); // 15% reserve
      expect(waterfall.platformOperatingReserveCents).toBe(75000);
      expect(waterfall.bountyEscrowAllocationCents).toBe(425000);
    });
  });

  describe('calculateDynamicTokenPayoutRate', () => {
    it('returns rate floor ($0.0001/token) when available cash is zero or negligible', () => {
      expect(calculateDynamicTokenPayoutRate(0, 1000000)).toBe(MIN_PAYOUT_RATE_DOLLARS_PER_TOKEN);
      expect(calculateDynamicTokenPayoutRate(1000, 100000000)).toBe(MIN_PAYOUT_RATE_DOLLARS_PER_TOKEN);
    });

    it('returns calibrated rate based on escrow cash and circulating tokens', () => {
      // $5,000.00 available cash (500,000 cents) across 20,000,000 circulating tokens:
      // $5,000 / 20,000,000 = $0.00025 per token
      const rate = calculateDynamicTokenPayoutRate(500000, 20000000);
      expect(rate).toBe(0.00025);
    });

    it('clamps to ceiling ($0.0005/token) when escrow cash is abundant', () => {
      // $100,000.00 cash across 10,000,000 tokens: $0.01 raw rate -> clamped to 0.0005
      const rate = calculateDynamicTokenPayoutRate(10000000, 10000000);
      expect(rate).toBe(MAX_PAYOUT_RATE_DOLLARS_PER_TOKEN);
    });
  });

  describe('checkTreasurySolvency', () => {
    it('confirms solvency when treasury cash exceeds 30-day operating buffer ($10,000 = 1,000,000 cents)', () => {
      const status = checkTreasurySolvency(1500000, 1000000);
      expect(status.isSolvent).toBe(true);
      expect(status.netAvailableEscrowCashCents).toBe(500000); // $5,000 available above buffer
    });

    it('pauses cash redemption when treasury is below mandatory operating buffer', () => {
      const status = checkTreasurySolvency(800000, 1000000);
      expect(status.isSolvent).toBe(false);
      expect(status.netAvailableEscrowCashCents).toBe(0);
      expect(status.reason).toContain('below the mandatory 30-day operating buffer');
      expect(status.reason).toContain('Internal utility conversions (1.25x bonus) remain active');
    });
  });

  describe('getRedemptionQuote', () => {
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === 'user_token_wallets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { ytd_fiat_redeemed_cents: 0, tax_compliance_verified: false },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }),
    };

    it('rejects redemptions below minimum tokens threshold (10,000 tokens)', async () => {
      const quote = await getRedemptionQuote({
        userId: 'u-1',
        tokensToRedeem: 5000,
        treasuryCashReserveCents: 2000000,
        totalEligibleRebateTokens: 10000000,
        customClient: mockClient,
      });

      expect(quote.eligible).toBe(false);
      expect(quote.circuitBreakerStatus).toBe('BELOW_MINIMUM');
      expect(quote.reason).toContain('Minimum cash redemption is 10,000 tokens');
    });

    it('rejects transactions exceeding single transaction maximum ($2,000.00)', async () => {
      // 10,000,000 tokens @ $0.0005 = $5,000.00 (exceeds $2,000)
      const quote = await getRedemptionQuote({
        userId: 'u-1',
        tokensToRedeem: 10000000,
        treasuryCashReserveCents: 10000000, // abundant cash -> rate = 0.0005
        totalEligibleRebateTokens: 5000000,
        customClient: mockClient,
      });

      expect(quote.eligible).toBe(false);
      expect(quote.circuitBreakerStatus).toBe('EXCEEDS_SINGLE_LIMIT');
      expect(quote.reason).toContain('exceeds maximum single transaction limit of $2,000.00');
    });

    it('rejects cash redemption with TREASURY_SOLVENCY_PAUSE when treasury buffer is breached', async () => {
      const quote = await getRedemptionQuote({
        userId: 'u-1',
        tokensToRedeem: 50000,
        treasuryCashReserveCents: 500000, // $5,000 < $10,000 buffer
        totalEligibleRebateTokens: 10000000,
        mandatorySolvencyBufferCents: 1000000,
        customClient: mockClient,
      });

      expect(quote.eligible).toBe(false);
      expect(quote.isSolvent).toBe(false);
      expect(quote.circuitBreakerStatus).toBe('TREASURY_SOLVENCY_PAUSE');
    });

    it('enforces IRS 1099-NEC circuit breaker when unverified user approaches $599.00 limit', async () => {
      // 2,500,000 tokens @ $0.00025 = $625.00 (62,500 cents > 59,900 cents)
      const quote = await getRedemptionQuote({
        userId: 'u-unverified',
        tokensToRedeem: 2500000,
        treasuryCashReserveCents: 1400000, // $14,000 - $10,000 buffer = $4,000 -> $4k / 16M = 0.00025
        totalEligibleRebateTokens: 16000000,
        customClient: mockClient,
      });

      expect(quote.isSolvent).toBe(true);
      expect(quote.eligible).toBe(false);
      expect(quote.circuitBreakerStatus).toBe('403_TAX_VERIFICATION_REQUIRED');
      expect(quote.reason).toContain('W-9');
    });

    it('approves compliant redemption below $599.00 with accurate payout derivation', async () => {
      // 100,000 tokens @ $0.00025 = $25.00 (2,500 cents)
      const quote = await getRedemptionQuote({
        userId: 'u-valid',
        tokensToRedeem: 100000,
        treasuryCashReserveCents: 1400000, // $14,000 - $10,000 buffer = $4,000 -> $4k / 16M = 0.00025
        totalEligibleRebateTokens: 16000000,
        customClient: mockClient,
      });

      expect(quote.isSolvent).toBe(true);
      expect(quote.eligible).toBe(true);
      expect(quote.effectiveRatePerToken).toBe(0.00025);
      expect(quote.grossPayoutDollars).toBe(25.0);
      expect(quote.grossPayoutCents).toBe(2500);
      expect(quote.circuitBreakerStatus).toBe('ELIGIBLE');
    });
  });
});
