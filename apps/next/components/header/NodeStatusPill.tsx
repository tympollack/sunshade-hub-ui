'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Radio, Wifi, Globe, AlertTriangle, RefreshCw, X, ChevronDown, Activity, Cpu } from 'lucide-react';
import { useNodeHealth } from '../../hooks/useNodeHealth';
import type { NetworkMode, HealthStatus } from '../../app/api/health/route';

export interface NodeStatusPillProps {
  className?: string;
  initialMode?: NetworkMode;
}

export function getStatusConfig(mode?: NetworkMode, status?: HealthStatus) {
  if (status === 'offline' || mode === 'air-gapped') {
    return {
      label: 'Degraded / Air-Gapped',
      shortLabel: 'Air-Gapped',
      dotColor: 'bg-rose-500',
      pulseColor: 'bg-rose-500/30',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:border-rose-500/50',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
    };
  }

  if (mode === 'wan-gateway') {
    return {
      label: 'WAN Gateway',
      shortLabel: 'WAN Gateway',
      dotColor: 'bg-amber-400',
      pulseColor: 'bg-amber-400/30',
      badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:border-amber-500/50',
      icon: <Globe className="w-3.5 h-3.5 text-amber-400" />,
    };
  }

  // Default: local-mesh
  return {
    label: 'Local Mesh Flypack (Low Latency)',
    shortLabel: 'Local Mesh',
    dotColor: 'bg-emerald-400',
    pulseColor: 'bg-emerald-400/30',
    badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50',
    icon: <Radio className="w-3.5 h-3.5 text-emerald-400" />,
  };
}

export function NodeStatusPill({ className = '' }: NodeStatusPillProps) {
  const { health, isLoading, refetch, measuredPingMs } = useNodeHealth();
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const mode = health?.mode || 'local-mesh';
  const status = health?.status || 'healthy';
  const config = getStatusConfig(mode, status);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`} data-testid="node-status-pill">
      {/* Clickable Header Status Pill */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Toggle Node Telemetry Popover"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium border transition-all duration-200 backdrop-blur-md shadow-sm ${config.badgeClass}`}
      >
        {/* Pulsing Status Dot */}
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotColor}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`} />
        </span>

        {/* Status Label (responsive: full on md/lg, short on sm) */}
        <span className="hidden sm:inline font-semibold tracking-tight">{config.label}</span>
        <span className="sm:hidden font-semibold tracking-tight">{config.shortLabel}</span>

        {/* Latency preview badge */}
        {health?.latencyMs !== undefined && (
          <span className="text-[10px] opacity-75 hidden xl:inline">
            ({health.latencyMs}ms)
          </span>
        )}

        <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Telemetry Popover */}
      {isOpen && (
        <div
          data-testid="node-telemetry-popover"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-zinc-950/95 border border-zinc-800 shadow-2xl backdrop-blur-xl p-4 text-white z-50 animate-in fade-in slide-in-from-top-2 duration-150"
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
                onClick={handleManualRefresh}
                title="Refresh Telemetry"
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
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
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-medium">Active Network Topology:</span>
            <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] border ${config.badgeClass}`}>
              {config.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
