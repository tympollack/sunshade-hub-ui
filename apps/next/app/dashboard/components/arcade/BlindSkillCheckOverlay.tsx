'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Zap, Archive, Radio, Flame, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AtmosphericBadge, Modal, PrimaryButton, ProgressBar } from '@digitalcanopy/ui';
import type {
  BlindCheckResult,
  BlindSkillSubmission,
  ClientRollPreview,
  SubSeedTier,
} from '@digitalcanopy/reels-engine';
import type { ArcadeCartridge } from '../../../../lib/arcade/cartridges';

export interface BlindSkillCheckOverlayProps {
  isOpen?: boolean;
  cartridge: ArcadeCartridge;
  rollPreview: ClientRollPreview;
  /** Duration in ms, clamped to the 3,000ms – 5,000ms tactile window (default: 4,000ms). */
  durationMs?: number;
  onSubmit: (submission: BlindSkillSubmission) => Promise<BlindCheckResult>;
  onBankStub: () => Promise<void>;
  onClose: () => void;
}

const MIN_WINDOW_MS = 3000;
const MAX_WINDOW_MS = 5000;

const TIER_META: Record<
  SubSeedTier,
  { label: string; badgeVariant: 'neutral' | 'telemetry' | 'cozy' | 'core'; color: string }
> = {
  tier0_baseline: { label: 'Tier 0 • Baseline', badgeVariant: 'neutral', color: '#71717a' },
  tier1_favorable: { label: 'Tier 1 • Favorable', badgeVariant: 'telemetry', color: '#06b6d4' },
  tier2_clutch: { label: 'Tier 2 • Clutch', badgeVariant: 'cozy', color: '#f59e0b' },
  tier3_miracle: { label: 'Tier 3 • MIRACLE', badgeVariant: 'core', color: '#f97316' },
};

/**
 * Derives a deterministic visual target center [25..75] purely from the
 * client-safe `commitmentHash` (contains zero spoiler data).
 */
export function deriveVisualTargetCenter(commitmentHash: string): number {
  const hexSlice = commitmentHash.slice(0, 4);
  const parsed = Number.parseInt(hexSlice, 16);
  if (!Number.isFinite(parsed)) return 50;
  return 25 + (parsed % 51);
}

/**
 * Computes a tactile 0–100 score from reticle alignment distance to target center.
 */
export function scoreReticlePrecision(reticlePct: number, targetCenterPct: number): number {
  const distance = Math.abs(reticlePct - targetCenterPct);
  const raw = Math.round(Math.max(0, Math.min(100, 100 - distance * 2.2)));
  return raw;
}

