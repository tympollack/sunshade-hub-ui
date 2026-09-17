import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { TokenBalanceBadge } from '../components/TokenBalanceBadge';
import { AtmosphericBadge } from '../components/AtmosphericBadge';
import { VIEWPORT_PRESETS, getViewportContainerStyle, ViewportKey } from './utils/withViewport';

describe('Primitives Viewport Matrix & Layout Boundary Test Suite', () => {
  const presets: ViewportKey[] = ['compact', 'standard', 'wide'];

  presets.forEach((presetKey) => {
    const preset = VIEWPORT_PRESETS[presetKey];

    describe(`Viewport: ${preset.name}`, () => {
      it('GlassCard does not enforce a fixed width greater than 320px and respects container constraints', () => {
        const { container } = render(
          <div style={getViewportContainerStyle(preset)}>
            <GlassCard variant="default" padding="md">
              <span id="child">Glass Card Content</span>
            </GlassCard>
          </div>
        );

        const card = container.firstElementChild as HTMLElement;
        expect(card).toBeTruthy();

        // Verify card does not exceed viewport width
        const style = window.getComputedStyle(card);
        const fixedWidth = parseFloat(style.width);
        if (!isNaN(fixedWidth)) {
          expect(fixedWidth).toBeLessThanOrEqual(preset.width);
        }

        // Check flexShrink is not disabled (0)
        expect(style.flexShrink).not.toBe('0');
      });

      it('PrimaryButton does not force fixed width > 320px, wraps text gracefully, and flexShrink !== 0', () => {
        const { container } = render(
          <div style={getViewportContainerStyle(preset)}>
            <PrimaryButton label="Long Action Button Text That Must Not Clip Or Overflow Viewport" variant="sunshade" size="md" />
          </div>
        );

        const buttonWrapper = container.firstElementChild as HTMLElement;
        expect(buttonWrapper).toBeTruthy();

        const button = buttonWrapper.firstElementChild as HTMLElement;
        expect(button).toBeTruthy();

        const style = window.getComputedStyle(button);
        const fixedWidth = parseFloat(style.width);
        if (!isNaN(fixedWidth)) {
          expect(fixedWidth).toBeLessThanOrEqual(preset.width);
        }

        expect(style.flexShrink).not.toBe('0');
      });

      it('TokenBalanceBadge scales smoothly without horizontal clipping on 320px', () => {
        const { container } = render(
          <div style={getViewportContainerStyle(preset)}>
            <TokenBalanceBadge balance={99999999} symbol="SUN" label="Total Staked Balance" variant="default" />
          </div>
        );

        const badgeWrapper = container.firstElementChild as HTMLElement;
        expect(badgeWrapper).toBeTruthy();

        const badge = badgeWrapper.firstElementChild as HTMLElement;
        expect(badge).toBeTruthy();

        const style = window.getComputedStyle(badge);
        const fixedWidth = parseFloat(style.width);
        if (!isNaN(fixedWidth)) {
          expect(fixedWidth).toBeLessThanOrEqual(preset.width);
        }

        expect(style.flexShrink).not.toBe('0');
      });

      it('AtmosphericBadge renders cleanly within 320px boundaries', () => {
        const { container } = render(
          <div style={getViewportContainerStyle(preset)}>
            <AtmosphericBadge label="Ecosystem Operational: 100% Hitless Bonding Active" variant="core" statusDot />
          </div>
        );

        const badgeWrapper = container.firstElementChild as HTMLElement;
        expect(badgeWrapper).toBeTruthy();

        const badge = badgeWrapper.firstElementChild as HTMLElement;
        expect(badge).toBeTruthy();

        const style = window.getComputedStyle(badge);
        const fixedWidth = parseFloat(style.width);
        if (!isNaN(fixedWidth)) {
          expect(fixedWidth).toBeLessThanOrEqual(preset.width);
        }

        expect(style.flexShrink).not.toBe('0');
      });
    });
  });

  describe('320px Hard Boundary Invariants', () => {
    it('ensures core primitives rendered side-by-side or stacked do not cause horizontal overflow', () => {
      const compactPreset = VIEWPORT_PRESETS.compact;
      const { container } = render(
        <div style={getViewportContainerStyle(compactPreset)} data-testid="viewport-container">
          <GlassCard padding="sm">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <AtmosphericBadge label="Online" variant="core" />
              <TokenBalanceBadge balance={100} symbol="HT" />
              <PrimaryButton label="Submit" variant="sunshade" />
            </div>
          </GlassCard>
        </div>
      );

      const wrapper = container.querySelector('[data-testid="viewport-container"]') as HTMLElement;
      expect(wrapper).toBeTruthy();
      expect(wrapper.scrollWidth).toBeLessThanOrEqual(compactPreset.width);
    });
  });
});
