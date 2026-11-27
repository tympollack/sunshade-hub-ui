'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Scissors, Download, Link2, Check, Copy } from 'lucide-react';
import { AtmosphericBadge, PrimaryButton } from '@digitalcanopy/ui';
import type { DirectorTimelinePlan, TelemetryFrame } from '@digitalcanopy/dramacast';
import {
  exportVerticalMp4Clip,
  isWebCodecsSupported,
  mintClipShareLink,
  type VerticalClipExportResult,
} from '../../lib/live/webcodecsClipper';

export interface VerticalClipExporterPanelProps {
  creatorSlug: string;
  creatorName: string;
  title: string;
  reelId?: string;
  matchId?: string;
  currentPlayheadMs: number;
  durationMs: number;
  dramaIndex: number;
  score: number;
  telemetryFrames?: readonly TelemetryFrame[];
  timelinePlan?: DirectorTimelinePlan;
  sourceCanvas?: HTMLCanvasElement | null;
  sourceVideo?: HTMLVideoElement | null;
}

export function VerticalClipExporterPanel({
  creatorSlug,
  creatorName,
  title,
  reelId,
  matchId,
  currentPlayheadMs,
  durationMs,
  dramaIndex,
  score,
  telemetryFrames,
  timelinePlan,
  sourceCanvas,
  sourceVideo,
}: VerticalClipExporterPanelProps) {
  const safeMaxMs = Math.max(5000, durationMs);
  const [startSec, setStartSec] = useState(() => Math.max(0, Math.floor(currentPlayheadMs / 1000)));
  const [endSec, setEndSec] = useState(() =>
    Math.min(Math.floor(safeMaxMs / 1000), Math.max(5, Math.floor(currentPlayheadMs / 1000) + 10))
  );
  const [isExporting, setIsExporting] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [exportResult, setExportResult] = useState<VerticalClipExportResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (activeObjectUrlRef.current && typeof URL?.revokeObjectURL === 'function') {
        URL.revokeObjectURL(activeObjectUrlRef.current);
        activeObjectUrlRef.current = null;
      }
    };
  }, []);

  const webCodecsReady = isWebCodecsSupported();

  const handleMintShortlink = async (): Promise<string> => {
    const startMs = Math.max(0, startSec * 1000);
    const endMs = Math.max(startMs + 1000, endSec * 1000);
    const shortRes = await mintClipShareLink({
      creatorSlug,
      reelId,
      matchId,
      startMs,
      endMs,
      title,
    });
    setShortUrl(shortRes.shortUrl);
    return shortRes.shortUrl;
  };

  const handleExportClip = async () => {
    setErrorMsg(null);
    setIsExporting(true);
    setProgressPct(0);

    try {
      const mintedShortUrl = await handleMintShortlink();
      const result = await exportVerticalMp4Clip({
        creatorSlug,
        creatorName,
        title,
        startMs: startSec * 1000,
        endMs: Math.max(startSec + 1, endSec) * 1000,
        dramaIndex,
        score,
        shortUrl: mintedShortUrl,
        telemetryFrames,
        timelinePlan,
        sourceCanvas,
        sourceVideo,
        onProgress: setProgressPct,
      });

      setExportResult(result);
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        if (activeObjectUrlRef.current && typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(activeObjectUrlRef.current);
        }
        const nextUrl = URL.createObjectURL(result.blob);
        activeObjectUrlRef.current = nextUrl;
        setDownloadUrl(nextUrl);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to export 9:16 vertical MP4 clip.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyShortlink = async () => {
    if (!shortUrl) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shortUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-testid="vertical-clip-exporter-panel"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            9:16 WebCodecs Clipper
          </h3>
        </div>
        <AtmosphericBadge
          label={webCodecsReady ? 'WebCodecs H.264 Ready' : 'WebCodecs Unavailable'}
          variant={webCodecsReady ? 'success' : 'neutral'}
          size="sm"
        />
      </div>

      <p className="text-[11px] text-zinc-400">
        Export a 1080×1920 vertical MP4 clip client-side and mint a privacy-sanitized links.sunshade.icu share URL.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-mono text-zinc-400 block mb-1">Start (sec)</label>
          <input
            type="number"
            aria-label="Clip Start Seconds"
            data-testid="clip-start-sec-input"
            min={0}
            max={Math.floor(safeMaxMs / 1000)}
            value={startSec}
            onChange={(e) => setStartSec(Math.max(0, Number(e.target.value)))}
            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-white"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono text-zinc-400 block mb-1">End (sec)</label>
          <input
            type="number"
            aria-label="Clip End Seconds"
            data-testid="clip-end-sec-input"
            min={1}
            max={Math.floor(safeMaxMs / 1000)}
            value={endSec}
            onChange={(e) => setEndSec(Math.max(1, Number(e.target.value)))}
            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-white"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PrimaryButton
          testID="export-vertical-mp4-btn"
          variant="sunshade"
          size="sm"
          isLoading={isExporting}
          onPress={handleExportClip}
          icon={<Download className="w-3.5 h-3.5" />}
          label={isExporting ? `Encoding ${progressPct}%` : 'Export 9:16 MP4'}
          className="flex-1"
        />
        <PrimaryButton
          testID="mint-clip-shortlink-btn"
          variant="glass"
          size="sm"
          onPress={() => {
            void handleMintShortlink();
          }}
          icon={<Link2 className="w-3.5 h-3.5" />}
          label="Mint Link"
        />
      </div>

      {errorMsg && (
        <div data-testid="clipper-error" className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {shortUrl && (
        <div
          data-testid="clipper-shortlink-box"
          className="p-2.5 rounded-xl bg-zinc-950 border border-cyan-500/30 flex items-center justify-between gap-2"
        >
          <span className="text-[11px] font-mono text-cyan-300 truncate">{shortUrl}</span>
          <button
            type="button"
            data-testid="copy-clip-shortlink-btn"
            onClick={handleCopyShortlink}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 shrink-0"
            title="Copy shortlink"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {exportResult && downloadUrl && (
        <div
          data-testid="clipper-export-ready"
          className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2"
        >
          <span className="text-[11px] font-mono text-emerald-300 truncate">
            {`${exportResult.filename} (${exportResult.mp4Bytes.byteLength}B)`}
          </span>
          <a
            href={downloadUrl}
            download={exportResult.filename}
            data-testid="download-vertical-mp4-link"
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold text-white shrink-0"
          >
            Save MP4
          </a>
        </div>
      )}
    </div>
  );
}
