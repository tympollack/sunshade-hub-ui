'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@digitalcanopy/supabase';
import {
  base64UrlToTelemetryBytes,
  decodeTelemetryBundle,
  encodeTelemetryBundle,
  telemetryBytesToBase64Url,
  type PresencePiPLayout,
  type ReactionTimelineSynchronizer,
  type ScrubSyncState,
  type TelemetryFrame,
} from '@digitalcanopy/dramacast';

export interface ReactionCueMarker {
  id: string;
  timestampMs: number;
  label: string;
  emoji: string;
  senderName: string;
}

export interface LiveHudTriggerEvent {
  id: string;
  kind: 'gladiator_drop' | 'creator_cheer' | 'creator_sub';
  message: string;
  grossTokens: number;
  creatorShareTokens: number;
  platformShareTokens: number;
  createdAt: string;
}

export interface TelemetryCodecStats {
  byteLength: number;
  frameCount: number;
  compressionRatioEstimate: number;
}

export interface LivePlayheadBroadcastPayload {
  playheadMs: number;
  isPlaying: boolean;
  playbackRate: number;
  hostTimestampMs: number;
  matchId?: string;
}

export function encodeLiveTelemetryPacket(
  frames: readonly TelemetryFrame[],
  matchId: string,
  cartridgeId: string
): { encodedBase64Url: string; stats: TelemetryCodecStats } {
  const bundle = encodeTelemetryBundle(frames, {
    matchId,
    cartridgeId,
  });
  return {
    encodedBase64Url: telemetryBytesToBase64Url(bundle.payload),
    stats: {
      byteLength: bundle.byteLength,
      frameCount: bundle.header.frameCount,
      compressionRatioEstimate: bundle.compressionRatioEstimate,
    },
  };
}

export function decodeLiveTelemetryPacket(encodedBase64Url: string): {
  matchId: string;
  cartridgeId: string;
  frames: TelemetryFrame[];
} {
  const bytes = base64UrlToTelemetryBytes(encodedBase64Url);
  const decoded = decodeTelemetryBundle(bytes);
  return {
    matchId: decoded.header.matchId,
    cartridgeId: decoded.header.cartridgeId,
    frames: decoded.frames,
  };
}

export function computeSyncDriftMs(
  localPlayheadMs: number,
  remotePlayheadMs: number,
  remoteSentAtMs: number,
  nowMs: number,
  isPlaying: boolean,
  playbackRate = 1
): { expectedPlayheadMs: number; driftMs: number } {
  const transitMs = Math.max(0, Math.min(5000, nowMs - remoteSentAtMs));
  const expectedPlayheadMs = isPlaying
    ? remotePlayheadMs + transitMs * playbackRate
    : remotePlayheadMs;
  const driftMs = Math.round(expectedPlayheadMs - localPlayheadMs);
  return { expectedPlayheadMs, driftMs };
}

export interface UseLiveReactionSyncOptions {
  creatorSlug: string;
  viewerId: string;
  synchronizer: ReactionTimelineSynchronizer | null;
  isHost: boolean;
  followHostSync?: boolean;
  onRemoteTelemetryFrames?: (frames: TelemetryFrame[], matchId: string) => void;
  onRemotePipLayout?: (layout: PresencePiPLayout) => void;
  onRemoteHudTrigger?: (trigger: LiveHudTriggerEvent) => void;
}

