'use client';

import React, { useState } from 'react';
import { Sparkles, Copy, Check, Play, Upload } from 'lucide-react';
import { AtmosphericBadge, PrimaryButton } from '@digitalcanopy/ui';
import {
  deserializeMiracleSeedSnapshot,
  serializeMiracleSeedSnapshot,
  type MiracleSeedCandidate,
  type MiracleSeedSnapshot,
} from '@digitalcanopy/reels-engine';

export interface MiracleSeedLauncherProps {
  candidate: MiracleSeedCandidate | null;
  snapshot: MiracleSeedSnapshot | null;
  onLaunchMiracleSeed: (snapshot: MiracleSeedSnapshot) => void;
}

export function MiracleSeedLauncher({
  candidate,
  snapshot,
  onLaunchMiracleSeed,
}: MiracleSeedLauncherProps) {
  const [copied, setCopied] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importPayload, setImportPayload] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const handleCopy = async () => {
    if (!snapshot) return;
    const serialized = serializeMiracleSeedSnapshot(snapshot);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(serialized);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportLaunch = () => {
    setImportError(null);
    try {
      const parsed = deserializeMiracleSeedSnapshot(importPayload.trim());
      onLaunchMiracleSeed(parsed);
      setImportPayload('');
      setShowImport(false);
    } catch (err: any) {
      setImportError(err?.message || 'Invalid Miracle Seed snapshot JSON.');
    }
  };

  return (
    <div
      data-testid="miracle-seed-launcher"
      className="rounded-xl border border-amber-500/30 bg-zinc-950/90 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Miracle Seed Comeback Challenge
          </h4>
        </div>
        <button
          type="button"
          data-testid="toggle-import-miracle-btn"
          onClick={() => setShowImport((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
        >
          <Upload className="w-3.5 h-3.5" />
          {showImport ? 'Hide Import' : 'Import Seed JSON'}
        </button>
      </div>

      {candidate && snapshot ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <AtmosphericBadge
              label={
                candidate.triggerReason === 'SNAKE_EYES_RECOVERY'
                  ? 'Snake Eyes Comeback'
                  : `Sub-12% Comeback (${(candidate.lowestWinProbability * 100).toFixed(1)}%)`
              }
              variant="cozy"
              size="sm"
            />
            <span className="text-xs font-mono text-zinc-400">
              {`Checkpoint Roll #${snapshot.checkpointRollIndex} • Beat ${snapshot.targetScoreToBeat.toLocaleString()} pts`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <PrimaryButton
              testID="launch-miracle-seed-btn"
              variant="cozy"
              size="sm"
              onPress={() => onLaunchMiracleSeed(snapshot)}
              icon={<Play className="w-3.5 h-3.5" />}
              label="Launch Miracle Challenge"
            />
            <PrimaryButton
              testID="copy-miracle-seed-btn"
              variant="glass"
              size="sm"
              onPress={handleCopy}
              icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              label={copied ? 'Copied Seed JSON' : 'Copy Seed JSON'}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-400">
          Win a match after dipping below 12% win probability or recovering from a Snake Eyes misfire to mint a playable Miracle Seed checkpoint.
        </p>
      )}

      {showImport && (
        <div className="pt-2 border-t border-zinc-800 space-y-2">
          <textarea
            data-testid="import-miracle-seed-input"
            value={importPayload}
            onChange={(e) => setImportPayload(e.target.value)}
            placeholder='Paste serialized MiracleSeedSnapshot JSON...'
            rows={3}
            className="w-full rounded-lg bg-zinc-900 border border-zinc-700 p-2.5 text-xs font-mono text-zinc-200 outline-none focus:border-amber-500"
          />
          {importError && (
            <p data-testid="import-miracle-seed-error" className="text-xs text-rose-400">
              {importError}
            </p>
          )}
          <PrimaryButton
            testID="submit-import-miracle-btn"
            variant="sunshade"
            size="sm"
            disabled={!importPayload.trim()}
            onPress={handleImportLaunch}
            label="Load Imported Miracle Seed"
          />
        </div>
      )}
    </div>
  );
}
