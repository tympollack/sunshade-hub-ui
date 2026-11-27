import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import {
  BlindSkillCheckOverlay,
  deriveVisualTargetCenter,
  scoreReticlePrecision,
} from '../app/dashboard/components/arcade/BlindSkillCheckOverlay';
import { DEFAULT_ARCADE_CARTRIDGES } from '../lib/arcade/cartridges';
import type { BlindCheckResult, ClientRollPreview } from '@digitalcanopy/reels-engine';

describe('BlindSkillCheckOverlay Tactile Runner', () => {
  const samplePreview: ClientRollPreview = {
    index: 3,
    commitmentHash: 'a1b2c3d4e5f60708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20',
    eventTag: 'WARP_ANOMALY',
  };

  const mockResult: BlindCheckResult = {
    rollIndex: 3,
    minigameId: 'precision-pulse',
    normalizedRatio: 0.91,
    selectedTierIndex: 3,
    selectedTier: 'tier3_miracle',
    selectedSubSeed: 'subseed_miracle_abc123',
    selectionRoll: 0.94,
    tierProbabilities: {
      tier0_baseline: 0.1,
      tier1_favorable: 0.2,
      tier2_clutch: 0.35,
      tier3_miracle: 0.35,
    },
    isDoubleOneMisfire: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clamps duration window strictly between 3 and 5 seconds and shows commitment without spoilers', () => {
    render(
      <BlindSkillCheckOverlay
        cartridge={DEFAULT_ARCADE_CARTRIDGES[0]}
        rollPreview={samplePreview}
        durationMs={1200}
        onSubmit={vi.fn()}
        onBankStub={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('blind-skill-check-modal')).toBeInTheDocument();
    expect(screen.getByTestId('skill-check-countdown')).toHaveTextContent('3.0s');
    expect(screen.getByText('Event: WARP_ANOMALY')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(samplePreview.commitmentHash))).toBeInTheDocument();
  });

  it('submits precision-pulse score and reveals tier breakdown + sub-seed post-submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(mockResult);

    render(
      <BlindSkillCheckOverlay
        cartridge={DEFAULT_ARCADE_CARTRIDGES[0]}
        rollPreview={samplePreview}
        durationMs={4000}
        onSubmit={onSubmit}
        onBankStub={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('tactile-action-btn'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          rollIndex: 3,
          minigameId: 'precision-pulse',
          maxScore: 100,
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('blind-skill-check-reveal')).toBeInTheDocument();
    });
    expect(screen.getByText(/Tier 3 • MIRACLE/i)).toBeInTheDocument();
    expect(screen.getByText(/subseed_miracle_abc123/)).toBeInTheDocument();
  });

  it('supports rapid target-tap minigame and Snake Eyes misfire alert', async () => {
    const misfireResult: BlindCheckResult = {
      ...mockResult,
      selectedTierIndex: 0,
      selectedTier: 'tier0_baseline',
      isDoubleOneMisfire: true,
    };
    const onSubmit = vi.fn().mockResolvedValue(misfireResult);

    render(
      <BlindSkillCheckOverlay
        cartridge={DEFAULT_ARCADE_CARTRIDGES[2]}
        rollPreview={samplePreview}
        durationMs={3500}
        onSubmit={onSubmit}
        onBankStub={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const tapBtn = screen.getByTestId('tactile-action-btn');
    for (let i = 0; i < 10; i++) {
      fireEvent.click(tapBtn);
    }

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          minigameId: 'target-tap',
          rawScore: 100,
          maxScore: 100,
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('snake-eyes-misfire-banner')).toBeInTheDocument();
    });
  });

  it('auto-submits when the 4-second skill-check timer expires', async () => {
    vi.useFakeTimers();
    const onSubmit = vi.fn().mockResolvedValue(mockResult);

    render(
      <BlindSkillCheckOverlay
        cartridge={DEFAULT_ARCADE_CARTRIDGES[0]}
        rollPreview={samplePreview}
        durationMs={4000}
        onSubmit={onSubmit}
        onBankStub={vi.fn()}
        onClose={vi.fn()}
      />
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('allows deferring the roll to the Bonus Stub Vault before submission', async () => {
    const onBankStub = vi.fn().mockResolvedValue(undefined);

    render(
      <BlindSkillCheckOverlay
        cartridge={DEFAULT_ARCADE_CARTRIDGES[0]}
        rollPreview={samplePreview}
        onSubmit={vi.fn()}
        onBankStub={onBankStub}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('overlay-bank-stub-btn'));
    expect(onBankStub).toHaveBeenCalledTimes(1);
  });

  it('computes deterministic target center and precision score', () => {
    const center = deriveVisualTargetCenter(samplePreview.commitmentHash);
    expect(center).toBeGreaterThanOrEqual(25);
    expect(center).toBeLessThanOrEqual(75);
    expect(scoreReticlePrecision(center, center)).toBe(100);
    expect(scoreReticlePrecision(center + 25, center)).toBeLessThan(60);
  });
});
