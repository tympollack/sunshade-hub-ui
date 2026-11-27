'use client';

import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import type { VanityFunnelOverlayConfig } from '../../lib/live/simulcastRelay';

export interface VanityFunnelOverlayProps {
  visible: boolean;
  overlay: VanityFunnelOverlayConfig;
  dramaIndex?: number;
}

export function VanityFunnelOverlay({
  visible,
  overlay,
  dramaIndex = 0,
}: VanityFunnelOverlayProps) {
  if (!visible) return null;

  return (
    <div
      data-testid="vanity-funnel-overlay"
      className="pointer-events-none absolute top-14 left-3 z-20 max-w-sm rounded-xl border border-orange-500/50 bg-zinc-950/90 backdrop-blur-md px-3.5 py-2.5 shadow-2xl space-y-1"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-orange-400">
          SUNSHADE LIVE FUNNEL
        </span>
        <span className="text-[10px] font-mono font-bold text-emerald-400 inline-flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          95/5 Split
        </span>
      </div>
      <p className="text-xs font-bold text-white truncate">
        {overlay.ctaLabel}
      </p>
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-cyan-300">
        <span className="inline-flex items-center gap-1 truncate">
          <ExternalLink className="w-3 h-3 shrink-0" />
          {overlay.shortUrl}
        </span>
        <span className="text-amber-300 shrink-0">{`Drama ${dramaIndex.toFixed(0)}`}</span>
      </div>
    </div>
  );
}
