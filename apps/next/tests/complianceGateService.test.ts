import { describe, it, expect, vi } from 'vitest';
import {
  verifyRedemptionEligibility,
  TOKEN_TERMINOLOGY,
  IRS_1099_SAFETY_BUFFER_CENTS,
  hasAcceptedComplianceTerms,
} from '../lib/services/complianceGateService';

describe('Compliance Gate Service & Tax Threshold Circuit-Breaker', () => {
  describe('Terminology Audit Guardrails', () => {
    it('defines official terminology as Verified Contribution Rebate and Closed-Loop Ecosystem Credit', () => {
      expect(TOKEN_TERMINOLOGY.REBATE_UNIT_LABEL).toBe('Verified Contribution Rebate');
      expect(TOKEN_TERMINOLOGY.UTILITY_POINT_LABEL).toBe('Closed-Loop Ecosystem Credit');
      expect(TOKEN_TERMINOLOGY.HOURLY_STANDARD).toContain('20-Hour');
    });

    it('explicitly enumerates prohibited investment and yield terms', () => {
      expect(TOKEN_TERMINOLOGY.PROHIBITED_TERMS).toContain('investment');
      expect(TOKEN_TERMINOLOGY.PROHIBITED_TERMS).toContain('yield');
      expect(TOKEN_TERMINOLOGY.PROHIBITED_TERMS).toContain('apy');
      expect(TOKEN_TERMINOLOGY.PROHIBITED_TERMS).toContain('dividend');
    });
  });

  describe('IRS 1099-NEC Threshold Verification (verifyRedemptionEligibility)', () => {
    it('allows redemptions strictly below $599.00 ($598.99 = 59899 cents) without verified W-9', async () => {
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

      const result = await verifyRedemptionEligibility('user-test-1', 59899, mockClient);
      expect(result.eligible).toBe(true);
      expect(result.status).toBe('ELIGIBLE');
      expect(result.projectedTotalCents).toBe(59899);
      expect(result.taxComplianceVerified).toBe(false);
    });

    it('blocks redemptions at or above $599.00 ($599.00 = 59900 cents) when tax_compliance_verified is false', async () => {
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

      const result = await verifyRedemptionEligibility('user-test-2', 59900, mockClient);
      expect(result.eligible).toBe(false);
      expect(result.status).toBe('403_TAX_VERIFICATION_REQUIRED');
      expect(result.redirectUrl).toBe('/dashboard/compliance/w9-verification');
      expect(result.projectedTotalCents).toBe(59900);
      expect(result.message).toContain('$599.00');
    });

    it('allows redemptions above $599.00 when tax_compliance_verified is true', async () => {
      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'user_token_wallets') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { ytd_fiat_redeemed_cents: 25000, tax_compliance_verified: true },
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

      const result = await verifyRedemptionEligibility('user-test-3', 100000, mockClient);
      expect(result.eligible).toBe(true);
      expect(result.status).toBe('ELIGIBLE');
      expect(result.projectedTotalCents).toBe(125000);
      expect(result.taxComplianceVerified).toBe(true);
    });

    it('blocks cumulative payouts crossing $599.00 across multiple redemptions', async () => {
      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'user_token_wallets') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { ytd_fiat_redeemed_cents: 50000, tax_compliance_verified: false },
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

      // Requesting $99.00 (9900 cents): total = 59900 cents -> triggers safety gate
      const result = await verifyRedemptionEligibility('user-test-4', 9900, mockClient);
      expect(result.eligible).toBe(false);
      expect(result.status).toBe('403_TAX_VERIFICATION_REQUIRED');
      expect(result.projectedTotalCents).toBe(59900);
    });

    it('counts queued in-flight redemptions towards the cumulative $599 threshold to prevent evasion', async () => {
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
          if (table === 'hub_tokens_ledger') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [{ metadata: { requested_usd_cents: 50000 } }], // $500 already queued
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

      // In-flight $500 + new request $100 = $600 (>= $599) -> must block
      const result = await verifyRedemptionEligibility('user-test-queued', 10000, mockClient);
      expect(result.eligible).toBe(false);
      expect(result.status).toBe('403_TAX_VERIFICATION_REQUIRED');
      expect(result.pendingFiatCents).toBe(50000);
      expect(result.projectedTotalCents).toBe(60000);
    });

    it('rejects invalid or non-positive redemption amounts', async () => {
      const resultZero = await verifyRedemptionEligibility('user-test-5', 0);
      expect(resultZero.eligible).toBe(false);
      expect(resultZero.status).toBe('INVALID_AMOUNT');

      const resultNegative = await verifyRedemptionEligibility('user-test-5', -500);
      expect(resultNegative.eligible).toBe(false);
      expect(resultNegative.status).toBe('INVALID_AMOUNT');

      const resultFloat = await verifyRedemptionEligibility('user-test-5', 599.5);
      expect(resultFloat.eligible).toBe(false);
      expect(resultFloat.status).toBe('INVALID_AMOUNT');
    });
  });

  describe('Terms of Service Acceptance (hasAcceptedComplianceTerms)', () => {
    it('returns true if consent record exists for matching version', async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'consent-1' }],
              error: null,
            }),
          }),
        }),
      };

      const accepted = await hasAcceptedComplianceTerms('user-consent-1', '1.0', mockClient);
      expect(accepted).toBe(true);
    });

    it('returns false if consent record does not exist', async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };

      const accepted = await hasAcceptedComplianceTerms('user-consent-2', '1.0', mockClient);
      expect(accepted).toBe(false);
    });
  });
});
