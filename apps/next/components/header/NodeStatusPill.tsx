'use client';

import React, { useState } from 'react';
import { Radio, Globe, AlertTriangle, RefreshCw, X, ChevronDown, Activity } from 'lucide-react';
import { AtmosphericBadge, Popover } from '@digitalcanopy/ui';
import { useNodeHealth } from '../../hooks/useNodeHealth';
import type { NetworkMode, HealthStatus } from '../../app/api/health/route';

export interface NodeStatusPillProps {
  className?: string;
  initialMode?: NetworkMode;
}

export function getStatusConfig(mode?: NetworkMode, status?: HealthStatus) {
  if (status === 'offline' || status === 'degraded' || mode === 'air-gapped') {
    return {
      label: 'Degraded / Air-Gapped',
      shortLabel: 'Air-Gapped',
      badgeVariant: 'error' as const,
      dotColor: 'bg-rose-500',
      pulseColor: 'bg-rose-500/30',
      badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40 hover:border-rose-400/60',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
    };
  }

  if (mode === 'wan-gateway') {
    return {
      label: 'WAN Gateway',
      shortLabel: 'WAN Gateway',
      badgeVariant: 'warning' as const,
      dotColor: 'bg-amber-400',
      pulseColor: 'bg-amber-400/30',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40 hover:border-amber-400/60',
      icon: <Globe className="w-3.5 h-3.5 text-amber-400" />,
    };
  }

  // Default: local-mesh
  return {
    label: 'Local Mesh Flypack (Low Latency)',
    shortLabel: 'Local Mesh',
    badgeVariant: 'success' as const,
    dotColor: 'bg-emerald-400',
    pulseColor: 'bg-emerald-400/30',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:border-emerald-400/60',
    icon: <Radio className="w-3.5 h-3.5 text-emerald-400" />,
  };
}

export function NodeStatusPill({ className = '' }: NodeStatusPillProps) {
  const { health, refetch } = useNodeHealth();
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mode = health?.mode || 'local-mesh';
  const status = health?.status || 'healthy';
  const config = getStatusConfig(mode, status);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  return (
    <div className={`relative inline-block ${className}`} data-testid="node-status-pill">
      <Popover
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom-end"
        viewportPadding={12}
        testID="node-telemetry-popover"
        className="w-80 sm:w-96 rounded-2xl bg-zinc-950/95 border border-zinc-800 shadow-2xl backdrop-blur-xl p-4 text-white"
        trigger={
          <button
            type="button"
            aria-label="Toggle Node Telemetry Popover"
            className={`inline-flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-mono font-medium border transition-all duration-200 backdrop-blur-md shadow-sm ${config.badgeClass}`}
          >
            {/* Pulsing Status Dot */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotColor}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`} />
            </span>

            {/* Status Label (responsive: full on md/lg, short on sm) */}
            <span className="hidden sm:inline font-semibold tracking-tight whitespace-nowrap">{config.label}</span>
            <span className="sm:hidden font-semibold tracking-tight whitespace-nowrap">{config.shortLabel}</span>

            {/* Latency preview badge */}
            {health?.latencyMs !== undefined && (
              <span className="text-[10px] opacity-85 hidden xl:inline">
                ({health.latencyMs}ms)
              </span>
            )}

            <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        }
      >
        {/* Popover Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-orange-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-200">Local Node Telemetry</h4>
              <p className="text-[10px] text-zinc-400 font-mono">ID: {health?.nodeId || 'Detecting...'}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleManualRefresh}
              title="Refresh Telemetry"
              aria-label="Refresh Telemetry"
              className="p-2 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              title="Close"
              aria-label="Close Node Telemetry"
              className="p-2 min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
          {/* Connected Node IP */}
          <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/60 space-y-1">
            <span className="text-[10px] uppercase text-zinc-400 block font-sans font-semibold">Connected Node IP</span>
            <span className="text-zinc-100 font-bold block truncate" data-testid="telemetry-node-ip">
              {health?.nodeIp || '127.0.0.1'}
            </span>
          </div>

          {/* Ping Latency */}
          <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/60 space-y-1">
            <span className="text-[10px] uppercase text-zinc-400 block font-sans font-semibold">Ping Latency</span>
            <span className="text-emerald-400 font-bold block" data-testid="telemetry-latency">
              {health?.latencyMs !== undefined ? `${health.latencyMs} ms` : 'Measuring...'}
            </span>
          </div>

          {/* Active Mesh Bandwidth */}
          <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/60 space-y-1 col-span-2">
            <span className="text-[10px] uppercase text-zinc-400 block font-sans font-semibold">Active Mesh Bandwidth</span>
            <span className="text-orange-400 font-bold block" data-testid="telemetry-bandwidth">
              {health?.bandwidth || 'Calculating...'}
            </span>
          </div>

          {/* Hub Version */}
          <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/60 space-y-1 col-span-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase text-zinc-400 block font-sans font-semibold">Hub Version</span>
              <span className="text-zinc-300 font-bold" data-testid="telemetry-version">
                {health?.hubVersion || 'v2.4.1-mesh'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-zinc-400 block font-sans font-semibold">Uptime</span>
              <span className="text-zinc-400 text-[11px]">
                {health?.uptime || 'Online'}
              </span>
            </div>
          </div>
        </div>

        {/* Network Mode Status Footer */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-zinc-400 font-medium">Active Network Topology:</span>
          <AtmosphericBadge label={config.label} variant={config.badgeVariant} statusDot size="sm" />
        </div>
      </Popover>
    </div>
  );
}
