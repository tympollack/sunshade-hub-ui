'use client';

import React from 'react';
import {
  Zap,
  Shield,
  Sparkles,
  Archive,
  Film,
  RotateCcw,
  PauseCircle,
  Trophy,
} from 'lucide-react';
import { PrimaryButton, ProgressBar } from '@digitalcanopy/ui';
import type { BankedStub, BlindSkillSubmission } from '@digitalcanopy/reels-engine';
import type { ActiveCabinetState } from '../../../../lib/arcade/arcadeSessionService';

interface ActiveCabinetStageProps {
  cabinetState: ActiveCabinetState;
  isBusy: boolean;
  isSkillOverlayOpen: boolean;
  hasCustomSkillOverlay: boolean;
  resultBanner: string | null;
  onPullRoll: () => void;
  onOpenSkillOverlay: () => void;
  onBankPendingStub: () => void;
  onClaimStub: (stub: BankedStub) => void;
  onAcknowledgeNextChapter: () => void;
  onBuildShowdown: () => void;
  onQuickSubmitSkill: (submission: BlindSkillSubmission) => Promise<void>;
  onClearMiracleSeed?: () => void;
}

export function ActiveCabinetStage({
  cabinetState,
  isBusy,
  isSkillOverlayOpen,
  hasCustomSkillOverlay,
  resultBanner,
  onPullRoll,
  onOpenSkillOverlay,
  onBankPendingStub,
  onClaimStub,
  onAcknowledgeNextChapter,
  onBuildShowdown,
  onQuickSubmitSkill,
  onClearMiracleSeed,
}: ActiveCabinetStageProps) {
  return (
    <div
      data-testid="arcade-cabinet-stage"
      className="rounded-2xl border border-orange-500/30 bg-zinc-950 text-zinc-100 p-5 sm:p-6 space-y-5 shadow-2xl"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-orange-400">
              {`CABINET ACTIVE • CH.${cabinetState.chapterIndex + 1}`}
            </span>
            {cabinetState.miracleChallengeTargetScore !== null && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {`MIRACLE SEED CHALLENGE • TARGET ${cabinetState.miracleChallengeTargetScore.toLocaleString()}`}
              </span>
            )}
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white">
            {cabinetState.cartridge.title}
          </h3>
          <p className="text-[11px] font-mono text-zinc-400">
            {`Match ID: ${cabinetState.matchId}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {cabinetState.miracleChallengeTargetScore !== null && onClearMiracleSeed && (
            <button
              type="button"
              onClick={onClearMiracleSeed}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              Exit Miracle Seed
            </button>
          )}
          <PrimaryButton
            testID="open-showdown-reel-btn"
            variant="outline"
            size="sm"
            disabled={cabinetState.steps.length === 0}
            onPress={onBuildShowdown}
            icon={<Film className="w-3.5 h-3.5" />}
            label={`60s Showdown Reel (${cabinetState.steps.length})`}
          />
        </div>
      </div>

      {/* Live Telemetry & Cadence Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
          <p className="text-[11px] text-zinc-400 uppercase font-semibold">Score</p>
          <p data-testid="cabinet-score" className="text-xl font-black text-white mt-0.5">
            {cabinetState.score.toLocaleString()}
          </p>
        </div>
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
          <p className="text-[11px] text-zinc-400 uppercase font-semibold">Win Odds</p>
          <p className="text-xl font-black text-cyan-400 mt-0.5">
            {`${(cabinetState.winProbability * 100).toFixed(1)}%`}
          </p>
        </div>
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
          <p className="text-[11px] text-zinc-400 uppercase font-semibold">Hull Integrity</p>
          <p className="text-xl font-black text-emerald-400 mt-0.5">
            {`${cabinetState.hullIntegrity}%`}
          </p>
        </div>
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
          <p className="text-[11px] text-zinc-400 uppercase font-semibold">Chapter Pulls</p>
          <p data-testid="cabinet-pulls" className="text-xl font-black text-orange-400 mt-0.5">
            {`${cabinetState.pullsConsumed} / ${cabinetState.pullsPerChapter}`}
          </p>
        </div>
      </div>

      <ProgressBar
        testID="cabinet-chapter-progress"
        size="md"
        total={cabinetState.pullsPerChapter}
        segments={[
          {
            id: 'consumed',
            label: 'Pulls Consumed',
            value: cabinetState.pullsConsumed,
            color: '#f97316',
          },
          {
            id: 'remaining',
            label: 'Pulls Remaining',
            value: cabinetState.pullsRemaining,
            color: '#27272a',
          },
        ]}
      />

      {resultBanner && (
        <div
          data-testid="cabinet-result-banner"
          className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono"
        >
          {resultBanner}
        </div>
      )}

      {/* Pending Client-Safe Roll Preview (ZERO Spoiler Exposure) */}
      {cabinetState.pendingRollPreview && (
        <div
          data-testid="pending-roll-preview"
          className="p-4 rounded-xl bg-zinc-900 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                {`Roll #${cabinetState.pendingRollPreview.index} Ready — ${cabinetState.pendingRollPreview.eventTag}`}
              </span>
            </div>
            <p className="text-[11px] font-mono text-zinc-400 truncate max-w-md">
              {`Commitment: ${cabinetState.pendingRollPreview.commitmentHash}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton
              testID="open-skill-check-btn"
              variant="sunshade"
              size="sm"
              onPress={onOpenSkillOverlay}
              icon={<Zap className="w-3.5 h-3.5" />}
              label="Enter Blind Skill-Check"
            />
            <PrimaryButton
              testID="bank-stub-btn"
              variant="glass"
              size="sm"
              disabled={isBusy}
              onPress={onBankPendingStub}
              icon={<Archive className="w-3.5 h-3.5" />}
              label="Vault Bonus Stub"
            />
          </div>
        </div>
      )}

      {/* Chapter Off-Ramp Banner */}
      {cabinetState.isChapterComplete && cabinetState.salvageSummary && (
        <div
          data-testid="chapter-offramp-banner"
          className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3"
        >
          <div className="flex items-start gap-3">
            <PauseCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                {`Chapter ${cabinetState.salvageSummary.chapterIndex + 1} Complete`}
              </h4>
              <p className="text-xs text-zinc-300 mt-1">
                {cabinetState.salvageSummary.pausePromptMessage}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton
              testID="acknowledge-next-chapter-btn"
              variant="cozy"
              size="sm"
              onPress={onAcknowledgeNextChapter}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              label={`Continue to Chapter ${cabinetState.chapterIndex + 2}`}
            />
            <PrimaryButton
              variant="outline"
              size="sm"
              disabled={cabinetState.steps.length === 0}
              onPress={onBuildShowdown}
              icon={<Trophy className="w-3.5 h-3.5" />}
              label="Cut 60s Showdown Reel"
            />
          </div>
        </div>
      )}

      {/* Primary Cabinet Pull Action */}
      {!cabinetState.isChapterComplete && !cabinetState.pendingRollPreview && (
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton
            testID="pull-deterministic-roll-btn"
            variant="sunshade"
            size="md"
            isLoading={isBusy}
            onPress={onPullRoll}
            icon={<Zap className="w-4 h-4" />}
            label="Pull Deterministic Roll"
          />
          {!hasCustomSkillOverlay && (
            <span className="text-xs text-zinc-400">
              Commits SHA-256 roll seed prior to skill submission.
            </span>
          )}
        </div>
      )}

      {/* Inline Fallback Skill-Check Action when no custom overlay is mounted */}
      {isSkillOverlayOpen && cabinetState.pendingRollPreview && !hasCustomSkillOverlay && (
        <div
          data-testid="inline-skill-check-fallback"
          className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-between gap-3"
        >
          <span className="text-xs text-zinc-300">
            {`Quick-submit blind skill check for Roll #${cabinetState.pendingRollPreview.index}`}
          </span>
          <PrimaryButton
            testID="quick-submit-skill-btn"
            size="sm"
            label="Submit Check"
            onPress={async () => {
              await onQuickSubmitSkill({
                rollIndex: cabinetState.pendingRollPreview!.index,
                minigameId: cabinetState.cartridge.minigameMode,
                rawScore: 80,
                maxScore: 100,
                clientSignature: `sig:${cabinetState.matchId}:${cabinetState.pendingRollPreview!.index}`,
                submittedAt: new Date().toISOString(),
              });
            }}
          />
        </div>
      )}

      {/* Stub Vault Tray */}
      {cabinetState.activeStubs.length > 0 && (
        <div
          data-testid="stub-vault-tray"
          className="pt-4 border-t border-zinc-800 space-y-2.5"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>{`Encrypted Bonus Stub Vault (${cabinetState.activeStubs.length})`}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {cabinetState.activeStubs.map((stub) => (
              <div
                key={stub.stubId}
                className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {`Bonus Stub • Roll #${stub.rollIndex}`}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-500 truncate">
                    {stub.stubId}
                  </p>
                </div>
                <PrimaryButton
                  testID={`claim-stub-${stub.rollIndex}`}
                  variant="cozy"
                  size="sm"
                  disabled={isBusy}
                  onPress={() => onClaimStub(stub)}
                  label="Claim Stub"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
