import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createDirectorTimelineFromTrajectory } from '@digitalcanopy/dramacast';
import type { RollTrajectoryStep } from '@digitalcanopy/reels-engine';
import {
  computeSyncDriftMs,
  decodeLiveTelemetryPacket,
  encodeLiveTelemetryPacket,
} from '../lib/live/useLiveReactionSync';
import { SunShadeLiveStage } from '../components/live/SunShadeLiveStage';
import type { LiveCreatorContext } from '../lib/live/liveCreatorService';

type BroadcastHandler = (payload: any) => void;
const { mockHandlers, mockSend, mockTrack, mockRemoveChannel } = vi.hoisted(() => ({
  mockHandlers: new Map<string, BroadcastHandler[]>(),
  mockSend: vi.fn(),
  mockTrack: vi.fn(),
  mockRemoveChannel: vi.fn(),
}));

vi.mock('@digitalcanopy/supabase', () => ({
  supabase: {
    channel: vi.fn(() => {
      const ch: any = {
        on: vi.fn((type: string, filter: any, cb: BroadcastHandler) => {
          const key = type === 'presence' ? `presence:${filter?.event}` : `broadcast:${filter?.event}`;
          const existing = mockHandlers.get(key) ?? [];
          existing.push(cb);
          mockHandlers.set(key, existing);
          return ch;
        }),
        subscribe: vi.fn((cb: (status: string) => void) => {
          cb('SUBSCRIBED');
          return ch;
        }),
        send: mockSend,
        track: mockTrack,
        presenceState: vi.fn(() => ({
          'viewer-1': [{ viewerId: 'viewer-1' }],
          'viewer-2': [{ viewerId: 'viewer-2' }],
        })),
        unsubscribe: vi.fn(),
      };
      return ch;
    }),
    removeChannel: mockRemoveChannel,
  },
}));

function buildLiveContext(): LiveCreatorContext {
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
      winProbability: 0.11,
      selectedTier: 'tier0_baseline',
      selectedSubSeed: 'sub_1',
      normalizedSkillRatio: 0.25,
      isDoubleOneMisfire: true,
      score: 120,
      hullIntegrity: 65,
    },
    {
      rollIndex: 2,
      winProbability: 0.89,
      selectedTier: 'tier3_miracle',
      selectedSubSeed: 'sub_2',
      normalizedSkillRatio: 0.98,
      isBlindCheckRecovery: true,
      score: 980,
      hullIntegrity: 73,
    },
  ];

  const { breakdowns, plan } = createDirectorTimelineFromTrajectory(steps, {
    matchId: 'sync-match-42',
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
    tierIndex: (s.selectedTier === 'tier3_miracle' ? 3 : s.selectedTier === 'tier1_favorable' ? 1 : 0) as 0 | 1 | 2 | 3,
    flags: 0,
  }));

  return {
    creatorSlug: 'sync-pilot',
    canonicalUrl: 'https://hub.sunshade.network/live/sync-pilot',
    profile: {
      id: 'creator-sync-1',
      slug: 'sync-pilot',
      displayName: 'Sync Pilot',
      avatarUrl: null,
      citizenTier: 'Founder Citizen',
      reputationScore: 100,
    },
    viewerUserId: 'viewer-sync-9',
    viewerUtilityBalance: 1200,
    vodReels: [
      {
        id: 'vod-sync-1',
        matchId: 'sync-match-42',
        cartridgeId: 'smuggler-run',
        title: 'Smuggler Run — 60s Showdown Reel',
        durationMs: 60_000,
        peakDramaIndex: plan.peakDramaIndex,
        finalScore: 980,
        didWin: true,
        timelinePlan: plan,
        telemetryFrames,
        miracleSnapshot: null,
        createdAt: '2026-11-27T12:00:00Z',
      },
    ],
    castBadges: [],
    featureFlags: { sunshade_live: true },
  };
}

describe('TASK-LIVE-REACTION-SCRUB-SYNC: Live & VOD Reaction Timeline Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandlers.clear();
  });

  it('round-trips DCAST1 telemetry bundles cleanly over base64url packets', () => {
    const ctx = buildLiveContext();
    const { encodedBase64Url, stats } = encodeLiveTelemetryPacket(
      ctx.vodReels[0].telemetryFrames,
      'sync-match-42',
      'smuggler-run'
    );
    expect(stats.frameCount).toBe(3);
    expect(stats.byteLength).toBeGreaterThan(10);

    const decoded = decodeLiveTelemetryPacket(encodedBase64Url);
    expect(decoded.matchId).toBe('sync-match-42');
    expect(decoded.frames).toHaveLength(3);
    expect(decoded.frames[2].score).toBe(980);
  });

  it('computes playhead sync drift compensating for transit delay', () => {
    const now = 1_000_000;
    const { expectedPlayheadMs, driftMs } = computeSyncDriftMs(
      10_000,
      12_000,
      now - 200,
      now,
      true,
      1
    );
    expect(expectedPlayheadMs).toBe(12_200);
    expect(driftMs).toBe(2200);
  });

  it('syncs incoming Supabase Realtime playhead and reaction cues, and respects Free VOD Scrub lock', async () => {
    const context = buildLiveContext();
    const { unmount } = render(<SunShadeLiveStage context={context} />);

    expect(screen.getByTestId('live-vod-scrubber-bar')).toBeInTheDocument();
    expect(screen.getByText('Realtime Synced')).toBeInTheDocument();

    // Trigger presence sync event -> 2 viewers
    const presenceCbs = mockHandlers.get('presence:sync') ?? [];
    for (const cb of presenceCbs) cb({});
    await waitFor(() => {
      expect(screen.getByTestId('live-viewer-count')).toHaveTextContent('2 Watching');
    });

    // Simulate incoming host playhead_sync beyond 250ms drift threshold
    const playheadCbs = mockHandlers.get('broadcast:playhead_sync') ?? [];
    for (const cb of playheadCbs) {
      cb({
        payload: {
          playheadMs: 30_000,
          isPlaying: false,
          playbackRate: 1,
          hostTimestampMs: Date.now(),
        },
      });
    }
    await waitFor(() => {
      expect(screen.getByTestId('live-timecode')).toHaveTextContent('00:30 / 01:00');
    });

    // Switch to Free VOD Scrub -> remote host sync must NOT override local scrubber
    fireEvent.click(screen.getByTestId('toggle-follow-host-btn'));
    expect(screen.getByText('Free VOD Scrub')).toBeInTheDocument();

    for (const cb of playheadCbs) {
      cb({
        payload: {
          playheadMs: 45_000,
          isPlaying: false,
          playbackRate: 1,
          hostTimestampMs: Date.now(),
        },
      });
    }
    expect(screen.getByTestId('live-timecode')).toHaveTextContent('00:30 / 01:00');

    // Emit reaction cue & DCAST1 sync packet
    fireEvent.click(screen.getByTestId('emit-cue-clutch'));
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'reaction_cue',
      })
    );
    expect(screen.getByTestId('reaction-cue-strip')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('broadcast-dcast1-btn'));
    expect(screen.getByTestId('dcast1-codec-stats')).toHaveTextContent(/DCAST1 \d+B/);

    unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });
});