export function BlindSkillCheckOverlay({
  isOpen = true,
  cartridge,
  rollPreview,
  durationMs = 4000,
  onSubmit,
  onBankStub,
  onClose,
}: BlindSkillCheckOverlayProps) {
  const windowMs = useMemo(
    () => Math.max(MIN_WINDOW_MS, Math.min(MAX_WINDOW_MS, Math.round(durationMs))),
    [durationMs]
  );
  const targetCenter = useMemo(
    () => deriveVisualTargetCenter(rollPreview.commitmentHash),
    [rollPreview.commitmentHash]
  );

  const [elapsedMs, setElapsedMs] = useState(0);
  const [reticlePct, setReticlePct] = useState(10);
  const [tapCount, setTapCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<BlindCheckResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submittedRef = useRef(false);
  const reticleRef = useRef(10);
  const tapCountRef = useRef(0);

  useEffect(() => {
    reticleRef.current = reticlePct;
  }, [reticlePct]);

  useEffect(() => {
    tapCountRef.current = tapCount;
  }, [tapCount]);

  // Reset state whenever a new roll preview opens
  useEffect(() => {
    submittedRef.current = false;
    setElapsedMs(0);
    setReticlePct(10);
    setTapCount(0);
    setResult(null);
    setSubmitError(null);
    setIsSubmitting(false);
  }, [rollPreview.index, rollPreview.commitmentHash]);

  const executeSubmit = useCallback(
    async (explicitScore?: number) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setIsSubmitting(true);
      setSubmitError(null);

      const computedScore =
        typeof explicitScore === 'number'
          ? explicitScore
          : cartridge.minigameMode === 'target-tap'
          ? Math.min(100, tapCountRef.current * 10)
          : scoreReticlePrecision(reticleRef.current, targetCenter);

      const submission: BlindSkillSubmission = {
        rollIndex: rollPreview.index,
        minigameId: cartridge.minigameMode,
        rawScore: computedScore,
        maxScore: 100,
        clientSignature: `blind:${cartridge.id}:${rollPreview.index}:${computedScore}`,
        submittedAt: new Date().toISOString(),
      };

      try {
        const res = await onSubmit(submission);
        setResult(res);
      } catch (err: any) {
        submittedRef.current = false;
        setSubmitError(err?.message || 'Skill-check submission failed.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [cartridge.id, cartridge.minigameMode, onSubmit, rollPreview.index, targetCenter]
  );

  // 3–5 second tactile loop + auto-submit at expiration
  useEffect(() => {
    if (!isOpen || result) return;

    const tickMs = 50;
    const interval = setInterval(() => {
      setElapsedMs((prev) => {
        const next = prev + tickMs;
        // Oscillate reticle smoothly between 5% and 95%
        const phase = (next / 950) * Math.PI;
        const pos = 50 + 45 * Math.sin(phase);
        const rounded = Math.round(pos * 10) / 10;
        reticleRef.current = rounded;
        setReticlePct(rounded);

        if (next >= windowMs) {
          clearInterval(interval);
          void executeSubmit();
          return windowMs;
        }
        return next;
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, [isOpen, result, windowMs, executeSubmit]);

  const handleTapAction = useCallback(() => {
    if (result || isSubmitting) return;
    if (cartridge.minigameMode === 'target-tap') {
      const nextTaps = tapCountRef.current + 1;
      tapCountRef.current = nextTaps;
      setTapCount(nextTaps);
      if (nextTaps >= 10) {
        void executeSubmit(100);
      }
    } else {
      void executeSubmit();
    }
  }, [cartridge.minigameMode, executeSubmit, isSubmitting, result]);

  // Tactile keyboard shortcut (Space / Enter) while challenge is active
  useEffect(() => {
    if (!isOpen || result || typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleTapAction();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, result, handleTapAction]);

  const remainingMs = Math.max(0, windowMs - elapsedMs);
  const remainingSec = (remainingMs / 1000).toFixed(1);
  const timerPct = Math.round((remainingMs / windowMs) * 100);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      testID="blind-skill-check-modal"
      size="md"
      title={`Blind Skill-Check • Roll #${rollPreview.index}`}
      subtitle={`${cartridge.title} • ${rollPreview.eventTag}`}
      icon={<Crosshair className="w-5 h-5 text-orange-400" />}
      closeOnBackdropClick={Boolean(result)}
    >
      <div className="space-y-4">
        {/* Spoiler-Free Commitment Header */}
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <AtmosphericBadge
              label={`Event: ${rollPreview.eventTag}`}
              variant="telemetry"
              size="sm"
            />
            {!result && (
              <span
                data-testid="skill-check-countdown"
                className="text-sm font-mono font-black text-orange-400"
              >
                {`${remainingSec}s`}
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-zinc-500 truncate">
            {`SHA-256 Commitment: ${rollPreview.commitmentHash}`}
          </p>
        </div>

        {submitError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"
          >
            {submitError}
          </div>
        )}

        {/* Active 3–5s Minigame Runner */}
        {!result && (
          <div data-testid="blind-minigame-active" className="space-y-4">
            <ProgressBar
              testID="skill-check-timer-bar"
              size="sm"
              total={100}
              showTooltips={false}
              segments={[
                { id: 'time', label: 'Remaining', value: timerPct, color: '#f97316' },
                { id: 'elapsed', label: 'Elapsed', value: 100 - timerPct, color: '#27272a' },
              ]}
            />

            {cartridge.minigameMode === 'target-tap' ? (
              <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 text-center space-y-3">
                <p className="text-xs uppercase tracking-wider font-bold text-zinc-400">
                  Rapid Overdrive — Tap 10× Before Timer Expires (or press Space)
                </p>
                <p data-testid="tap-charge-readout" className="text-3xl font-black text-emerald-400 font-mono">
                  {`${Math.min(100, tapCount * 10)}%`}
                </p>
                <ProgressBar
                  size="md"
                  total={100}
                  showTooltips={false}
                  segments={[
                    { id: 'charge', label: 'Charge', value: Math.min(100, tapCount * 10), color: '#10b981' },
                  ]}
                />
                <PrimaryButton
                  testID="tactile-action-btn"
                  variant="sunshade"
                  size="lg"
                  disabled={isSubmitting}
                  onPress={handleTapAction}
                  icon={<Flame className="w-4 h-4" />}
                  label={`Charge Tap (${tapCount}/10)`}
                  className="w-full"
                />
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    {cartridge.minigameMode === 'frequency-lock'
                      ? 'Frequency Lock — Align Carrier Inside Sweet Spot'
                      : 'Precision Pulse — Lock Reticle Inside Target Band'}
                  </span>
                  <span className="font-mono text-zinc-500">Space / Tap</span>
                </div>

                {/* Tactile Track */}
                <div className="relative h-10 rounded-full bg-zinc-900 border border-zinc-700 overflow-hidden">
                  {/* Target Sweet Spot */}
                  <div
                    data-testid="skill-check-target-zone"
                    style={{
                      left: `${Math.max(0, targetCenter - 10)}%`,
                      width: '20%',
                    }}
                    className="absolute inset-y-0 bg-emerald-500/25 border-x border-emerald-400/70"
                  />
                  {/* Moving Reticle */}
                  <div
                    data-testid="skill-check-reticle"
                    style={{ left: `${reticlePct}%` }}
                    className="absolute top-1 bottom-1 w-2 -ml-1 rounded-full bg-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.9)]"
                  />
                </div>

                <PrimaryButton
                  testID="tactile-action-btn"
                  variant="sunshade"
                  size="lg"
                  isLoading={isSubmitting}
                  onPress={handleTapAction}
                  icon={<Zap className="w-4 h-4" />}
                  label="Lock Skill-Check"
                  className="w-full"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <PrimaryButton
                testID="overlay-bank-stub-btn"
                variant="glass"
                size="sm"
                disabled={isSubmitting}
                onPress={onBankStub}
                icon={<Archive className="w-3.5 h-3.5" />}
                label="Defer to Bonus Stub Vault"
              />
              <span className="text-[11px] text-zinc-500">
                Sub-seeds stay sealed until submission.
              </span>
            </div>
          </div>
        )}

        {/* Post-Submission Reveal */}
        {result && (
          <div data-testid="blind-skill-check-reveal" className="space-y-4">
            {result.isDoubleOneMisfire && (
              <div
                data-testid="snake-eyes-misfire-banner"
                className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center gap-2.5 text-rose-300 text-xs font-semibold"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Snake Eyes Double-1 Misfire! Recover on the next check for a Cast Ledger feat.</span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <AtmosphericBadge
                  label={TIER_META[result.selectedTier].label}
                  variant={TIER_META[result.selectedTier].badgeVariant}
                  size="md"
                />
                <span className="text-sm font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {`${Math.round(result.normalizedRatio * 100)}% Precision`}
                </span>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Shifted Sub-Seed Tier Odds
                </p>
                <ProgressBar
                  size="md"
                  total={100}
                  showLegend
                  segments={[
                    {
                      id: 't0',
                      label: 'Baseline',
                      value: Math.round(result.tierProbabilities.tier0_baseline * 100),
                      color: TIER_META.tier0_baseline.color,
                    },
                    {
                      id: 't1',
                      label: 'Favorable',
                      value: Math.round(result.tierProbabilities.tier1_favorable * 100),
                      color: TIER_META.tier1_favorable.color,
                    },
                    {
                      id: 't2',
                      label: 'Clutch',
                      value: Math.round(result.tierProbabilities.tier2_clutch * 100),
                      color: TIER_META.tier2_clutch.color,
                    },
                    {
                      id: 't3',
                      label: 'Miracle',
                      value: Math.round(result.tierProbabilities.tier3_miracle * 100),
                      color: TIER_META.tier3_miracle.color,
                    },
                  ]}
                />
              </div>

              <p className="text-[11px] font-mono text-zinc-500 break-all">
                {`Revealed Sub-Seed: ${result.selectedSubSeed}`}
              </p>
            </div>

            <PrimaryButton
              testID="close-skill-reveal-btn"
              variant="sunshade"
              size="md"
              onPress={onClose}
              label="Continue Cabinet"
              className="w-full"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
