'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BankedStub,
  BlindCheckResult,
  BlindSkillSubmission,
  CastLedgerEntry,
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

export interface UseArcadeDeckSessionOptions {
  userId?: string | null;
  dbCartridges?: Array<Record<string, any>>;
  unlockedCartridgeIds?: string[];
  initialCastBadges?: CastLedgerEntry[];
  externalMiracleSeed?: MiracleSeedSnapshot | null;
  onClearExternalMiracleSeed?: () => void;
  onOpenShowdownTheater?: (bundle: ShowdownBundle) => void;
}

export interface ArcadeDeckSessionHandle {
  cartridges: Array<ArcadeCartridge & { isUnlocked: boolean }>;
  cabinetState: ActiveCabinetState | null;
  isBusy: boolean;
  statusError: string | null;
  isSkillOverlayOpen: boolean;
  activeSkillPreview: ClientRollPreview | null;
  resultBanner: string | null;
  activeShowdown: ShowdownBundle | null;
  earnedBadges: CastLedgerEntry[];
  bootCabinet: (
    cartridge: ArcadeCartridge & { isUnlocked: boolean },
    miracleSeed?: MiracleSeedSnapshot
  ) => Promise<void>;
  pullRoll: () => Promise<void>;
  openSkillOverlay: () => void;
  closeSkillOverlay: () => void;
  submitSkillCheck: (submission: BlindSkillSubmission) => Promise<BlindCheckResult>;
  bankPendingStub: () => Promise<void>;
  claimStub: (stub: BankedStub) => Promise<void>;
  acknowledgeNextChapter: () => Promise<void>;
  buildShowdown: () => void;
  closeShowdown: () => void;
  launchMiracleSeed: (snapshot: MiracleSeedSnapshot) => void;
  clearMiracleSeed: () => void;
}

