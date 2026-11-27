'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Radio,
  Film,
  ArrowLeft,
  Tv,
  Play,
  Pause,
  Users,
  Sparkles,
} from 'lucide-react';
import {
  AtmosphericBadge,
  GlassCard,
  PrimaryButton,
  TokenBalanceBadge,
} from '@digitalcanopy/ui';
import {
  ReactionTimelineSynchronizer,
  WebRTCPiPPresenceTrack,
  type PresencePiPLayout,
  type ScrubSyncState,
} from '@digitalcanopy/dramacast';
import type { LiveCreatorContext, CreatorShowdownVod } from '../../lib/live/liveCreatorService';
import { WebGLTelemetryCanvas } from './WebGLTelemetryCanvas';
import { DraggableWebcamPiP } from './DraggableWebcamPiP';
import { CastLedgerBadges } from '../../app/dashboard/components/arcade/CastLedgerBadges';

export interface SunShadeLiveStageProps {
  context: LiveCreatorContext;
  initialSimulcastOverlay?: boolean;
  extraRightPanels?: React.ReactNode;
  extraStageOverlay?: React.ReactNode;
}

function formatTimecode(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function SunShadeLiveStage({
  context,
  initialSimulcastOverlay = false,
  extraRightPanels,
  extraStageOverlay,
}: SunShadeLiveStageProps) {
  const creatorName = context.profile?.displayName || context.creatorSlug;
  const [selectedVodId, setSelectedVodId] = useState<string | null>(
    context.vodReels[0]?.id ?? null
  );
  const [isLiveStudioActive, setIsLiveStudioActive] = useState(false);
  const [pipLayout, setPipLayout] = useState<PresencePiPLayout | undefined>(undefined);
  const [syncState, setSyncState] = useState<ScrubSyncState | null>(null);

  const presenceRef = useRef<WebRTCPiPPresenceTrack | null>(null);
  if (!presenceRef.current) {
    presenceRef.current = new WebRTCPiPPresenceTrack();
  }

  const activeVod: CreatorShowdownVod | null = useMemo(() => {
    if (!selectedVodId) return context.vodReels[0] ?? null;
    return context.vodReels.find((r) => r.id === selectedVodId) ?? context.vodReels[0] ?? null;
  }, [context.vodReels, selectedVodId]);

  const syncRef = useRef<ReactionTimelineSynchronizer | null>(null);

  useEffect(() => {
    if (!activeVod) {
      syncRef.current = null;
      setSyncState(null);
      return;
    }

    const synchronizer = new ReactionTimelineSynchronizer({
      frames: activeVod.telemetryFrames,
      timelinePlan: activeVod.timelinePlan,
      presenceProvider: presenceRef.current ?? undefined,
      defaultPlaybackRate: 1,
    });
    syncRef.current = synchronizer;
    setSyncState(synchronizer.getState());
    return synchronizer.subscribe((next) => setSyncState(next));
  }, [activeVod]);

  useEffect(() => {
    if (!syncState?.isPlaying) return;
    const interval = setInterval(() => {
      syncRef.current?.step(100);
    }, 100);
    return () => clearInterval(interval);
  }, [syncState?.isPlaying]);

  const handleTogglePlay = () => {
    if (!syncRef.current || !syncState) return;
    if (syncState.isPlaying) {
      syncRef.current.pause();
    } else {
      syncRef.current.play();
    }
  };

  const handleAttachVideo = (el: HTMLVideoElement | null) => {
    presenceRef.current?.attachPlaybackElement(el ?? undefined);
  };

  const durationMs = Math.max(
    1000,
    syncState?.durationMs || activeVod?.timelinePlan?.targetDurationMs || 60_000
  );

  return (
    <div
      data-testid="sunshade-live-stage"
      data-simulcast-overlay={initialSimulcastOverlay ? 'true' : 'false'}
      className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Broadcast Bar */}
        <GlassCard variant="default" padding="md" className="border-zinc-800 bg-zinc-900/70">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Hub Dashboard</span>
                </Link>
                <AtmosphericBadge
                  label="hub.sunshade.network/live"
                  variant="core"
                  statusDot
                  pulse={isLiveStudioActive}
                  size="sm"
                />
                <AtmosphericBadge
                  label={isLiveStudioActive ? 'Broadcast Active' : activeVod ? 'VOD Replay Ready' : 'Standby'}
                  variant={isLiveStudioActive ? 'success' : 'telemetry'}
                  size="sm"
                />
              </div>
              <h1
                data-testid="live-creator-heading"
                className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2"
              >
                <Tv className="w-6 h-6 text-orange-500" />
                <span>{`${creatorName} — SunShade Live`}</span>
              </h1>
              <p className="text-xs font-mono text-zinc-400 break-all">
                {context.canonicalUrl}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span data-testid="live-standing-readout">
                  {context.profile
                    ? `${context.profile.citizenTier} • Rep ${context.profile.reputationScore}`
                    : 'Unclaimed Creator Channel'}
                </span>
              </div>

              <TokenBalanceBadge
                balance={context.viewerUtilityBalance}
                symbol="HT"
                label="Utility Wallet"
                variant="default"
                isLive={false}
              />

              <PrimaryButton
                testID="toggle-live-studio-btn"
                variant={isLiveStudioActive ? 'cozy' : 'sunshade'}
                size="sm"
                onPress={() => setIsLiveStudioActive((prev) => !prev)}
                icon={<Radio className="w-3.5 h-3.5" />}
                label={isLiveStudioActive ? 'End Live Broadcast' : 'Start Live Broadcast'}
              />
            </div>
          </div>
        </GlassCard>

        {/* Main Stage + Side Column */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 space-y-4">
            {/* WebGL Telemetry Canvas + Draggable Webcam PiP */}
            <div className="relative">
              <WebGLTelemetryCanvas
                creatorName={creatorName}
                syncState={syncState}
                isLiveActive={isLiveStudioActive}
              />
              <DraggableWebcamPiP
                creatorName={creatorName}
                presenceProvider={presenceRef.current}
                layout={pipLayout}
                onLayoutChange={setPipLayout}
                onAttachVideoElement={handleAttachVideo}
              />
              {extraStageOverlay}
            </div>

            {/* VOD / Reaction Scrubber Controls */}
            {activeVod && syncState && (
              <div
                data-testid="live-vod-scrubber-bar"
                className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <PrimaryButton
                      testID="live-play-pause-btn"
                      variant="sunshade"
                      size="sm"
                      onPress={handleTogglePlay}
                      icon={syncState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      label={syncState.isPlaying ? 'Pause' : 'Play Reaction Sync'}
                    />
                    <span className="text-xs font-semibold text-zinc-300 truncate max-w-xs">
                      {activeVod.title}
                    </span>
                  </div>
                  <span data-testid="live-timecode" className="text-xs font-mono text-zinc-300">
                    {`${formatTimecode(syncState.playheadMs)} / ${formatTimecode(durationMs)}`}
                  </span>
                </div>

                <input
                  type="range"
                  aria-label="Live Reaction Timeline"
                  data-testid="live-timeline-scrubber"
                  min={0}
                  max={durationMs}
                  step={250}
                  value={Math.round(syncState.playheadMs)}
                  onChange={(e) => syncRef.current?.seek(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>
            )}

            {/* Creator Showdown Reel Archive */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-orange-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Creator Showdown Reels ({context.vodReels.length})
                  </h2>
                </div>
                {context.profile && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    Creator ID: {context.profile.id.slice(0, 8)}…
                  </span>
                )}
              </div>

              {context.vodReels.length === 0 ? (
                <div
                  data-testid="live-vod-empty-state"
                  className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>
                    No recorded Showdown Reels published yet for {creatorName}. Play a cabinet in the Hub Arcade Deck to cut a 60-second reel.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {context.vodReels.map((vod) => {
                    const selected = activeVod?.id === vod.id;
                    return (
                      <button
                        key={vod.id}
                        type="button"
                        data-testid={`vod-reel-card-${vod.id}`}
                        onClick={() => setSelectedVodId(vod.id)}
                        className={`text-left p-3 rounded-xl border transition-colors ${
                          selected
                            ? 'bg-orange-500/10 border-orange-500 text-white'
                            : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <p className="text-xs font-bold truncate">{vod.title}</p>
                        <p className="text-[11px] font-mono text-zinc-400 mt-1">
                          {`Peak Drama ${vod.peakDramaIndex.toFixed(1)} • Score ${vod.finalScore.toLocaleString()}`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Side Panel */}
          <div className="space-y-4">
            {extraRightPanels}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <CastLedgerBadges entries={context.castBadges} compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
