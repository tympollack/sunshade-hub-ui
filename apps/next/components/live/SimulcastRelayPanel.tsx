'use client';

import React, { useState } from 'react';
import { Cast, Eye, Plus, Trash2, Terminal, CheckCircle2 } from 'lucide-react';
import { AtmosphericBadge, PrimaryButton } from '@digitalcanopy/ui';
import {
  PLATFORM_INGEST_PRESETS,
  type SimulcastPlatform,
  type SimulcastTargetInput,
  type SimulcastWorkerSpec,
} from '../../lib/live/simulcastRelay';

export interface SimulcastRelayPanelProps {
  creatorSlug: string;
  creatorName: string;
  canonicalUrl: string;
  authAccessToken?: string | null;
  overlayEnabled: boolean;
  onToggleOverlay: () => void;
  onSpecGenerated?: (spec: SimulcastWorkerSpec) => void;
}

export function SimulcastRelayPanel({
  creatorSlug,
  creatorName,
  canonicalUrl,
  authAccessToken,
  overlayEnabled,
  onToggleOverlay,
  onSpecGenerated,
}: SimulcastRelayPanelProps) {
  const [targets, setTargets] = useState<SimulcastTargetInput[]>([
    {
      platform: 'youtube',
      ingestUrl: PLATFORM_INGEST_PRESETS.youtube.defaultUrl,
      streamKey: '',
      enabled: true,
    },
  ]);
  const [workerSpec, setWorkerSpec] = useState<SimulcastWorkerSpec | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddTarget = () => {
    setTargets((prev) => [
      ...prev,
      {
        platform: 'twitch',
        ingestUrl: PLATFORM_INGEST_PRESETS.twitch.defaultUrl,
        streamKey: '',
        enabled: true,
      },
    ]);
  };

  const handleUpdateTarget = (idx: number, patch: Partial<SimulcastTargetInput>) => {
    setTargets((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const next = { ...item, ...patch };
        if (patch.platform && !patch.ingestUrl) {
          next.ingestUrl = PLATFORM_INGEST_PRESETS[patch.platform].defaultUrl;
        }
        return next;
      })
    );
  };

  const handleRemoveTarget = (idx: number) => {
    setTargets((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleGenerateManifest = async () => {
    setErrorMsg(null);
    if (!authAccessToken) {
      setErrorMsg('Sign in to your Hub Citizen account to provision an RTMP simulcast worker manifest.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/live/simulcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authAccessToken}`,
        },
        body: JSON.stringify({
          creatorSlug,
          creatorName,
          canonicalUrl,
          targets,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to build simulcast worker manifest.');
      }
      setWorkerSpec(data.spec);
      onSpecGenerated?.(data.spec);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to generate simulcast manifest.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      data-testid="simulcast-relay-panel"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cast className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            RTMP Simulcast Relay
          </h3>
        </div>
        <button
          type="button"
          data-testid="toggle-vanity-overlay-btn"
          onClick={onToggleOverlay}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
            overlayEnabled
              ? 'bg-orange-500/20 border-orange-500 text-orange-300'
              : 'bg-zinc-950 border-zinc-800 text-zinc-400'
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>{overlayEnabled ? 'Funnel Overlay ON' : 'Funnel Overlay OFF'}</span>
        </button>
      </div>

      <p className="text-[11px] text-zinc-400">
        Headless Chromium + FFmpeg multi-RTMP relay with embedded Vanity Funnel & 95/5 split ticker.
      </p>

      <div className="space-y-2">
        {targets.map((target, idx) => (
          <div
            key={`${target.platform}-${idx}`}
            className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <select
                aria-label={`Simulcast platform ${idx + 1}`}
                value={target.platform}
                onChange={(e) =>
                  handleUpdateTarget(idx, { platform: e.target.value as SimulcastPlatform })
                }
                className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
              >
                {Object.entries(PLATFORM_INGEST_PRESETS).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>

              {targets.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveTarget(idx)}
                  className="p-1 rounded text-zinc-500 hover:text-rose-400"
                  aria-label="Remove target"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <input
              type="text"
              aria-label={`RTMP ingest URL ${idx + 1}`}
              value={target.ingestUrl}
              onChange={(e) => handleUpdateTarget(idx, { ingestUrl: e.target.value })}
              placeholder="rtmp://..."
              className="w-full px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-200"
            />
            <input
              type="password"
              aria-label={`Stream key ${idx + 1}`}
              data-testid={`simulcast-key-input-${idx}`}
              value={target.streamKey}
              onChange={(e) => handleUpdateTarget(idx, { streamKey: e.target.value })}
              placeholder="Stream key (masked in manifest)"
              className="w-full px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-200"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          data-testid="add-simulcast-target-btn"
          onClick={handleAddTarget}
          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add RTMP Target</span>
        </button>

        <PrimaryButton
          testID="generate-simulcast-spec-btn"
          variant="sunshade"
          size="sm"
          isLoading={isGenerating}
          onPress={handleGenerateManifest}
          icon={<Terminal className="w-3.5 h-3.5" />}
          label="Build Worker Spec"
        />
      </div>

      {errorMsg && (
        <div data-testid="simulcast-error" className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {workerSpec && (
        <div
          data-testid="simulcast-worker-spec"
          className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/30 space-y-1.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Worker Manifest Ready
            </span>
            <AtmosphericBadge
              label={`${workerSpec.targets.length} RTMP Target(s)`}
              variant="telemetry"
              size="sm"
            />
          </div>
          <p className="text-[10px] font-mono text-zinc-400 break-all">
            {`Stage URL: ${workerSpec.targetUrl}`}
          </p>
          <p className="text-[10px] font-mono text-cyan-300 break-all">
            {`Funnel Link: ${workerSpec.overlay.shortUrl}`}
          </p>
        </div>
      )}
    </div>
  );
}
