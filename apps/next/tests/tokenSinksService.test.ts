import { describe, it, expect } from 'vitest';
import {
  calculateComputeCredits,
  calculatePriorityCIMinutes,
  quoteUtilitySinkConversion,
  UTILITY_BONUS_MULTIPLIER,
  DEV_MERCH_CATALOG,
} from '../lib/services/tokenSinksService';

describe('TASK-HUB-ECOSYSTEM-TOKEN-SINKS: Native Utility Token Sinks', () => {
  describe('calculateComputeCredits (1.25x internal bonus value)', () => {
    it('applies a 1.25x value multiplier giving $1.25 of AI compute for 10,000 tokens', () => {
      expect(UTILITY_BONUS_MULTIPLIER).toBe(1.25);

      const res = calculateComputeCredits(10000);
      expect(res.tokensSpent).toBe(10000);
      expect(res.creditDollars).toBe(1.25);
      expect(res.creditCents).toBe(125);
      expect(res.bonusPercent).toBe('+25%');
    });

    it('accurately scales compute credits for 100,000 tokens ($12.50)', () => {
      const res = calculateComputeCredits(100000);
      expect(res.creditDollars).toBe(12.5);
      expect(res.creditCents).toBe(1250);
    });
  });

  describe('calculatePriorityCIMinutes', () => {
    it('awards 1 priority runner minute per 100 tokens spent', () => {
      const res1 = calculatePriorityCIMinutes(10000);
      expect(res1.ciMinutes).toBe(100);

      const res2 = calculatePriorityCIMinutes(50000);
      expect(res2.ciMinutes).toBe(500);
    });
  });

  describe('quoteUtilitySinkConversion', () => {
    it('quotes COMPUTE_CREDITS conversion accurately', () => {
      const quote = quoteUtilitySinkConversion({
        sinkType: 'COMPUTE_CREDITS',
        tokens: 50000,
      });

      expect(quote.sinkType).toBe('COMPUTE_CREDITS');
      expect(quote.tokensSpent).toBe(50000);
      expect(quote.utilityYieldLabel).toContain('$6.25');
      expect(quote.bonusMultiplierApplied).toBe(1.25);
    });

    it('quotes PRIORITY_CI_MINUTES conversion accurately', () => {
      const quote = quoteUtilitySinkConversion({
        sinkType: 'PRIORITY_CI_MINUTES',
        tokens: 25000,
      });

      expect(quote.sinkType).toBe('PRIORITY_CI_MINUTES');
      expect(quote.utilityYieldLabel).toBe('250 Priority CI Minutes');
      expect(quote.utilityValueUnits).toBe(250);
    });

    it('quotes COMMUNITY_SCHOLARSHIP donation to the ecosystem scholarship pool', () => {
      const quote = quoteUtilitySinkConversion({
        sinkType: 'COMMUNITY_SCHOLARSHIP',
        tokens: 100000,
      });

      expect(quote.sinkType).toBe('COMMUNITY_SCHOLARSHIP');
      expect(quote.targetAccountRef).toBe('00000000-0000-0000-0000-000000000000');
      expect(quote.utilityYieldLabel).toContain('100,000 Tokens Donated to Community Scholarship & Bounty Pool');
    });

    it('validates and quotes physical DEV_MERCHANDISE redemptions', () => {
      const hoodie = DEV_MERCH_CATALOG.find((i) => i.id === 'sunshade_heavyweight_hoodie')!;
      expect(hoodie).toBeDefined();

      const quote = quoteUtilitySinkConversion({
        sinkType: 'DEV_MERCHANDISE',
        tokens: 300000,
        merchItemId: hoodie.id,
      });

      expect(quote.sinkType).toBe('DEV_MERCHANDISE');
      expect(quote.tokensSpent).toBe(hoodie.tokenPrice);
      expect(quote.utilityYieldLabel).toBe(hoodie.name);
    });

    it('throws error when contributor tokens are insufficient for merchandise item', () => {
      expect(() =>
        quoteUtilitySinkConversion({
          sinkType: 'DEV_MERCHANDISE',
          tokens: 50000, // Hoodie requires 250,000 tokens
          merchItemId: 'sunshade_heavyweight_hoodie',
        })
      ).toThrow('Insufficient tokens for SunShade Contributor Heavyweight Hoodie');
    });

    it('throws error for invalid merchandise item id', () => {
      expect(() =>
        quoteUtilitySinkConversion({
          sinkType: 'DEV_MERCHANDISE',
          tokens: 500000,
          merchItemId: 'non_existent_item',
        })
      ).toThrow('Invalid merch item ID: "non_existent_item"');
    });
  });
});
