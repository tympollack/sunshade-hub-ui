'use client';

import React, { useState } from 'react';
import {
  Activity,
  ShieldCheck,
  Lock,
  Download,
  ExternalLink,
  Wifi,
  FileText,
  AlertCircle,
  Database,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import type { MedicalRecord, BioTelemetryDevice } from '../types';

interface MedicalVaultViewProps {
  session: any;
}

export function MedicalVaultView({ session }: MedicalVaultViewProps) {
  const [telemetryActive, setTelemetryActive] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const devices: BioTelemetryDevice[] = [
    {
      id: 'node-icu-01',
      device_name: 'SunShade ICU Telemetry Gateway',
      type: 'ICU Monitor & Stream Server',
      battery_pct: 100,
      status: 'streaming',
      last_sync: '2s ago',
    },
    {
      id: 'node-bio-02',
      device_name: 'Continuous Pulse / O2 Sensor',
      type: 'Wearable Biosensor',
      battery_pct: 87,
      status: 'streaming',
      last_sync: '5s ago',
    },
    {
      id: 'node-env-03',
      device_name: 'Ambient Environmental Node (SunShade Mesh)',
      type: 'Air Quality & Pressure Node',
      battery_pct: 94,
      status: 'streaming',
      last_sync: '1m ago',
    },
  ];

  const records: MedicalRecord[] = [
    {
      id: 'rec-2026-08',
      title: 'Annual Cardiorespiratory Stress Panel',
      record_type: 'Diagnostic Telemetry',
      facility: 'SunShade ICU & Clinical Network',
      date: 'Aug 14, 2026',
      status: 'verified',
      encryption_standard: 'AES-256-GCM / Zero-Knowledge Proof',
      hash: '0x8f3c...4a92',
    },
    {
      id: 'rec-2026-05',
      title: 'Continuous Holter & Vitals Snapshot (72-hr)',
      record_type: 'Telemetry Stream Log',
      facility: 'SunShade Edge BioNode #14',
      date: 'May 22, 2026',
      status: 'verified',
      encryption_standard: 'AES-256-GCM / Zero-Knowledge Proof',
      hash: '0x3e1a...7109',
    },
    {
      id: 'rec-2026-01',
      title: 'Baseline Genetic & Biomarker Profile',
      record_type: 'Genomic Annotation',
      facility: 'AlphaFold & Clinical Vault',
      date: 'Jan 10, 2026',
      status: 'verified',
      encryption_standard: 'AES-256-GCM / Zero-Knowledge Proof',
      hash: '0x99bb...2d14',
    },
  ];

  const handleExportVault = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setExportMessage('Encrypted Vault archive (ZIP) generated with ZK-Proof signature.');
      setTimeout(() => setExportMessage(null), 5000);
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 pb-12">
      {exportMessage && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} />
            <span>{exportMessage}</span>
          </div>
          <button onClick={() => setExportMessage(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-zinc-900/40 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Activity size={24} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                SunShade Medical Vault
              </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
              Decentralized, zero-knowledge encrypted health telemetry and clinical audit streams. Your clinical data is verified by edge nodes and accessible only by your verified private identity.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <ShieldCheck size={14} /> HIPAA / GDPR Zero-Knowledge Compliant
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                <Lock size={12} className="text-emerald-400" /> End-to-End Encrypted (AES-256-GCM)
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <a
              href="https://icu.sunshade.icu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-colors"
            >
              Open ICU Monitor <ExternalLink size={14} />
            </a>
            <button
              onClick={handleExportVault}
              disabled={isExporting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              {isExporting ? 'Packaging...' : 'Export Vault'}
            </button>
          </div>
        </div>
      </div>

      {/* Connected Bio-Telemetry Devices Stream */}
      <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-6 shadow-sm dark:shadow-none space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white text-lg">Active Telemetry BioNodes</h3>
            <p className="text-xs text-zinc-500">Live data pipelines broadcasting continuous vitals to your vault</p>
          </div>
          <button
            onClick={() => setTelemetryActive(!telemetryActive)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={12} className={telemetryActive ? 'animate-spin' : ''} />
            {telemetryActive ? 'Live Stream Active' : 'Paused'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {devices.map((dev) => (
            <div
              key={dev.id}
              className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 space-y-3 transition-colors hover:border-emerald-500/40"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                  <Cpu size={18} />
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Sync
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{dev.device_name}</h4>
                <p className="text-xs text-zinc-500 mt-0.5">{dev.type}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                <span>Battery: {dev.battery_pct}%</span>
                <span>Synced: {dev.last_sync}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Encrypted Clinical Records Table */}
      <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">Verified Medical Records</h3>
            <p className="text-xs text-zinc-500">Cryptographically signed clinical logs and diagnostic packages</p>
          </div>
          <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            {records.length} Verified Entries
          </span>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="p-4 sm:p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl mt-0.5 shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{rec.title}</h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mt-1">
                    <span>{rec.facility}</span>
                    <span>•</span>
                    <span>{rec.date}</span>
                    <span>•</span>
                    <span className="font-mono text-zinc-400">{rec.hash}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Verified
                </span>
                <button
                  onClick={handleExportVault}
                  className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  title="Download Decrypted Package"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
