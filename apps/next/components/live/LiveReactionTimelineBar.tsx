'use client';

import React from 'react';
import { Play, Pause, Radio, Flame, Lock, Unlock, Sparkles } from 'lucide-react';
import { AtmosphericBadge, PrimaryButton } from '@digitalcanopy/ui';
import type { DirectorKeyframe, ScrubSyncState } from '@digitalcanopy/dramacast';
import type {
  ReactionCueMarker,
  TelemetryCodecStats,
} from '../../lib/live/useLiveReactionSync';

export interface LiveReactionTimelineBarProps {
  title: string;
  syncState: ScrubSyncState;
  keyframes: DirectorKeyframe[];
  reactionCues: ReactionCueMarker[];
  isRealtimeConnected: boolean;
  followHostSync: boolean;
  driftMs: number;
  codecStats: TelemetryCodecStats | null;
  onTogglePlay: () => void;
  onScrub: (ms: number) => void;
  onJumpToKeyframe: (keyframeId: string) => void;
  onToggleFollowHost: () => void;
  onEmitReactionCue: (label: string, emoji: string) => void;
  onBroadcastTelemetryPacket?: () => void;
}

function formatTimecode(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function LiveReactionTimelineBar({
  title,
  syncState,
  keyframes,
  reactionCues,
  isRealtimeConnected,
  followHostSync,
  driftMs,
  codecStats,
  onTogglePlay,
  onScrub,
  onJumpToKeyframe,
  onToggleFollowHost,
  onEmitReactionCue,
  onBroadcastTelemetryPacket,
}: LiveReactionTimelineBarProps) {
  const durationMs = Math.max(1000, syncState.durationMs);

  return (
    <div
      data-testid="live-vod-scrubber-bar"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PrimaryButton
            testID="live-play-pause-btn"
            variant="sunshade"
            size="sm"
            onPress={onTogglePlay}
            icon={syncState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            label={syncState.isPlaying ? 'Pause' : 'Play Reaction Sync'}
          />
          <button
            type="button"
            data-testid="toggle-follow-host-btn"
            onClick={onToggleFollowHost}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
              followHostSync
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            {followHostSync ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span>{followHostSync ? 'Realtime Sync Locked' : 'Free VOD Scrub'}</span>
          </button>
          <AtmosphericBadge
            label={isRealtimeConnected ? 'Realtime Synced' : 'Local Scrub'}
            variant={isRealtimeConnected ? 'success' : 'neutral'}
            size="sm"
          />
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-zinc-300">
          {driftMs !== 0 && (
            <span data-testid="live-sync-drift" className="text-[11px] text-cyan-400">
              {`Drift ${driftMs > 0 ? '+' : ''}${driftMs}ms`}
            </span>
          )}
          <span data-testid="live-timecode">
            {`${formatTimecode(syncState.playheadMs)} / ${formatTimecode(durationMs)}`}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
        <span className="font-semibold text-zinc-300 truncate max-w-md">{title}</span>
        <div className="flex items-center gap-2 font-mono">
          {codecStats && (
            <span data-testid="dcast1-codec-stats" className="text-emerald-400">
              {`DCAST1 ${codecStats.byteLength}B (${codecStats.compressionRatioEstimate}×)`}
            </span>
          )}
          {onBroadcastTelemetryPacket && (
            <button
              type="button"
              data-testid="broadcast-dcast1-btn"
              onClick={onBroadcastTelemetryPacket}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            >
              <Radio className="w-3 h-3 text-orange-400" />
              <span>Sync DCAST1</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrub Slider + Reaction Cue Pips */}
      <div className="relative pt-1">
        <input
          type="range"
          aria-label="Live Reaction Timeline"
          data-testid="live-timeline-scrubber"
          min={0}
          max={durationMs}
          step={250}
          value={Math.round(syncState.playheadMs)}
          onChange={(e) => onScrub(Number(e.target.value))}
          className="w-full accent-orange-500 cursor-pointer"
        />

        {reactionCues.length > 0 && (
          <div data-testid="reaction-cue-strip" className="flex flex-wrap gap-1.5 mt-2">
            {reactionCues.map((cue) => (
              <button
                key={cue.id}
                type="button"
                data-testid={`reaction-cue-${cue.id}`}
                onClick={() => onScrub(cue.timestampMs)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/40 text-[10px] font-mono text-orange-300 hover:bg-orange-500/25"
              >
                <span>{cue.emoji}</span>
                <span>{cue.label}</span>
                <span className="text-zinc-400">{formatTimecode(cue.timestampMs)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Reaction Stamps + Keyframes */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            data-testid="emit-cue-clutch"
            onClick={() => onEmitReactionCue('Clutch Moment', '🔥')}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-orange-500/50 text-[11px] text-zinc-200"
          >
            <Flame className="w-3 h-3 text-orange-400" />
            <span>Stamp Clutch</span>
          </button>
          <button
            type="button"
            data-testid="emit-cue-miracle"
            onClick={() => onEmitReactionCue('Miracle Check', '⚡')}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 text-[11px] text-zinc-200"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Stamp Miracle</span>
          </button>
        </div>

        {keyframes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {keyframes.map((kf) => {
              const active = syncState.activeKeyframe?.keyframeId === kf.keyframeId;
              return (
                <button
                  key={kf.keyframeId}
                  type="button"
                  data-testid={`live-kf-${kf.keyframeId}`}
                  onClick={() => onJumpToKeyframe(kf.keyframeId)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                    active
                      ? 'bg-orange-600 text-white border-orange-400'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {`R${kf.sourceRollIndex}`}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
