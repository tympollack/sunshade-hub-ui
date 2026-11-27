import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  createMiracleSeedSnapshot,
  detectMiracleSeedCandidate,
  evaluateCastLedgerBadges,
  serializeMiracleSeedSnapshot,
  type RollTrajectoryStep,
} from '@digitalcanopy/reels-engine';
import { createDirectorTimelineFromTrajectory } from '@digitalcanopy/dramacast';
import { ShowdownReelTheater } from '../app/dashboard/components/arcade/ShowdownReelTheater';
import { MiracleSeedLauncher } from '../app/dashboard/components/arcade/MiracleSeedLauncher';
import { CastLedgerBadges } from '../app/dashboard/components/arcade/CastLedgerBadges';
import type { ShowdownBundle } from '../lib/arcade/arcadeSessionService';

function buildTestBundle(): ShowdownBundle {
  const steps: RollTrajectoryStep[] = [
    {
      rollIndex: 0,
      winProbability: 0.42,
      selectedTier: 'tier1_favorable',
      selectedSubSeed: 'sub_0',
      normalizedSkillRatio: 0.6,
      hullIntegrity: 100,
      contrabandHoldCount: 1,
      score: 110,
    },
    {
      rollIndex: 1,
      winProbability: 0.04,
      selectedTier: 'tier0_baseline',
      selectedSubSeed: 'sub_1',
      normalizedSkillRatio: 0.3,
      isDoubleOneMisfire: true,
      hullIntegrity: 4,
      contrabandHoldCount: 2,
      score: 120,
    },
    {
      rollIndex: 2,
      winProbability: 0.56,
      selectedTier: 'tier3_miracle',
      selectedSubSeed: 'sub_2',
      normalizedSkillRatio: 0.96,
      isBlindCheckRecovery: true,
      hullIntegrity: 12,
      contrabandHoldCount: 3,
      score: 1150,
    },
    {
      rollIndex: 3,
      winProbability: 0.85,
      selectedTier: 'tier2_clutch',
      selectedSubSeed: 'sub_3',
      normalizedSkillRatio: 0.92,
      hullIntegrity: 20,
      contrabandHoldCount: 3,
      score: 1390,
    },
    {
      rollIndex: 4,
      winProbability: 0.92,
      selectedTier: 'tier3_miracle',
      selectedSubSeed: 'sub_4',
      normalizedSkillRatio: 0.95,
      hullIntegrity: 28,
      contrabandHoldCount: 3,
      score: 1840,
    },
  ];

  const { breakdowns, plan } = createDirectorTimelineFromTrajectory(steps, {
    matchId: 'match-comeback-77',
    cartridgeId: 'smuggler-run',
    targetDurationMs: 60_000,
  });

  const telemetryFrames = steps.map((s, idx) => ({
    seq: idx,
    tMs: idx * 3000,
    rollIndex: s.rollIndex,
    winProbability: s.winProbability,
    dramaIndex: breakdowns[idx]?.dramaIndex ?? 0,
    score: s.score,
    tierIndex: (s.selectedTier === 'tier3_miracle' ? 3 : s.selectedTier === 'tier2_clutch' ? 2 : s.selectedTier === 'tier1_favorable' ? 1 : 0) as 0 | 1 | 2 | 3,
    flags: 0,
  }));

  const ctx = {
    matchId: 'match-comeback-77',
    cartridgeId: 'smuggler-run',
    rootSeed: 'root-seed-77',
    playerId: 'player-77',
    didWin: true,
    steps,
  };

  const miracleCandidate = detectMiracleSeedCandidate(ctx);
  const miracleSnapshot = miracleCandidate
    ? createMiracleSeedSnapshot(miracleCandidate, steps)
    : null;
  const castBadges = evaluateCastLedgerBadges(ctx);

  return {
    matchId: 'match-comeback-77',
    cartridgeId: 'smuggler-run',
    title: 'Syndicate Smuggler Run — 60s Showdown Reel',
    didWin: true,
    finalScore: 1840,
    steps,
    breakdowns,
    timelinePlan: plan,
    telemetryFrames,
    miracleCandidate,
    miracleSnapshot,
    castBadges,
  };
}