export function useArcadeDeckSession({
  userId,
  dbCartridges,
  unlockedCartridgeIds,
  initialCastBadges,
  externalMiracleSeed,
  onClearExternalMiracleSeed,
  onOpenShowdownTheater,
}: UseArcadeDeckSessionOptions): ArcadeDeckSessionHandle {
  const unlockedSet = useMemo(
    () => new Set(unlockedCartridgeIds),
    [unlockedCartridgeIds]
  );
  const cartridges = useMemo(
    () => mergeCartridgeCatalog(dbCartridges, unlockedSet),
    [dbCartridges, unlockedSet]
  );

  const [cabinetState, setCabinetState] = useState<ActiveCabinetState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isSkillOverlayOpen, setIsSkillOverlayOpen] = useState(false);
  const [activeSkillPreview, setActiveSkillPreview] = useState<ClientRollPreview | null>(null);
  const [resultBanner, setResultBanner] = useState<string | null>(null);
  const [activeShowdown, setActiveShowdown] = useState<ShowdownBundle | null>(null);
  const [internalMiracleSeed, setInternalMiracleSeed] = useState<MiracleSeedSnapshot | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<CastLedgerEntry[]>(
    () => initialCastBadges ?? []
  );

  const runtimeRef = useRef<ArcadeCabinetRuntime | null>(null);
  const bootedSeedSignatureRef = useRef<string | null>(null);
  const effectiveMiracleSeed = externalMiracleSeed ?? internalMiracleSeed;

  const bootCabinet = useCallback(
    async (
      cartridge: ArcadeCartridge & { isUnlocked: boolean },
      miracleSeed?: MiracleSeedSnapshot
    ) => {
      if (!cartridge.isUnlocked) {
        setStatusError(`Cabinet "${cartridge.title}" is locked.`);
        return;
      }

      setStatusError(null);
      setResultBanner(null);
      setIsSkillOverlayOpen(false);
      setActiveSkillPreview(null);

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

  useEffect(() => {
    if (!effectiveMiracleSeed) {
      bootedSeedSignatureRef.current = null;
      return;
    }

    const sig = `${effectiveMiracleSeed.matchId}:${effectiveMiracleSeed.cartridgeId}:${effectiveMiracleSeed.checkpointRollIndex}`;
    if (bootedSeedSignatureRef.current === sig) {
      return;
    }
    bootedSeedSignatureRef.current = sig;

    const matchCartridge =
      cartridges.find((c) => c.id === effectiveMiracleSeed.cartridgeId) ?? cartridges[0];
    if (matchCartridge) {
      void bootCabinet(matchCartridge, effectiveMiracleSeed);
    }
  }, [effectiveMiracleSeed, cartridges, bootCabinet]);

  const pullRoll = useCallback(async () => {
    if (!runtimeRef.current) return;
    setIsBusy(true);
    setStatusError(null);
    setResultBanner(null);
    try {
      const preview = await runtimeRef.current.pullNextRoll();
      const snapshot = await runtimeRef.current.getSnapshot();
      setCabinetState(snapshot);
      setActiveSkillPreview(preview);
      setIsSkillOverlayOpen(true);
    } catch (err: any) {
      setStatusError(err?.message || 'Unable to pull deterministic roll.');
    } finally {
      setIsBusy(false);
    }
  }, []);

  const openSkillOverlay = useCallback(() => {
    if (!cabinetState?.pendingRollPreview) return;
    setActiveSkillPreview(cabinetState.pendingRollPreview);
    setIsSkillOverlayOpen(true);
  }, [cabinetState?.pendingRollPreview]);

  const closeSkillOverlay = useCallback(() => {
    setIsSkillOverlayOpen(false);
    setActiveSkillPreview(null);
  }, []);

  const submitSkillCheck = useCallback(
    async (submission: BlindSkillSubmission): Promise<BlindCheckResult> => {
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
    },
    []
  );

  const bankPendingStub = useCallback(async () => {
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
      setActiveSkillPreview(null);
      setResultBanner(`Roll #${stub.rollIndex} sealed into Bonus Stub Vault.`);
    } catch (err: any) {
      setStatusError(err?.message || 'Failed to vault bonus stub.');
    } finally {
      setIsBusy(false);
    }
  }, []);

  const claimStub = useCallback(async (stub: BankedStub) => {
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
  }, []);

  const acknowledgeNextChapter = useCallback(async () => {
    if (!runtimeRef.current) return;
    setStatusError(null);
    try {
      runtimeRef.current.acknowledgeNextChapter();
      const snapshot = await runtimeRef.current.getSnapshot();
      setCabinetState(snapshot);
    } catch (err: any) {
      setStatusError(err?.message || 'Cannot advance chapter yet.');
    }
  }, []);

  const buildShowdown = useCallback(() => {
    if (!runtimeRef.current) return;
    const bundle = runtimeRef.current.buildShowdownBundle();
    if (bundle.castBadges.length > 0) {
      setEarnedBadges((prev) => {
        const merged = new Map(prev.map((b) => [b.entryId, b]));
        for (const badge of bundle.castBadges) {
          merged.set(badge.entryId, badge);
        }
        return Array.from(merged.values());
      });
    }
    if (onOpenShowdownTheater) {
      onOpenShowdownTheater(bundle);
    } else {
      setActiveShowdown(bundle);
    }
  }, [onOpenShowdownTheater]);

  const clearMiracleSeed = useCallback(() => {
    bootedSeedSignatureRef.current = null;
    runtimeRef.current = null;
    setCabinetState(null);
    setIsSkillOverlayOpen(false);
    setActiveSkillPreview(null);
    setResultBanner(null);
    setStatusError(null);
    setInternalMiracleSeed(null);
    onClearExternalMiracleSeed?.();
  }, [onClearExternalMiracleSeed]);

  const launchMiracleSeed = useCallback((snapshot: MiracleSeedSnapshot) => {
    bootedSeedSignatureRef.current = null;
    setInternalMiracleSeed(snapshot);
    setActiveShowdown(null);
  }, []);

  return {
    cartridges,
    cabinetState,
    isBusy,
    statusError,
    isSkillOverlayOpen,
    activeSkillPreview,
    resultBanner,
    activeShowdown,
    earnedBadges,
    bootCabinet,
    pullRoll,
    openSkillOverlay,
    closeSkillOverlay,
    submitSkillCheck,
    bankPendingStub,
    claimStub,
    acknowledgeNextChapter,
    buildShowdown,
    closeShowdown: () => setActiveShowdown(null),
    launchMiracleSeed,
    clearMiracleSeed,
  };
}
