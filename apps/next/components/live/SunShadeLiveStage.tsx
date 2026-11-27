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
import { VanityFunnelOverlay } from './VanityFunnelOverlay';
import { SimulcastRelayPanel } from './SimulcastRelayPanel';
import { VerticalClipExporterPanel } from './VerticalClipExporterPanel';
import { CastLedgerBadges } from '../../app/dashboard/components/arcade/CastLedgerBadges';
import { supabase } from '@digitalcanopy/supabase';

export interface SunShadeLiveStageProps {
  context: LiveCreatorContext;
  initialSimulcastOverlay?: boolean;
  initialReelId?: string;
  initialPlayheadMs?: number;
  initialClipEndMs?: number;
  extraRightPanels?: React.ReactNode;
  extraStageOverlay?: React.ReactNode;
}

export function SunShadeLiveStage({
  context,
  initialSimulcastOverlay = false,
  initialReelId,
  initialPlayheadMs,
  extraRightPanels,
  extraStageOverlay,
}: SunShadeLiveStageProps) {
  const creatorName = context.profile?.displayName || context.creatorSlug;
  const canHostBroadcast = Boolean(
    context.viewerUserId &&
      context.profile?.id &&
      context.viewerUserId.trim().toLowerCase() === context.profile.id.trim().toLowerCase()
  );

  const [selectedVodId, setSelectedVodId] = useState<string | null>(() => {
    if (initialReelId && context.vodReels.some((r) => r.id === initialReelId)) {
      return initialReelId;
    }
    return context.vodReels[0]?.id ?? null;
  });
  const [remoteFrames, setRemoteFrames] = useState<TelemetryFrame[] | null>(null);
  const [isLiveStudioActive, setIsLiveStudioActive] = useState(false);
  const [followHostSync, setFollowHostSync] = useState(true);
  const [pipLayout, setPipLayout] = useState<PresencePiPLayout | undefined>(undefined);
  const [remotePipFrameUrl, setRemotePipFrameUrl] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<ScrubSyncState | null>(null);
  const [activeHudBanner, setActiveHudBanner] = useState<string | null>(null);
  const [activeDropEffect, setActiveDropEffect] = useState<string | null>(null);
  const [hudHistory, setHudHistory] = useState<LiveHudTriggerEvent[]>([]);
  const [viewerBalance, setViewerBalance] = useState<number>(context.viewerUtilityBalance);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [simulcastOverlayEnabled, setSimulcastOverlayEnabled] = useState(initialSimulcastOverlay);
  const [simulcastShortUrl, setSimulcastShortUrl] = useState<string>(context.canonicalUrl);
  const [webcamActive, setWebcamActive] = useState(false);

  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const presenceRef = useRef<WebRTCPiPPresenceTrack | null>(null);
  if (!presenceRef.current) {
    presenceRef.current = new WebRTCPiPPresenceTrack();
  }

  useEffect(() => {
    supabase?.auth?.getSession?.().then(({ data }) => {
      setAccessToken(data?.session?.access_token ?? null);
    }).catch(() => {});
  }, []);

  const activeVod: CreatorShowdownVod | null = useMemo(() => {
    if (!selectedVodId) return context.vodReels[0] ?? null;
    return context.vodReels.find((r) => r.id === selectedVodId) ?? context.vodReels[0] ?? null;
  }, [context.vodReels, selectedVodId]);

  const effectiveFrames = remoteFrames ?? activeVod?.telemetryFrames ?? [];
  const syncRef = useRef<ReactionTimelineSynchronizer | null>(null);
  const initialSeekAppliedRef = useRef(false);

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
    if (!initialSeekAppliedRef.current && typeof initialPlayheadMs === 'number' && initialPlayheadMs > 0) {
      synchronizer.seek(initialPlayheadMs);
      initialSeekAppliedRef.current = true;
    }
    syncRef.current = synchronizer;
    setSyncState(synchronizer.getState());
    return synchronizer.subscribe((next) => setSyncState(next));
  }, [activeVod, effectiveFrames, remoteFrames, initialPlayheadMs]);

  const applyHudTrigger = useCallback((trigger: LiveHudTriggerEvent) => {
    setActiveHudBanner(trigger.message);
    if (trigger.effectCode) {
      setActiveDropEffect(trigger.effectCode);
    }
    setHudHistory((prev) =>
      prev.some((item) => item.id === trigger.id) ? prev : [trigger, ...prev].slice(0, 20)
    );
  }, []);

  const realtimeRef = useRef<ReturnType<typeof useLiveReactionSync> | null>(null);

  const handleHostSyncRequested = useCallback(() => {
    if (!isLiveStudioActive || !canHostBroadcast) return;
    if (activeVod) {
      realtimeRef.current?.broadcastTelemetry(
        activeVod.telemetryFrames,
        activeVod.matchId,
        activeVod.cartridgeId
      );
    }
    if (syncRef.current) {
      realtimeRef.current?.broadcastPlayhead(syncRef.current.getState(), activeVod?.matchId);
    }
    if (pipLayout) {
      realtimeRef.current?.broadcastPipLayout(pipLayout);
    }
  }, [activeVod, canHostBroadcast, isLiveStudioActive, pipLayout]);

  const realtime = useLiveReactionSync({
    creatorSlug: context.creatorSlug,
    hostOwnerId: context.profile?.id ?? null,
    viewerId: context.viewerUserId || 'guest-viewer',
    synchronizer: syncRef.current,
    isHost: isLiveStudioActive && canHostBroadcast,
    followHostSync,
    onRemoteTelemetryFrames: useCallback((frames: TelemetryFrame[]) => setRemoteFrames(frames), []),
    onRemotePipLayout: setPipLayout,
    onRemotePipFrame: setRemotePipFrameUrl,
    onRemoteHudTrigger: applyHudTrigger,
    onHostSyncRequested: handleHostSyncRequested,
  });
  realtimeRef.current = realtime;

  useEffect(() => {
    if (!syncState?.isPlaying) return;
    const interval = setInterval(() => syncRef.current?.step(100), 100);
    return () => clearInterval(interval);
  }, [syncState?.isPlaying]);

  useEffect(() => {
    if (!isLiveStudioActive || !canHostBroadcast || !webcamActive) return;
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = 160;
    captureCanvas.height = 160;
    const interval = setInterval(() => {
      const video = pipVideoRef.current;
      if (!video || video.readyState < 2) return;
      const ctx = captureCanvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 160, 160);
      realtimeRef.current?.broadcastPipFrame(captureCanvas.toDataURL('image/jpeg', 0.6));
    }, 500);
    return () => clearInterval(interval);
  }, [isLiveStudioActive, canHostBroadcast, webcamActive]);

  const handleTogglePlay = () => {
    if (!syncRef.current || !syncState) return;
    const next = syncState.isPlaying ? syncRef.current.pause() : syncRef.current.play();
    if (isLiveStudioActive && canHostBroadcast) realtime.broadcastPlayhead(next, activeVod?.matchId);
  };

  const handleScrub = (ms: number) => {
    if (!syncRef.current) return;
    const next = syncRef.current.seek(ms);
    if (isLiveStudioActive && canHostBroadcast) realtime.broadcastPlayhead(next, activeVod?.matchId);
  };

  const handleJumpToKeyframe = (keyframeId: string) => {
    if (!syncRef.current) return;
    const next = syncRef.current.jumpToKeyframe(keyframeId);
    if (isLiveStudioActive && canHostBroadcast) realtime.broadcastPlayhead(next, activeVod?.matchId);
  };

  const handlePipLayoutChange = (next: PresencePiPLayout) => {
    setPipLayout(next);
    if (isLiveStudioActive && canHostBroadcast) realtime.broadcastPipLayout(next);
  };

  const handleAttachVideo = useCallback((el: HTMLVideoElement | null) => {
    pipVideoRef.current = el;
    presenceRef.current?.attachPlaybackElement(el ?? undefined);
  }, []);

  const handleToggleLiveStudio = () => {
    if (!canHostBroadcast) return;
    const nextActive = !isLiveStudioActive;
    setIsLiveStudioActive(nextActive);
    if (nextActive && activeVod) {
      realtime.broadcastTelemetry(activeVod.telemetryFrames, activeVod.matchId, activeVod.cartridgeId);
      if (syncState) realtime.broadcastPlayhead(syncState, activeVod.matchId);
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
              <p className="text-xs font-mono text-zinc-400 break-all">{context.canonicalUrl}</p>
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
                disabled={!canHostBroadcast}
                onPress={handleToggleLiveStudio}
                icon={<Radio className="w-3.5 h-3.5" />}
                label={
                  !canHostBroadcast
                    ? 'Host Only'
                    : isLiveStudioActive
                    ? 'End Live Broadcast'
                    : 'Start Live Broadcast'
                }
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
                activeDropEffect={activeDropEffect}
                onCanvasReady={(el) => {
                  stageCanvasRef.current = el;
                }}
              />
              <DraggableWebcamPiP
                creatorName={creatorName}
                presenceProvider={presenceRef.current}
                layout={pipLayout}
                remoteFrameDataUrl={remotePipFrameUrl}
                canControlCamera={canHostBroadcast}
                onLayoutChange={handlePipLayoutChange}
                onAttachVideoElement={handleAttachVideo}
                onWebcamStateChange={(active) => setWebcamActive(active)}
              />
              <VanityFunnelOverlay
                visible={simulcastOverlayEnabled}
                dramaIndex={syncState?.interpolatedDramaIndex ?? 0}
                overlay={{
                  creatorSlug: context.creatorSlug,
                  creatorName,
                  canonicalUrl: context.canonicalUrl,
                  shortUrl: simulcastShortUrl,
                  ctaLabel: `Play & Drop at ${simulcastShortUrl}`,
                  splitBanner: '95% Direct to Creator • 5% Hub Infra',
                }}
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
                  realtime.broadcastReactionCue(label, emoji, syncState.playheadMs, creatorName)
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
                if (typeof newBalance === 'number') setViewerBalance(newBalance);
                applyHudTrigger(trigger);
                realtime.broadcastHudTrigger(trigger);
              }}
            />
            <SimulcastRelayPanel
              creatorSlug={context.creatorSlug}
              creatorName={creatorName}
              canonicalUrl={context.canonicalUrl}
              authAccessToken={accessToken}
              overlayEnabled={simulcastOverlayEnabled}
              onToggleOverlay={() => setSimulcastOverlayEnabled((prev) => !prev)}
              onSpecGenerated={(spec) => setSimulcastShortUrl(spec.overlay.shortUrl)}
            />
            <VerticalClipExporterPanel
              creatorSlug={context.creatorSlug}
              creatorName={creatorName}
              title={activeVod?.title || `${creatorName} Live Highlight`}
              reelId={activeVod?.id}
              matchId={activeVod?.matchId}
              currentPlayheadMs={syncState?.playheadMs ?? 0}
              durationMs={syncState?.durationMs ?? 60_000}
              dramaIndex={syncState?.interpolatedDramaIndex ?? 0}
              score={syncState?.interpolatedScore ?? 0}
              telemetryFrames={effectiveFrames}
              timelinePlan={activeVod?.timelinePlan}
              sourceCanvas={stageCanvasRef.current}
              sourceVideo={pipVideoRef.current}
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