describe('ShowdownReelTheater, MiracleSeedLauncher & CastLedgerBadges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 60-second Showdown Reel Theater and scrubs keyframes deterministically', () => {
    const bundle = buildTestBundle();
    const onLaunchMiracleSeed = vi.fn();

    render(
      <ShowdownReelTheater
        isOpen={true}
        bundle={bundle}
        onClose={vi.fn()}
        onLaunchMiracleSeed={onLaunchMiracleSeed}
      />
    );

    expect(screen.getByTestId('showdown-reel-theater-modal')).toBeInTheDocument();
    expect(screen.getByTestId('theater-timecode')).toHaveTextContent('00:00 / 01:00');
    expect(screen.getByTestId('theater-drama-sparkline')).toBeInTheDocument();

    // Jump to peak climax
    fireEvent.click(screen.getByTestId('theater-jump-climax-btn'));
    expect(screen.getByTestId('theater-timecode')).not.toHaveTextContent('00:00 / 01:00');

    // Toggle play/pause
    fireEvent.click(screen.getByTestId('theater-play-pause-btn'));
    expect(screen.getByText('Pause')).toBeInTheDocument();
  });

  it('launches Miracle Seed comeback challenge and validates imported JSON payloads', () => {
    const bundle = buildTestBundle();
    const onLaunch = vi.fn();

    render(
      <MiracleSeedLauncher
        candidate={bundle.miracleCandidate}
        snapshot={bundle.miracleSnapshot}
        onLaunchMiracleSeed={onLaunch}
      />
    );

    expect(screen.getByTestId('miracle-seed-launcher')).toBeInTheDocument();
    expect(screen.getByText(/Sub-12% Comeback \(4.0%\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('launch-miracle-seed-btn'));
    expect(onLaunch).toHaveBeenCalledWith(bundle.miracleSnapshot);

    // Open JSON importer and test invalid then valid seed
    fireEvent.click(screen.getByTestId('toggle-import-miracle-btn'));
    const textarea = screen.getByTestId('import-miracle-seed-input');
    fireEvent.change(textarea, { target: { value: '{not-valid-json' } });
    fireEvent.click(screen.getByTestId('submit-import-miracle-btn'));
    expect(screen.getByTestId('import-miracle-seed-error')).toBeInTheDocument();

    fireEvent.change(textarea, {
      target: { value: serializeMiracleSeedSnapshot(bundle.miracleSnapshot!) },
    });
    fireEvent.click(screen.getByTestId('submit-import-miracle-btn'));
    expect(onLaunch).toHaveBeenCalledTimes(2);
  });

  it('renders all 6 Cast Ledger prestige badges with earned vs locked states', () => {
    const bundle = buildTestBundle();
    render(<CastLedgerBadges entries={bundle.castBadges} />);

    expect(screen.getByTestId('cast-ledger-badges')).toBeInTheDocument();
    expect(screen.getByText('6 / 6 Unlocked')).toBeInTheDocument();
    expect(screen.getByTestId('cast-badge-SNAKE_EYES')).toHaveAttribute('data-unlocked', 'true');
    expect(screen.getByTestId('cast-badge-SECOND_WIND')).toHaveAttribute('data-unlocked', 'true');
    expect(screen.getByTestId('cast-badge-AGAINST_ALL_ODDS')).toHaveAttribute('data-unlocked', 'true');
    expect(screen.getByTestId('cast-badge-GAME_MASTER')).toHaveAttribute('data-unlocked', 'true');
    expect(screen.getByTestId('cast-badge-SMUGGLER_KING')).toHaveAttribute('data-unlocked', 'true');
    expect(screen.getByTestId('cast-badge-GHOST_SHIP')).toHaveAttribute('data-unlocked', 'true');
  });

  it('renders zero-fake empty state when no Cast Ledger badges are unlocked', () => {
    render(<CastLedgerBadges entries={[]} />);
    expect(screen.getByText('0 / 6 Unlocked')).toBeInTheDocument();
    expect(screen.getByTestId('cast-badge-SNAKE_EYES')).toHaveAttribute('data-unlocked', 'false');
  });
});
