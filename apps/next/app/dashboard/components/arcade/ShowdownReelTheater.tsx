'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Film, Play, Pause, Flame, Camera } from 'lucide-react';
import { AtmosphericBadge, Modal, PrimaryButton, Sparkline } from '@digitalcanopy/ui';
import {
  ReactionTimelineSynchronizer,
  type ScrubSyncState,
} from '@digitalcanopy/dramacast';
import type { MiracleSeedSnapshot } from '@digitalcanopy/reels-engine';
import type { ShowdownBundle } from '../../../../lib/arcade/arcadeSessionService';
import { MiracleSeedLauncher } from './MiracleSeedLauncher';
import { CastLedgerBadges } from './CastLedgerBadges';

export interface ShowdownReelTheaterProps {
  isOpen: boolean;
  bundle: ShowdownBundle | null;
  onClose: () => void;
  onLaunchMiracleSeed: (snapshot: MiracleSeedSnapshot) => void;
}

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function ShowdownReelTheater({
  isOpen,
  bundle,
  onClose,
  onLaunchMiracleSeed,
}: ShowdownReelTheaterProps) {
  const syncRef = useRef<ReactionTimelineSynchronizer | null>(null);
  const [syncState, setSyncState] = useState<ScrubSyncState | null>(null);

  useEffect(() => {
    if (!bundle) {
      syncRef.current = null;
      setSyncState(null);
      return;
    }

    const sync = new ReactionTimelineSynchronizer({
      frames: bundle.telemetryFrames,
      timelinePlan: bundle.timelinePlan,
      defaultPlaybackRate: 1,
    });
    syncRef.current = sync;
    setSyncState(sync.getState());
    return sync.subscribe((next) => setSyncState(next));
  }, [bundle]);

  useEffect(() => {
    if (!isOpen || !syncState?.isPlaying) return;
    const interval = setInterval(() => {
      syncRef.current?.step(100);
    }, 100);
    return () => clearInterval(interval);
  }, [isOpen, syncState?.isPlaying]);

  const dramaSeries = useMemo(() => {
    if (!bundle || bundle.breakdowns.length === 0) return [0];
    return bundle.breakdowns.map((b) => Math.round(b.dramaIndex));
  }, [bundle]);

  if (!bundle || !syncState) return null;

  const durationMs = Math.max(1000, syncState.durationMs || bundle.timelinePlan.targetDurationMs);
  const activeKf = syncState.activeKeyframe;

  const handleTogglePlay = () => {
    if (!syncRef.current) return;
    if (syncState.isPlaying) {
      syncRef.current.pause();
    } else {
      syncRef.current.play();
    }
  };

  const handleJumpToClimax = () => {
    if (!syncRef.current || !bundle.timelinePlan.climaxKeyframeId) return;
    syncRef.current.jumpToKeyframe(bundle.timelinePlan.climaxKeyframeId);
  };

  const handleScrub = (ms: number) => {
    syncRef.current?.seek(ms);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      testID="showdown-reel-theater-modal"
      size="full"
      title={bundle.title}
      subtitle={`Peak Drama Index: ${bundle.timelinePlan.peakDramaIndex.toFixed(1)} • Final Score: ${bundle.finalScore.toLocaleString()}`}
      icon={<Film className="w-5 h-5 text-orange-400" />}
    >
      <div className="space-y-5">
        {/* Director Viewport */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <AtmosphericBadge
                label={bundle.didWin ? 'VICTORY REEL' : 'SHOWDOWN REEL'}
                variant={bundle.didWin ? 'success' : 'neutral'}
                size="sm"
              />
              {activeKf && (
                <AtmosphericBadge
                  label={`${activeKf.beatType} • ${activeKf.playbackRate}×`}
                  variant="core"
                  size="sm"
                />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Camera className="w-3.5 h-3.5" />
              <span>{activeKf?.cameraCue ?? 'WIDE_ESTABLISH'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-[11px] text-zinc-400 uppercase">Playhead Score</p>
              <p data-testid="theater-score" className="text-xl font-black text-white">
                {syncState.interpolatedScore.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-[11px] text-zinc-400 uppercase">Win Probability</p>
              <p data-testid="theater-win-prob" className="text-xl font-black text-cyan-400">
                {`${(syncState.interpolatedWinProbability * 100).toFixed(1)}%`}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-[11px] text-zinc-400 uppercase">Drama Index</p>
              <p data-testid="theater-drama-index" className="text-xl font-black text-orange-400">
                {syncState.interpolatedDramaIndex.toFixed(1)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-[11px] text-zinc-400 uppercase">Director Caption</p>
              <p className="text-sm font-bold text-amber-300 truncate mt-1">
                {activeKf?.captionOverlay ?? `Roll #${activeKf?.sourceRollIndex ?? 0}`}
              </p>
            </div>
          </div>

          {/* Drama Curve Sparkline */}
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Drama Index Trajectory
            </p>
            <Sparkline
              testID="theater-drama-sparkline"
              data={dramaSeries}
              strokeColor="#f97316"
              height={72}
              valueFormatter={(v) => `Drama ${v}`}
            />
          </div>

          {/* Scrubber & Controls */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <PrimaryButton
                testID="theater-play-pause-btn"
                variant="sunshade"
                size="sm"
                onPress={handleTogglePlay}
                icon={syncState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                label={syncState.isPlaying ? 'Pause' : 'Play 60s Reel'}
              />
              {bundle.timelinePlan.climaxKeyframeId && (
                <PrimaryButton
                  testID="theater-jump-climax-btn"
                  variant="cozy"
                  size="sm"
                  onPress={handleJumpToClimax}
                  icon={<Flame className="w-3.5 h-3.5" />}
                  label="Jump to Peak Climax"
                />
              )}
              <span data-testid="theater-timecode" className="ml-auto text-xs font-mono text-zinc-300">
                {`${formatMs(syncState.playheadMs)} / ${formatMs(durationMs)}`}
              </span>
            </div>

            <input
              type="range"
              aria-label="Showdown Reel Timeline"
              data-testid="theater-scrubber"
              min={0}
              max={durationMs}
              step={250}
              value={Math.round(syncState.playheadMs)}
              onChange={(e) => handleScrub(Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />

            {bundle.timelinePlan.keyframes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {bundle.timelinePlan.keyframes.map((kf) => {
                  const isActive = activeKf?.keyframeId === kf.keyframeId;
                  return (
                    <button
                      key={kf.keyframeId}
                      type="button"
                      data-testid={`theater-kf-${kf.keyframeId}`}
                      onClick={() => syncRef.current?.jumpToKeyframe(kf.keyframeId)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
                        isActive
                          ? 'bg-orange-600 text-white border-orange-400'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {`R${kf.sourceRollIndex} • ${kf.beatType.replace(/_/g, ' ')}`}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Miracle Seed Launcher */}
        <MiracleSeedLauncher
          candidate={bundle.miracleCandidate}
          snapshot={bundle.miracleSnapshot}
          onLaunchMiracleSeed={(snap) => {
            onLaunchMiracleSeed(snap);
            onClose();
          }}
        />

        {/* Cast Ledger Prestige Badges */}
        <CastLedgerBadges entries={bundle.castBadges} />
      </div>
    </Modal>
  );
}
