'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Gamepad2, Play, Lock, CheckCircle2 } from 'lucide-react';
import {
  AtmosphericBadge,
  GlassCard,
  PrimaryButton,
  TokenBalanceBadge,
} from '@digitalcanopy/ui';
import type {
  BankedStub,
  BlindCheckResult,
  BlindSkillSubmission,
  ClientRollPreview,
  MiracleSeedSnapshot,
} from '@digitalcanopy/reels-engine';
import {
  mergeCartridgeCatalog,
  type ArcadeCartridge,
} from '../../../../lib/arcade/cartridges';
import {
  ArcadeCabinetRuntime,
  type ActiveCabinetState,
  type ShowdownBundle,
} from '../../../../lib/arcade/arcadeSessionService';
import { ActiveCabinetStage } from './ActiveCabinetStage';

export interface HubArcadeDeckProps {
  userId?: string | null;
  utilityBalance?: number;
  dbCartridges?: Array<Record<string, any>>;
  unlockedCartridgeIds?: string[];
  onOpenShowdownTheater?: (bundle: ShowdownBundle) => void;
  renderSkillCheckOverlay?: (props: {
    cartridge: ArcadeCartridge;
    rollPreview: ClientRollPreview;
    onSubmit: (submission: BlindSkillSubmission) => Promise<BlindCheckResult>;
    onBankStub: () => Promise<void>;
    onClose: () => void;
  }) => React.ReactNode;
  activeMiracleSeed?: MiracleSeedSnapshot | null;
  onClearMiracleSeed?: () => void;
}

const GENRE_FILTERS = ['all', 'arcade', 'smuggler', 'strategy'] as const;

