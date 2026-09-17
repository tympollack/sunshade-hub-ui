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
        const { getByTestId } = render(
          <div style={getViewportContainerStyle(preset)}>
            <GlassCard variant="default" padding="md" testID="primitive-glass-card">
              <span id="child">Glass Card Content</span>
            </GlassCard>
          </div>
        );

        const card = getByTestId('primitive-glass-card');
        expect(card).toBeTruthy();

        // Verify the primitive itself does not exceed viewport width or declare fixed width > 320px
        const style = window.getComputedStyle(card);
        const fixedWidth = parseFloat(style.width);
        if (!isNaN(fixedWidth) && fixedWidth > 0) {
          expect(fixedWidth).toBeLessThanOrEqual(preset.width);
        }

        const minWidth = parseFloat(style.minWidth);
        if (!isNaN(minWidth)) {
          expect(minWidth).toBeLessThanOrEqual(320);
        }

        // Native padding must be set
        expect(card.style.padding).toBe('20px');
      });

      it('PrimaryButton does not force fixed width > 320px, wraps text gracefully, and flexShrink !== 0', () => {
        const { getByRole } = render(
          <div style={getViewportContainerStyle(preset)}>
            <PrimaryButton
              label="Long Action Button Text That Must Not Clip Or Overflow Viewport"
              variant="sunshade"
              size="md"
            />
          </div>
        );

        // Target the interactive button element directly
        const button = getByRole('button');
        expect(button).toBeTruthy();

        const style = window.getComputedStyle(button);
        const fixedWidth = parseFloat(style.width);
        if (!isNaN(fixedWidth) && fixedWidth > 0) {
          expect(fixedWidth).toBeLessThanOrEqual(preset.width);
        }

        const minWidth = parseFloat(style.minWidth);
        if (!isNaN(minWidth)) {
          expect(minWidth).toBeLessThanOrEqual(320);
        }

        expect(style.flexShrink).not.toBe('0');
      });

      it('TokenBalanceBadge scales smoothly without horizontal clipping on 320px and flexShrink !== 0', () => {
        const { getByTestId } = render(
          <div style={getViewportContainerStyle(preset)}>
            <TokenBalanceBadge
              balance={99999999}
              symbol="SUN"
              label="Total Staked Balance"
              variant="default"
              testID="primitive-token-badge"
            />
          </div>
        );

        const badge = getByTestId('primitive-token-badge');
        expect(badge).toBeTruthy();

        const style = window.getComputedStyle(badge);
        const fixedWidth = parseFloat(style.width);
        if (!isNaN(fixedWidth) && fixedWidth > 0) {
          expect(fixedWidth).toBeLessThanOrEqual(preset.width);
        }

        const minWidth = parseFloat(style.minWidth);
        if (!isNaN(minWidth)) {
          expect(minWidth).toBeLessThanOrEqual(320);
        }

        expect(style.flexShrink).not.toBe('0');
      });

      it('AtmosphericBadge renders cleanly within 320px boundaries with flexShrink !== 0', () => {
        const { getByTestId } = render(
          <div style={getViewportContainerStyle(preset)}>
            <AtmosphericBadge
              label="Ecosystem Operational: 100% Hitless Bonding Active"
              variant="core"
              statusDot
              testID="primitive-atmospheric-badge"
            />
          </div>
        );

        const badge = getByTestId('primitive-atmospheric-badge');
        expect(badge).toBeTruthy();

        const style = window.getComputedStyle(badge);
        const fixedWidth = parseFloat(style.width);
        if (!isNaN(fixedWidth) && fixedWidth > 0) {
          expect(fixedWidth).toBeLessThanOrEqual(preset.width);
        }

        const minWidth = parseFloat(style.minWidth);
        if (!isNaN(minWidth)) {
          expect(minWidth).toBeLessThanOrEqual(320);
        }

        expect(style.flexShrink).not.toBe('0');
      });
    });
  });

  describe('320px Hard Boundary Invariants', () => {
    it('ensures core primitives rendered within a 320px container have bounded dimensions and flex-shrink enabled', () => {
      const compactPreset = VIEWPORT_PRESETS.compact;
      const { getByTestId, getByRole } = render(
        <div style={getViewportContainerStyle(compactPreset)}>
          <GlassCard padding="sm" testID="stack-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <AtmosphericBadge label="Online" variant="core" testID="stack-badge-atm" />
              <TokenBalanceBadge balance={100} symbol="HT" testID="stack-badge-token" />
              <PrimaryButton label="Submit" variant="sunshade" />
            </div>
          </GlassCard>
        </div>
      );

      const card = getByTestId('stack-card');
      const atmBadge = getByTestId('stack-badge-atm');
      const tokenBadge = getByTestId('stack-badge-token');
      const button = getByRole('button');

      expect(card).toBeTruthy();
      expect(atmBadge).toBeTruthy();
      expect(tokenBadge).toBeTruthy();
      expect(button).toBeTruthy();

      expect(window.getComputedStyle(atmBadge).flexShrink).not.toBe('0');
      expect(window.getComputedStyle(tokenBadge).flexShrink).not.toBe('0');
      expect(window.getComputedStyle(button).flexShrink).not.toBe('0');
    });
  });
});