export function useLiveReactionSync({
  creatorSlug,
  viewerId,
  synchronizer,
  isHost,
  followHostSync = true,
  onRemoteTelemetryFrames,
  onRemotePipLayout,
  onRemoteHudTrigger,
}: UseLiveReactionSyncOptions) {
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [driftMs, setDriftMs] = useState(0);
  const [reactionCues, setReactionCues] = useState<ReactionCueMarker[]>([]);
  const [codecStats, setCodecStats] = useState<TelemetryCodecStats | null>(null);

  const channelRef = useRef<any>(null);
  const syncRef = useRef<ReactionTimelineSynchronizer | null>(synchronizer);
  const followHostRef = useRef(followHostSync);
  const isHostRef = useRef(isHost);

  useEffect(() => {
    syncRef.current = synchronizer;
  }, [synchronizer]);

  useEffect(() => {
    followHostRef.current = followHostSync;
  }, [followHostSync]);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    if (!creatorSlug || typeof supabase?.channel !== 'function') return;

    const channel = supabase.channel(`sunshade-live:${creatorSlug}`, {
      config: { presence: { key: viewerId || 'anon-viewer' } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'playhead_sync' }, ({ payload }: { payload: LivePlayheadBroadcastPayload }) => {
        if (!payload || isHostRef.current || !followHostRef.current) return;
        const activeSync = syncRef.current;
        if (!activeSync) return;

        const current = activeSync.getState();
        const { expectedPlayheadMs, driftMs: computedDrift } = computeSyncDriftMs(
          current.playheadMs,
          payload.playheadMs,
          payload.hostTimestampMs,
          Date.now(),
          payload.isPlaying,
          payload.playbackRate
        );
        setDriftMs(computedDrift);

        if (Math.abs(computedDrift) > 250) {
          activeSync.seek(expectedPlayheadMs);
        }
        if (payload.isPlaying && !current.isPlaying) {
          activeSync.play();
        } else if (!payload.isPlaying && current.isPlaying) {
          activeSync.pause();
        }
      })
      .on('broadcast', { event: 'telemetry_bundle' }, ({ payload }: { payload: { encodedBase64Url: string } }) => {
        if (!payload?.encodedBase64Url || isHostRef.current) return;
        try {
          const decoded = decodeLiveTelemetryPacket(payload.encodedBase64Url);
          onRemoteTelemetryFrames?.(decoded.frames, decoded.matchId);
        } catch {
          // Ignore malformed telemetry packets
        }
      })
      .on('broadcast', { event: 'reaction_cue' }, ({ payload }: { payload: ReactionCueMarker }) => {
        if (!payload?.id) return;
        setReactionCues((prev) => {
          if (prev.some((c) => c.id === payload.id)) return prev;
          return [...prev, payload].slice(-30);
        });
      })
      .on('broadcast', { event: 'pip_layout' }, ({ payload }: { payload: { layout: PresencePiPLayout } }) => {
        if (payload?.layout && !isHostRef.current) {
          onRemotePipLayout?.(payload.layout);
        }
      })
      .on('broadcast', { event: 'hud_trigger' }, ({ payload }: { payload: LiveHudTriggerEvent }) => {
        if (payload?.id) {
          onRemoteHudTrigger?.(payload);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState?.() ?? {};
          const count = Object.values(state).reduce(
            (sum: number, entries: any) => sum + (Array.isArray(entries) ? entries.length : 1),
            0
          );
          setViewerCount(count);
        } catch {
          setViewerCount(0);
        }
      })
      .subscribe((status: string) => {
        const connected = status === 'SUBSCRIBED';
        setIsRealtimeConnected(connected);
        if (connected) {
          void channel.track?.({
            viewerId,
            role: isHostRef.current ? 'host' : 'viewer',
            joinedAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channelRef.current = null;
      setIsRealtimeConnected(false);
      if (typeof supabase.removeChannel === 'function') {
        void supabase.removeChannel(channel);
      } else {
        void channel.unsubscribe?.();
      }
    };
  }, [creatorSlug, viewerId, onRemoteHudTrigger, onRemotePipLayout, onRemoteTelemetryFrames]);

  const broadcastPlayhead = useCallback((state: ScrubSyncState, matchId?: string) => {
    const channel = channelRef.current;
    if (!channel) return;
    void channel.send?.({
      type: 'broadcast',
      event: 'playhead_sync',
      payload: {
        playheadMs: state.playheadMs,
        isPlaying: state.isPlaying,
        playbackRate: state.playbackRate,
        hostTimestampMs: Date.now(),
        matchId,
      } satisfies LivePlayheadBroadcastPayload,
    });
  }, []);

  const broadcastTelemetry = useCallback(
    (frames: readonly TelemetryFrame[], matchId: string, cartridgeId: string) => {
      if (frames.length === 0) return null;
      const packet = encodeLiveTelemetryPacket(frames, matchId, cartridgeId);
      setCodecStats(packet.stats);
      void channelRef.current?.send?.({
        type: 'broadcast',
        event: 'telemetry_bundle',
        payload: {
          encodedBase64Url: packet.encodedBase64Url,
          sentAtMs: Date.now(),
        },
      });
      return packet.stats;
    },
    []
  );

  const broadcastReactionCue = useCallback(
    (label: string, emoji: string, timestampMs: number, senderName: string) => {
      const marker: ReactionCueMarker = {
        id: `cue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestampMs: Math.max(0, Math.round(timestampMs)),
        label,
        emoji,
        senderName,
      };
      setReactionCues((prev) => [...prev, marker].slice(-30));
      void channelRef.current?.send?.({
        type: 'broadcast',
        event: 'reaction_cue',
        payload: marker,
      });
      return marker;
    },
    []
  );

  const broadcastPipLayout = useCallback((layout: PresencePiPLayout) => {
    void channelRef.current?.send?.({
      type: 'broadcast',
      event: 'pip_layout',
      payload: { layout },
    });
  }, []);

  const broadcastHudTrigger = useCallback((trigger: LiveHudTriggerEvent) => {
    void channelRef.current?.send?.({
      type: 'broadcast',
      event: 'hud_trigger',
      payload: trigger,
    });
  }, []);

  return {
    isRealtimeConnected,
    viewerCount,
    driftMs,
    reactionCues,
    codecStats,
    broadcastPlayhead,
    broadcastTelemetry,
    broadcastReactionCue,
    broadcastPipLayout,
    broadcastHudTrigger,
  };
}
