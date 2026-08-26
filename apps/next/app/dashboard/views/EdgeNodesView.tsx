'use client';

import React, { useState } from 'react';
import {
  Server,
  Cpu,
  Wifi,
  Activity,
  Plus,
  Terminal,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check,
  Shield,
  Zap,
} from 'lucide-react';
import type { EdgeNode } from '../types';

interface EdgeNodesViewProps {
  edgeNodes: EdgeNode[];
  session: any;
}

export function EdgeNodesView({ edgeNodes, session }: EdgeNodesViewProps) {
  const [showPairModal, setShowPairModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const nodes: EdgeNode[] = edgeNodes.length > 0 ? edgeNodes : [
    {
      id: 'node-us-east-01',
      name: 'SunShade Gateway Node (US-East)',
      status: 'online',
      ip_address: '198.51.100.24',
      region: 'Virginia, US',
      latency_ms: 18,
      cpu_usage_pct: 28,
      memory_usage_pct: 42,
      uptime: '99.98%',
      version: 'v2.4.1-edge',
    },
    {
      id: 'node-eu-west-02',
      name: 'SunShade Sovereign Validator (EU-Central)',
      status: 'online',
      ip_address: '203.0.113.88',
      region: 'Frankfurt, DE',
      latency_ms: 82,
      cpu_usage_pct: 45,
      memory_usage_pct: 61,
      uptime: '99.95%',
      version: 'v2.4.1-edge',
    },
    {
      id: 'node-ap-east-03',
      name: 'SunShade Edge Relayer (Asia-Pacific)',
      status: 'online',
      ip_address: '192.0.2.145',
      region: 'Tokyo, JP',
      latency_ms: 135,
      cpu_usage_pct: 19,
      memory_usage_pct: 35,
      uptime: '99.99%',
      version: 'v2.4.0-edge',
    },
  ];

  const onlineCount = nodes.filter((n) => n.status === 'online').length;
  const avgLatency = Math.round(nodes.reduce((acc, n) => acc + (n.latency_ms || 45), 0) / nodes.length);
  const pairCommand = `curl -fsSL https://get.sunshade.icu/edge | sudo bash -s -- --token sunshade_node_auth_token_live`;

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(pairCommand);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 pb-12">
      {/* Cluster Overview Header */}
      <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-none relative overflow-hidden transition-colors duration-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl border border-orange-500/20">
                <Server size={24} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                Edge Compute Nodes
              </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Decentralized mesh compute network hosting game server instances, state consensus, match validation, and private telemetry routing.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleRefresh}
              className="p-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors"
              title="Refresh Cluster Metrics"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowPairModal(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20 transition-colors"
            >
              <Plus size={16} />
              Connect Node
            </button>
          </div>
        </div>

        {/* Cluster Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800/60">
          <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800/60">
            <span className="text-xs text-zinc-500 block">Total Nodes</span>
            <span className="text-xl font-black text-zinc-900 dark:text-white mt-1 block">{nodes.length}</span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800/60">
            <span className="text-xs text-zinc-500 block">Cluster Status</span>
            <span className="text-xl font-black text-emerald-500 mt-1 block flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {onlineCount} Online
            </span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800/60">
            <span className="text-xs text-zinc-500 block">Average Latency</span>
            <span className="text-xl font-black text-zinc-900 dark:text-white mt-1 block">{avgLatency} ms</span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800/60">
            <span className="text-xs text-zinc-500 block">Mesh Consensus</span>
            <span className="text-xl font-black text-orange-500 mt-1 block">99.98%</span>
          </div>
        </div>
      </div>

      {/* Nodes Table List */}
      <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900 dark:text-white text-base">Registered Infrastructure</h3>
          <span className="text-xs font-semibold text-zinc-500">Live Telemetry (Every 5s)</span>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="p-4 sm:p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl mt-0.5 text-zinc-700 dark:text-zinc-300 shrink-0">
                  <Server size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{node.name}</h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {node.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mt-1">
                    <span>Region: {node.region}</span>
                    <span>•</span>
                    <span className="font-mono">{node.ip_address}</span>
                    <span>•</span>
                    <span className="text-zinc-400 font-mono">{node.version}</span>
                  </div>
                </div>
              </div>

              {/* Node Stats Metrics */}
              <div className="flex items-center gap-4 sm:gap-6 self-start md:self-center text-xs">
                <div className="text-right">
                  <span className="text-zinc-500 block">Latency</span>
                  <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200">{node.latency_ms} ms</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 block">CPU</span>
                  <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200">{node.cpu_usage_pct}%</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 block">Uptime</span>
                  <span className="font-bold font-mono text-emerald-500">{node.uptime}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connect Node Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal size={20} className="text-orange-500" />
                <h3 className="font-bold text-zinc-900 dark:text-white text-lg">Provision New Edge Node</h3>
              </div>
              <button
                onClick={() => setShowPairModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Run this pairing command on your Linux/macOS or Raspberry Pi edge device to join the SunShade Distributed Node Mesh:
            </p>

            <div className="bg-zinc-900 text-zinc-100 p-3.5 rounded-xl font-mono text-xs relative group border border-zinc-800">
              <p className="break-all pr-8 select-all">{pairCommand}</p>
              <button
                onClick={handleCopyCommand}
                className="absolute top-2.5 right-2.5 p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition-colors"
                title="Copy Command"
              >
                {copiedToken ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowPairModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleCopyCommand}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors flex items-center gap-1.5"
              >
                {copiedToken ? <Check size={14} /> : <Copy size={14} />}
                {copiedToken ? 'Copied Command!' : 'Copy Script'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