export function HubArcadeDeck({
  userId,
  utilityBalance = 0,
  dbCartridges,
  unlockedCartridgeIds = [],
  onOpenShowdownTheater,
  renderSkillCheckOverlay,
  activeMiracleSeed = null,
  onClearMiracleSeed,
}: HubArcadeDeckProps) {
  const unlockedSet = useMemo(() => new Set(unlockedCartridgeIds), [unlockedCartridgeIds]);
  const cartridges = useMemo(
    () => mergeCartridgeCatalog(dbCartridges, unlockedSet),
    [dbCartridges, unlockedSet]
  );

  const [genreFilter, setGenreFilter] = useState<(typeof GENRE_FILTERS)[number]>('all');
  const [cabinetState, setCabinetState] = useState<ActiveCabinetState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isSkillOverlayOpen, setIsSkillOverlayOpen] = useState(false);
  const [resultBanner, setResultBanner] = useState<string | null>(null);
  const runtimeRef = useRef<ArcadeCabinetRuntime | null>(null);

  const filteredCartridges = useMemo(() => {
    if (genreFilter === 'all') return cartridges;
    return cartridges.filter((c) => c.genre === genreFilter);
  }, [cartridges, genreFilter]);

  const bootCabinet = useCallback(
    async (cartridge: ArcadeCartridge & { isUnlocked: boolean }, miracleSeed?: MiracleSeedSnapshot) => {
      if (!cartridge.isUnlocked) {
        setStatusError(`Cabinet "${cartridge.title}" is locked.`);
        return;
      }

      setStatusError(null);
      setResultBanner(null);
      const runtime = new ArcadeCabinetRuntime({
        cartridge,
        playerId: userId || 'guest-citizen',
        miracleSnapshot: miracleSeed,
      });
      runtimeRef.current = runtime;
      const snapshot = await runtime.getSnapshot();
      setCabinetState(snapshot);
    },
    [userId]
  );

  React.useEffect(() => {
    if (!activeMiracleSeed) return;
    const matchCartridge =
      cartridges.find((c) => c.id === activeMiracleSeed.cartridgeId) ?? cartridges[0];
    if (matchCartridge) {
      bootCabinet(matchCartridge, activeMiracleSeed);
    }
  }, [activeMiracleSeed, cartridges, bootCabinet]);

  const handlePullRoll = async () => {
    if (!runtimeRef.current) return;
    setIsBusy(true);
    setStatusError(null);
    setResultBanner(null);
    try {
      await runtimeRef.current.pullNextRoll();
      const snapshot = await runtimeRef.current.getSnapshot();
      setCabinetState(snapshot);
      setIsSkillOverlayOpen(true);
    } catch (err: any) {
      setStatusError(err?.message || 'Unable to pull deterministic roll.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmitSkillCheck = async (
    submission: BlindSkillSubmission
  ): Promise<BlindCheckResult> => {
    if (!runtimeRef.current) {
      throw new Error('Arcade cabinet runtime not initialized.');
    }
    const result = await runtimeRef.current.submitBlindSkillCheck(submission);
    const snapshot = await runtimeRef.current.getSnapshot();
    setCabinetState(snapshot);
    setResultBanner(
      `Roll #${result.rollIndex} resolved → ${result.selectedTier.toUpperCase()} (${Math.round(result.normalizedRatio * 100)}% skill)`
    );
    return result;
  };

  const handleBankPendingStub = async () => {
    if (!runtimeRef.current) return;
    setIsBusy(true);
    setStatusError(null);
    try {
      const stub = await runtimeRef.current.bankPendingRollAsStub(
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      );
      const snapshot = await runtimeRef.current.getSnapshot();
      setCabinetState(snapshot);
      setIsSkillOverlayOpen(false);
      setResultBanner(`Roll #${stub.rollIndex} sealed into Bonus Stub Vault.`);
    } catch (err: any) {
      setStatusError(err?.message || 'Failed to vault bonus stub.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleClaimStub = async (stub: BankedStub) => {
    if (!runtimeRef.current) return;
    setIsBusy(true);
    setStatusError(null);
    try {
      const receipt = await runtimeRef.current.claimVaultedStub(stub.stubId);
      const snapshot = await runtimeRef.current.getSnapshot();
      setCabinetState(snapshot);
      setResultBanner(
        `Vaulted Stub #${receipt.rollIndex} claimed → ${receipt.selectedTier.toUpperCase()}`
      );
    } catch (err: any) {
      setStatusError(err?.message || 'Failed to claim vaulted stub.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleAcknowledgeNextChapter = async () => {
    if (!runtimeRef.current) return;
    setStatusError(null);
    try {
      runtimeRef.current.acknowledgeNextChapter();
      const snapshot = await runtimeRef.current.getSnapshot();
      setCabinetState(snapshot);
    } catch (err: any) {
      setStatusError(err?.message || 'Cannot advance chapter yet.');
    }
  };

  const handleBuildShowdown = () => {
    if (!runtimeRef.current) return;
    const bundle = runtimeRef.current.buildShowdownBundle();
    onOpenShowdownTheater?.(bundle);
  };

  const unlockedCount = cartridges.filter((c) => c.isUnlocked).length;

  return (
    <section data-testid="hub-arcade-deck" className="space-y-5">
      <GlassCard variant="default" padding="md" className="border-orange-500/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <AtmosphericBadge
                label="Hub Arcade Deck: Instant-Load"
                variant="core"
                statusDot
                pulse
                size="sm"
              />
              <AtmosphericBadge
                label={`${unlockedCount} Unlocked Cabinets`}
                variant="success"
                size="sm"
              />
              <AtmosphericBadge
                label="Closed-Loop Utility Firewall"
                variant="telemetry"
                size="sm"
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-orange-500" />
              <span>Instant Arcade Cabinets</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Zero-wait deterministic cartridges powered by @digitalcanopy/reels-engine. Pull blind skill checks, bank bonus stubs, and cut 60-second Showdown Reels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <TokenBalanceBadge
              balance={utilityBalance}
              symbol="HT"
              label="Utility Balance"
              variant="default"
              isLive={false}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-zinc-200/70 dark:border-zinc-800/80">
          {GENRE_FILTERS.map((genre) => {
            const active = genreFilter === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => setGenreFilter(genre)}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors border ${
                  active
                    ? 'bg-orange-600 text-white border-orange-500'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-orange-500/40'
                }`}
              >
                {genre === 'all' ? 'All Cabinets' : genre}
              </button>
            );
          })}
        </div>
      </GlassCard>

      {statusError && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium"
        >
          {statusError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredCartridges.map((cartridge) => {
          const isSelected = cabinetState?.cartridge.id === cartridge.id;
          return (
            <div
              key={cartridge.id}
              data-testid={`arcade-cabinet-card-${cartridge.id}`}
              className={`rounded-2xl border p-4 flex flex-col justify-between transition-all bg-white dark:bg-[#161616] ${
                isSelected
                  ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-lg shadow-orange-500/10'
                  : 'border-zinc-200 dark:border-zinc-800/80 hover:border-orange-500/40'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {cartridge.genre}
                  </span>
                  {cartridge.isUnlocked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Unlocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500">
                      <Lock className="w-3.5 h-3.5" />
                      Locked
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-snug">
                    {cartridge.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {cartridge.subtitle}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
                  <div>
                    <span className="text-zinc-500 block">Chapter</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {`${cartridge.pullsPerChapter} pulls`}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Entry</span>
                    <span className="font-bold text-emerald-500">
                      {cartridge.entryCostTokens === 0
                        ? 'FREE'
                        : `${cartridge.entryCostTokens} HT`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <PrimaryButton
                  testID={`launch-cabinet-${cartridge.id}`}
                  variant={isSelected ? 'cozy' : 'sunshade'}
                  size="sm"
                  disabled={!cartridge.isUnlocked}
                  onPress={() => bootCabinet(cartridge)}
                  icon={<Play className="w-3.5 h-3.5" />}
                  label={isSelected ? 'Reboot Cabinet' : 'Launch Cabinet'}
                  className="w-full"
                />
              </div>
            </div>
          );
        })}
      </div>

      {cabinetState && (
        <ActiveCabinetStage
          cabinetState={cabinetState}
          isBusy={isBusy}
          isSkillOverlayOpen={isSkillOverlayOpen}
          hasCustomSkillOverlay={Boolean(renderSkillCheckOverlay)}
          resultBanner={resultBanner}
          onPullRoll={handlePullRoll}
          onOpenSkillOverlay={() => setIsSkillOverlayOpen(true)}
          onBankPendingStub={handleBankPendingStub}
          onClaimStub={handleClaimStub}
          onAcknowledgeNextChapter={handleAcknowledgeNextChapter}
          onBuildShowdown={handleBuildShowdown}
          onQuickSubmitSkill={async (submission) => {
            await handleSubmitSkillCheck(submission);
            setIsSkillOverlayOpen(false);
          }}
          onClearMiracleSeed={onClearMiracleSeed}
        />
      )}

      {isSkillOverlayOpen &&
        cabinetState?.pendingRollPreview &&
        renderSkillCheckOverlay &&
        renderSkillCheckOverlay({
          cartridge: cabinetState.cartridge,
          rollPreview: cabinetState.pendingRollPreview,
          onSubmit: handleSubmitSkillCheck,
          onBankStub: handleBankPendingStub,
          onClose: () => setIsSkillOverlayOpen(false),
        })}
    </section>
  );
}
