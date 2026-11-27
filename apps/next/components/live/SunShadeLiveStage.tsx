'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Radio, Film, ArrowLeft, Tv, Users, Sparkles } from 'lucide-react';
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
  type TelemetryFrame,
} from '@digitalcanopy/dramacast';
import type { LiveCreatorContext, CreatorShowdownVod } from '../../lib/live/liveCreatorService';
import {
  useLiveReactionSync,
  type LiveHudTriggerEvent,
} from '../../lib/live/useLiveReactionSync';
import { WebGLTelemetryCanvas } from './WebGLTelemetryCanvas';
import { DraggableWebcamPiP } from './DraggableWebcamPiP';
import { LiveReactionTimelineBar } from './LiveReactionTimelineBar';
import { GladiatorDropsPanel } from './GladiatorDropsPanel';
import { CastLedgerBadges } from '../../app/dashboard/components/arcade/CastLedgerBadges';
import { supabase } from '@digitalcanopy/supabase';

export interface SunShadeLiveStageProps {
  context: LiveCreatorContext;
  initialSimulcastOverlay?: boolean;
  extraRightPanels?: React.ReactNode;
  extraStageOverlay?: React.ReactNode;
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
  const [remoteFrames, setRemoteFrames] = useState<TelemetryFrame[] | null>(null);
  const [isLiveStudioActive, setIsLiveStudioActive] = useState(false);
  const [followHostSync, setFollowHostSync] = useState(true);
  const [pipLayout, setPipLayout] = useState<PresencePiPLayout | undefined>(undefined);
  const [syncState, setSyncState] = useState<ScrubSyncState | null>(null);
  const [activeHudBanner, setActiveHudBanner] = useState<string | null>(null);
  const [hudHistory, setHudHistory] = useState<LiveHudTriggerEvent[]>([]);
  const [viewerBalance, setViewerBalance] = useState<number>(context.viewerUtilityBalance);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    supabase?.auth?.getSession?.().then(({ data }) => {
      setAccessToken(data?.session?.access_token ?? null);
    }).catch(() => {});
  }, []);

  const presenceRef = useRef<WebRTCPiPPresenceTrack | null>(null);
  if (!presenceRef.current) {
    presenceRef.current = new WebRTCPiPPresenceTrack();
  }

  const activeVod: CreatorShowdownVod | null = useMemo(() => {
    if (!selectedVodId) return context.vodReels[0] ?? null;
    return context.vodReels.find((r) => r.id === selectedVodId) ?? context.vodReels[0] ?? null;
  }, [context.vodReels, selectedVodId]);

  const effectiveFrames = remoteFrames ?? activeVod?.telemetryFrames ?? [];
  const syncRef = useRef<ReactionTimelineSynchronizer | null>(null);

  useEffect(() => {
    if (!activeVod && (!remoteFrames || remoteFrames.length === 0)) {
      syncRef.current = null;
      setSyncState(null);
      return;
    }

    const synchronizer = new ReactionTimelineSynchronizer({
      frames: effectiveFrames,
      timelinePlan: activeVod?.timelinePlan,
      presenceProvider: presenceRef.current ?? undefined,
      defaultPlaybackRate: 1,
    });
    syncRef.current = synchronizer;
    setSyncState(synchronizer.getState());
    return synchronizer.subscribe((next) => setSyncState(next));
  }, [activeVod, effectiveFrames, remoteFrames]);

  const handleRemoteTelemetryFrames = useCallback((frames: TelemetryFrame[]) => {
    setRemoteFrames(frames);
  }, []);

  const handleRemoteHudTrigger = useCallback((trigger: LiveHudTriggerEvent) => {
    setActiveHudBanner(trigger.message);
    setHudHistory((prev) =>
      prev.some((item) => item.id === trigger.id) ? prev : [trigger, ...prev].slice(0, 20)
    );
  }, []);

  const realtime = useLiveReactionSync({
    creatorSlug: context.creatorSlug,
    viewerId: context.viewerUserId || 'guest-viewer',
    synchronizer: syncRef.current,
    isHost: isLiveStudioActive,
    followHostSync,
    onRemoteTelemetryFrames: handleRemoteTelemetryFrames,
    onRemotePipLayout: setPipLayout,
    onRemoteHudTrigger: handleRemoteHudTrigger,
  });

  useEffect(() => {
    if (!syncState?.isPlaying) return;
    const interval = setInterval(() => {
      syncRef.current?.step(100);
    }, 100);
    return () => clearInterval(interval);
  }, [syncState?.isPlaying]);

  const handleTogglePlay = () => {
    if (!syncRef.current || !syncState) return;
    const next = syncState.isPlaying ? syncRef.current.pause() : syncRef.current.play();
    if (isLiveStudioActive) {
      realtime.broadcastPlayhead(next, activeVod?.matchId);
    }
  };

  const handleScrub = (ms: number) => {
    if (!syncRef.current) return;
    const next = syncRef.current.seek(ms);
    if (isLiveStudioActive) {
      realtime.broadcastPlayhead(next, activeVod?.matchId);
    }
  };

  const handleJumpToKeyframe = (keyframeId: string) => {
    if (!syncRef.current) return;
    const next = syncRef.current.jumpToKeyframe(keyframeId);
    if (isLiveStudioActive) {
      realtime.broadcastPlayhead(next, activeVod?.matchId);
    }
  };

  const handlePipLayoutChange = (next: PresencePiPLayout) => {
    setPipLayout(next);
    if (isLiveStudioActive) {
      realtime.broadcastPipLayout(next);
    }
  };

  const handleAttachVideo = (el: HTMLVideoElement | null) => {
    presenceRef.current?.attachPlaybackElement(el ?? undefined);
  };

  const handleToggleLiveStudio = () => {
    const nextActive = !isLiveStudioActive;
    setIsLiveStudioActive(nextActive);
    if (nextActive && activeVod) {
      realtime.broadcastTelemetry(
        activeVod.telemetryFrames,
        activeVod.matchId,
        activeVod.cartridgeId
      );
      if (syncState) {
        realtime.broadcastPlayhead(syncState, activeVod.matchId);
      }
    }
  };

  return (
    <div
      data-testid="sunshade-live-stage"
      data-simulcast-overlay={initialSimulcastOverlay ? 'true' : 'false'}
      className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8"
    >
      <div className="max-w-7xl mx-auto space-y-6">
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
                <span data-testid="live-viewer-count">{`${realtime.viewerCount} Watching`}</span>
                <span className="text-zinc-600">•</span>
                <span data-testid="live-standing-readout">
                  {context.profile
                    ? `${context.profile.citizenTier} • Rep ${context.profile.reputationScore}`
                    : 'Unclaimed Creator Channel'}
                </span>
              </div>

              <TokenBalanceBadge
                balance={viewerBalance}
                symbol="HT"
                label="Utility Wallet"
                variant="default"
                isLive={false}
              />

              <PrimaryButton
                testID="toggle-live-studio-btn"
                variant={isLiveStudioActive ? 'cozy' : 'sunshade'}
                size="sm"
                onPress={handleToggleLiveStudio}
                icon={<Radio className="w-3.5 h-3.5" />}
                label={isLiveStudioActive ? 'End Live Broadcast' : 'Start Live Broadcast'}
              />
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 space-y-4">
            <div className="relative">
              <WebGLTelemetryCanvas
                creatorName={creatorName}
                syncState={syncState}
                isLiveActive={isLiveStudioActive}
                activeHudBanner={activeHudBanner}
              />
              <DraggableWebcamPiP
                creatorName={creatorName}
                presenceProvider={presenceRef.current}
                layout={pipLayout}
                onLayoutChange={handlePipLayoutChange}
                onAttachVideoElement={handleAttachVideo}
              />
              {extraStageOverlay}
            </div>

            {activeVod && syncState && (
              <LiveReactionTimelineBar
                title={activeVod.title}
                syncState={syncState}
                keyframes={activeVod.timelinePlan?.keyframes ?? []}
                reactionCues={realtime.reactionCues}
                isRealtimeConnected={realtime.isRealtimeConnected}
                followHostSync={followHostSync}
                driftMs={realtime.driftMs}
                codecStats={realtime.codecStats}
                onTogglePlay={handleTogglePlay}
                onScrub={handleScrub}
                onJumpToKeyframe={handleJumpToKeyframe}
                onToggleFollowHost={() => setFollowHostSync((prev) => !prev)}
                onEmitReactionCue={(label, emoji) =>
                  realtime.broadcastReactionCue(
                    label,
                    emoji,
                    syncState.playheadMs,
                    creatorName
                  )
                }
                onBroadcastTelemetryPacket={() =>
                  realtime.broadcastTelemetry(
                    effectiveFrames,
                    activeVod.matchId,
                    activeVod.cartridgeId
                  )
                }
              />
            )}

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
                        onClick={() => {
                          setRemoteFrames(null);
                          setSelectedVodId(vod.id);
                        }}
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

          <div className="space-y-4">
            <GladiatorDropsPanel
              creatorId={context.profile?.id ?? null}
              creatorName={creatorName}
              viewerUserId={context.viewerUserId}
              viewerBalance={viewerBalance}
              activeMatchId={activeVod?.matchId}
              authAccessToken={accessToken}
              hudHistory={hudHistory}
              onHudTrigger={(trigger, newBalance) => {
                if (typeof newBalance === 'number') {
                  setViewerBalance(newBalance);
                }
                handleRemoteHudTrigger(trigger);
                realtime.broadcastHudTrigger(trigger);
              }}
            />
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
