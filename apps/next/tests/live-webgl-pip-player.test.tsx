import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createDirectorTimelineFromTrajectory } from '@digitalcanopy/dramacast';
import type { RollTrajectoryStep } from '@digitalcanopy/reels-engine';
import { SunShadeLiveStage } from '../components/live/SunShadeLiveStage';

vi.mock('@digitalcanopy/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      send: vi.fn(),
      track: vi.fn(),
      presenceState: vi.fn(() => ({})),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));
import { snapPointToCorner } from '../components/live/DraggableWebcamPiP';
import {
  loadCreatorLiveContext,
  resolveLiveCreatorUrl,
  sanitizeCreatorSlug,
  type LiveCreatorContext,
} from '../lib/live/liveCreatorService';

function buildContext(withVod = true): LiveCreatorContext {
  const steps: RollTrajectoryStep[] = [
    {
      rollIndex: 0,
      winProbability: 0.42,
      selectedTier: 'tier1_favorable',
      selectedSubSeed: 'sub_0',
      normalizedSkillRatio: 0.7,
      score: 110,
      hullIntegrity: 100,
    },
    {
      rollIndex: 1,
      winProbability: 0.84,
      selectedTier: 'tier3_miracle',
      selectedSubSeed: 'sub_1',
      normalizedSkillRatio: 0.96,
      score: 560,
      hullIntegrity: 95,
    },
  ];

  const { breakdowns, plan } = createDirectorTimelineFromTrajectory(steps, {
    matchId: 'live-match-1',
    cartridgeId: 'dart-up-skirmish',
    targetDurationMs: 60_000,
  });

  const telemetryFrames = steps.map((s, idx) => ({
    seq: idx,
    tMs: idx * 3000,
    rollIndex: s.rollIndex,
    winProbability: s.winProbability,
    dramaIndex: breakdowns[idx]?.dramaIndex ?? 0,
    score: s.score,
    tierIndex: (idx === 1 ? 3 : 1) as 0 | 1 | 2 | 3,
    flags: 0,
  }));

  return {
    creatorSlug: 'nova-pilot',
    canonicalUrl: 'https://hub.sunshade.network/live/nova-pilot',
    profile: {
      id: 'creator-uuid-1',
      slug: 'nova-pilot',
      displayName: 'Nova Pilot',
      avatarUrl: null,
      citizenTier: 'Core Citizen',
      reputationScore: 98,
    },
    viewerUserId: 'viewer-uuid-1',
    viewerUtilityBalance: 450,
    vodReels: withVod
      ? [
          {
            id: 'vod-1',
            matchId: 'live-match-1',
            cartridgeId: 'dart-up-skirmish',
            title: 'Sky Skirmish — 60s Showdown Reel',
            durationMs: 60_000,
            peakDramaIndex: plan.peakDramaIndex,
            finalScore: 560,
            didWin: true,
            timelinePlan: plan,
            telemetryFrames,
            miracleSnapshot: null,
            createdAt: '2026-11-27T12:00:00Z',
          },
        ]
      : [],
    castBadges: [],
    featureFlags: { sunshade_live: true },
  };
}

describe('TASK-LIVE-WEBGL-PIP-PLAYER: WebGL Telemetry + Draggable Webcam PiP Player', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sanitizes creator slugs and resolves hub.sunshade.network/live/[creator] URLs', () => {
    expect(sanitizeCreatorSlug('Nova Pilot!')).toBe('Nova-Pilot');
    expect(resolveLiveCreatorUrl('nova-pilot', 'hub.sunshade.network')).toBe(
      'https://hub.sunshade.network/live/nova-pilot'
    );
  });

  it('renders WebGL telemetry stage and draggable PiP with corner snapping & mirror/visibility controls', async () => {
    const context = buildContext(true);
    render(<SunShadeLiveStage context={context} />);

    expect(screen.getByTestId('sunshade-live-stage')).toBeInTheDocument();
    expect(screen.getByTestId('live-creator-heading')).toHaveTextContent('Nova Pilot — SunShade Live');
    expect(screen.getByTestId('live-webgl-canvas')).toBeInTheDocument();

    const pip = screen.getByTestId('draggable-webcam-pip');
    expect(pip).toHaveAttribute('data-corner', 'bottom_right');
    expect(pip).toHaveAttribute('data-visible', 'true');

    // Snap PiP to top_left via control button
    fireEvent.click(screen.getByTestId('pip-snap-top_left'));
    expect(pip).toHaveAttribute('data-corner', 'top_left');

    // Drag PiP pointer from top_left toward bottom_right and release
    fireEvent.pointerDown(pip, { clientX: 40, clientY: 40, pointerId: 1 });
    fireEvent.pointerMove(pip, { clientX: 800, clientY: 460, pointerId: 1 });
    fireEvent.pointerUp(pip, { clientX: 800, clientY: 460, pointerId: 1 });
    expect(pip).toHaveAttribute('data-corner', 'bottom_right');

    // Toggle PiP visibility
    fireEvent.click(screen.getByTestId('pip-visibility-btn'));
    expect(pip).toHaveAttribute('data-visible', 'false');

    // Toggle Live Broadcast state
    fireEvent.click(screen.getByTestId('toggle-live-studio-btn'));
    expect(screen.getByText('End Live Broadcast')).toBeInTheDocument();
  });

  it('computes corner snap quadrants deterministically', () => {
    expect(snapPointToCorner(100, 100, 960, 540)).toBe('top_left');
    expect(snapPointToCorner(700, 100, 960, 540)).toBe('top_right');
    expect(snapPointToCorner(100, 400, 960, 540)).toBe('bottom_left');
    expect(snapPointToCorner(700, 400, 960, 540)).toBe('bottom_right');
  });

  it('renders zero-fake empty state when creator has no VOD showdown reels', async () => {
    const context = buildContext(false);
    render(<SunShadeLiveStage context={context} />);

    expect(screen.getByTestId('live-stage-standby')).toBeInTheDocument();
    expect(screen.getByTestId('live-vod-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('live-stage-score')).toHaveTextContent('0');
  });

  it('loads creator context safely when Supabase returns empty rows', async () => {
    const emptyChain = () => {
      const q: any = {};
      for (const m of ['select', 'eq', 'ilike', 'order', 'limit']) q[m] = () => q;
      q.maybeSingle = () => Promise.resolve({ data: null, error: null });
      q.then = (res: any, rej: any) => Promise.resolve({ data: [], error: null }).then(res, rej);
      return q;
    };
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(() => emptyChain()),
      schema: vi.fn(() => ({ from: vi.fn(() => emptyChain()) })),
    };

    const ctx = await loadCreatorLiveContext(mockSupabase, 'unknown-creator', 'hub.sunshade.network');
    expect(ctx.profile).toBeNull();
    expect(ctx.vodReels).toEqual([]);
    expect(ctx.viewerUtilityBalance).toBe(0);
    expect(ctx.canonicalUrl).toBe('https://hub.sunshade.network/live/unknown-creator');
  });
});
