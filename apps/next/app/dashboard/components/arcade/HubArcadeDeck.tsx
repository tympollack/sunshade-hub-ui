'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Gamepad2, Play, Lock, CheckCircle2, Tv } from 'lucide-react';
import {
  AtmosphericBadge,
  GlassCard,
  PrimaryButton,
  TokenBalanceBadge,
} from '@digitalcanopy/ui';
import type {
  BlindCheckResult,
  BlindSkillSubmission,
  CastLedgerEntry,
  ClientRollPreview,
  MiracleSeedSnapshot,
} from '@digitalcanopy/reels-engine';
import type { ArcadeCartridge } from '../../../../lib/arcade/cartridges';
import type { ShowdownBundle } from '../../../../lib/arcade/arcadeSessionService';
import { ActiveCabinetStage } from './ActiveCabinetStage';
import { BlindSkillCheckOverlay } from './BlindSkillCheckOverlay';
import { ShowdownReelTheater } from './ShowdownReelTheater';
import { CastLedgerBadges } from './CastLedgerBadges';
import {
  useArcadeDeckSession,
  type ArcadeDeckSessionHandle,
} from './useArcadeDeckSession';

export interface HubArcadeDeckProps {
  userId?: string | null;
  utilityBalance?: number;
  showSunShadeLive?: boolean;
  dbCartridges?: Array<Record<string, any>>;
  unlockedCartridgeIds?: string[];
  initialCastBadges?: CastLedgerEntry[];
  sessionHandle?: ArcadeDeckSessionHandle;
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
  showSunShadeLive = true,
  dbCartridges,
  unlockedCartridgeIds,
  initialCastBadges,
  sessionHandle,
  onOpenShowdownTheater,
  renderSkillCheckOverlay,
  activeMiracleSeed = null,
  onClearMiracleSeed,
}: HubArcadeDeckProps) {
  const internalSession = useArcadeDeckSession({
    userId,
    dbCartridges,
    unlockedCartridgeIds,
    initialCastBadges,
    externalMiracleSeed: activeMiracleSeed,
    onClearExternalMiracleSeed: onClearMiracleSeed,
    onOpenShowdownTheater,
  });

  const deck = sessionHandle ?? internalSession;
  const [genreFilter, setGenreFilter] = useState<(typeof GENRE_FILTERS)[number]>('all');

  const filteredCartridges = useMemo(() => {
    if (genreFilter === 'all') return deck.cartridges;
    return deck.cartridges.filter((c) => c.genre === genreFilter);
  }, [deck.cartridges, genreFilter]);

  const unlockedCount = deck.cartridges.filter((c) => c.isUnlocked).length;

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
            {showSunShadeLive && (
              <Link
                href={`/live/${encodeURIComponent(userId || 'studio')}`}
                data-testid="open-sunshade-live-link"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-orange-400 border border-orange-500/30 transition-colors"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>SunShade Live</span>
              </Link>
            )}
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

      {deck.statusError && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium"
        >
          {deck.statusError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredCartridges.map((cartridge) => {
          const isSelected = deck.cabinetState?.cartridge.id === cartridge.id;
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
                  onPress={() => deck.bootCabinet(cartridge)}
                  icon={<Play className="w-3.5 h-3.5" />}
                  label={isSelected ? 'Reboot Cabinet' : 'Launch Cabinet'}
                  className="w-full"
                />
              </div>
            </div>
          );
        })}
      </div>

      {deck.cabinetState && (
        <ActiveCabinetStage
          cabinetState={deck.cabinetState}
          isBusy={deck.isBusy}
          isSkillOverlayOpen={deck.isSkillOverlayOpen}
          hasCustomSkillOverlay={Boolean(renderSkillCheckOverlay)}
          resultBanner={deck.resultBanner}
          onPullRoll={deck.pullRoll}
          onOpenSkillOverlay={deck.openSkillOverlay}
          onBankPendingStub={deck.bankPendingStub}
          onClaimStub={deck.claimStub}
          onAcknowledgeNextChapter={deck.acknowledgeNextChapter}
          onBuildShowdown={deck.buildShowdown}
          onQuickSubmitSkill={async (submission) => {
            await deck.submitSkillCheck(submission);
            deck.closeSkillOverlay();
          }}
          onClearMiracleSeed={deck.clearMiracleSeed}
        />
      )}

      {deck.earnedBadges.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#161616] p-5">
          <CastLedgerBadges entries={deck.earnedBadges} compact />
        </div>
      )}

      {deck.isSkillOverlayOpen &&
        deck.cabinetState &&
        deck.activeSkillPreview &&
        (renderSkillCheckOverlay ? (
          renderSkillCheckOverlay({
            cartridge: deck.cabinetState.cartridge,
            rollPreview: deck.activeSkillPreview,
            onSubmit: deck.submitSkillCheck,
            onBankStub: deck.bankPendingStub,
            onClose: deck.closeSkillOverlay,
          })
        ) : (
          <BlindSkillCheckOverlay
            isOpen={deck.isSkillOverlayOpen}
            cartridge={deck.cabinetState.cartridge}
            rollPreview={deck.activeSkillPreview}
            onSubmit={deck.submitSkillCheck}
            onBankStub={deck.bankPendingStub}
            onClose={deck.closeSkillOverlay}
          />
        ))}

      <ShowdownReelTheater
        isOpen={Boolean(deck.activeShowdown)}
        bundle={deck.activeShowdown}
        onClose={deck.closeShowdown}
        onLaunchMiracleSeed={deck.launchMiracleSeed}
      />
    </section>
  );
}
