import {
  SUB_SEED_TIERS,
  ChapterSessionController,
  MemoryStubAdapter,
  StubVault,
  createMiracleSeedSnapshot,
  detectMiracleSeedCandidate,
  evaluateCastLedgerBadges,
  resolveBlindCheckSubSeed,
  toClientRollPreview,
  type BankedStub,
  type BlindCheckResult,
  type BlindSkillSubmission,
  type CastLedgerEntry,
  type ChapterSalvageSummary,
  type ClientRollPreview,
  type DeterministicRoll,
  type MiracleSeedCandidate,
  type MiracleSeedSnapshot,
  type RollTrajectoryStep,
  type StubResolutionRecord,
} from '@digitalcanopy/reels-engine';
import {
  TELEMETRY_FLAG_BLIND_RECOVERY,
  TELEMETRY_FLAG_MISFIRE,
  createDirectorTimelineFromTrajectory,
  type DirectorTimelinePlan,
  type DramaScoreBreakdown,
  type TelemetryFrame,
} from '@digitalcanopy/dramacast';
import type { ArcadeCartridge } from './cartridges';

export interface ActiveCabinetState {
  matchId: string;
  rootSeed: string;
  cartridge: ArcadeCartridge;
  chapterIndex: number;
  pullsConsumed: number;
  pullsPerChapter: number;
  pullsRemaining: number;
  score: number;
  winProbability: number;
  hullIntegrity: number;
  contrabandHoldCount: number;
  pendingRollPreview: ClientRollPreview | null;
  lastCheckResult: BlindCheckResult | null;
  steps: RollTrajectoryStep[];
  activeStubs: BankedStub[];
  salvageSummary: ChapterSalvageSummary | null;
  isChapterComplete: boolean;
  miracleChallengeTargetScore: number | null;
}

export interface ShowdownBundle {
  matchId: string;
  cartridgeId: string;
  title: string;
  didWin: boolean;
  finalScore: number;
  steps: RollTrajectoryStep[];
  breakdowns: DramaScoreBreakdown[];
  timelinePlan: DirectorTimelinePlan;
  telemetryFrames: TelemetryFrame[];
  miracleCandidate: MiracleSeedCandidate | null;
  miracleSnapshot: MiracleSeedSnapshot | null;
  castBadges: CastLedgerEntry[];
}

const TIER_SCORE_DELTA: Record<BlindCheckResult['selectedTier'], number> = {
  tier0_baseline: 40,
  tier1_favorable: 110,
  tier2_clutch: 240,
  tier3_miracle: 450,
};

const TIER_WIN_PROB_DELTA: Record<BlindCheckResult['selectedTier'], number> = {
  tier0_baseline: -0.09,
  tier1_favorable: 0.04,
  tier2_clutch: 0.14,
  tier3_miracle: 0.26,
};

function generateRandomHex(bytesLength = 16): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const arr = new Uint8Array(bytesLength);
    globalThis.crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function clampProb(value: number): number {
  return Math.max(0.02, Math.min(0.98, Number(value.toFixed(4))));
}

/**
 * Headless runtime coordinating a Hub Arcade cabinet session using
 * `@digitalcanopy/reels-engine` (`ChapterSessionController`, `StubVault`,
 * `toClientRollPreview`, `resolveBlindCheckSubSeed`) and `@digitalcanopy/dramacast`.
 *
 * Strictly hides raw `DeterministicRoll` spoiler fields (`isHighStakes`, `candidateSubSeeds`)
 * from UI consumers until after a blind skill-check submission resolves.
 */
export class ArcadeCabinetRuntime {
  readonly matchId: string;
  readonly rootSeed: string;
  readonly cartridge: ArcadeCartridge;
  readonly playerId: string;
  readonly vault: StubVault;
  private readonly controller: ChapterSessionController;
  private readonly rollsByIndex = new Map<number, DeterministicRoll>();
  private readonly steps: RollTrajectoryStep[] = [];

  private pendingRollPreview: ClientRollPreview | null = null;
  private lastCheckResult: BlindCheckResult | null = null;
  private score = 0;
  private winProbability = 0.42;
  private hullIntegrity = 100;
  private contrabandHoldCount = 0;
  private miracleChallengeTargetScore: number | null = null;
  private activeStubs: BankedStub[] = [];

  constructor(options: {
    cartridge: ArcadeCartridge;
    playerId: string;
    matchId?: string;
    rootSeed?: string;
    miracleSnapshot?: MiracleSeedSnapshot;
  }) {
    this.cartridge = options.cartridge;
    this.playerId = options.playerId;
    this.matchId =
      options.miracleSnapshot?.matchId ??
      options.matchId ??
      `match_${options.cartridge.id}_${generateRandomHex(8)}`;
    this.rootSeed =
      options.miracleSnapshot?.rootSeed ??
      options.rootSeed ??
      `seed_${generateRandomHex(16)}`;

    const board = options.miracleSnapshot?.boardSnapshot;
    const initialRollIndex = options.miracleSnapshot
      ? options.miracleSnapshot.checkpointRollIndex + 1
      : 0;

    if (options.miracleSnapshot && board) {
      this.score = Number(board.scoreAtCheckpoint ?? 0);
      this.winProbability = clampProb(
        Number(board.winProbabilityAtCheckpoint ?? 0.08)
      );
      this.hullIntegrity = Number(board.hullIntegrity ?? 5);
      this.contrabandHoldCount = Number(board.contrabandHoldCount ?? 2);
      this.miracleChallengeTargetScore = options.miracleSnapshot.targetScoreToBeat;
    }

    this.vault = new StubVault(new MemoryStubAdapter());
    this.controller = new ChapterSessionController({
      matchId: this.matchId,
      cartridgeId: this.cartridge.id,
      rootSeed: this.rootSeed,
      pullsPerChapter: this.cartridge.pullsPerChapter,
      cooldownMinutes: this.cartridge.cooldownMinutes,
      dailyChapterCap: this.cartridge.dailyChapterCap ?? undefined,
      stubVault: this.vault,
      initialRollIndex,
    });
  }

  async pullNextRoll(): Promise<ClientRollPreview> {
    if (this.pendingRollPreview) {
      return this.pendingRollPreview;
    }

    // Mark roll as played in ChapterSessionController so the final chapter pull
    // is never simultaneously auto-vaulted while pending in the skill-check flow.
    // Players can still explicitly bank it via bankPendingRollAsStub().
    const result = await this.controller.pullNextRoll({ markRollAsPlayed: true });
    this.rollsByIndex.set(result.roll.index, result.roll);
    const preview = toClientRollPreview(result.roll);
    this.pendingRollPreview = preview;
    this.activeStubs = await this.vault.listActiveStubs();
    return preview;
  }

  async submitBlindSkillCheck(
    submission: BlindSkillSubmission
  ): Promise<BlindCheckResult> {
    const roll = this.rollsByIndex.get(submission.rollIndex);
    if (!roll) {
      throw new Error(`No pending roll at index ${submission.rollIndex}.`);
    }

    const activeVaulted = await this.vault.listActiveStubs();
    if (activeVaulted.some((s) => s.rollIndex === submission.rollIndex)) {
      throw new Error(
        `Roll ${submission.rollIndex} is already banked in Bonus Stub Vault.`
      );
    }

    this.controller.markHighStakesRollPlayed(roll.index);
    const result = await resolveBlindCheckSubSeed(roll, submission);

    const prevProb = this.winProbability;
    let delta = TIER_SCORE_DELTA[result.selectedTier];
    let probDelta = TIER_WIN_PROB_DELTA[result.selectedTier];

    if (result.isDoubleOneMisfire) {
      delta = 10;
      probDelta = -0.22;
      this.hullIntegrity = Math.max(3, this.hullIntegrity - 35);
    } else {
      if (roll.isHighStakes) {
        delta *= 2;
      }
      if (result.selectedTier === 'tier2_clutch' || result.selectedTier === 'tier3_miracle') {
        this.contrabandHoldCount += 1;
      }
      if (this.hullIntegrity < 100 && result.normalizedRatio >= 0.75) {
        this.hullIntegrity = Math.min(100, this.hullIntegrity + 8);
      }
    }

    this.score += delta;
    this.winProbability = clampProb(prevProb + probDelta);

    this.steps.push({
      rollIndex: roll.index,
      winProbability: this.winProbability,
      selectedTier: result.selectedTier,
      selectedSubSeed: result.selectedSubSeed,
      normalizedSkillRatio: result.normalizedRatio,
      isDoubleOneMisfire: result.isDoubleOneMisfire,
      isBlindCheckRecovery:
        result.normalizedRatio >= 0.8 &&
        (prevProb < 0.2 || result.selectedTier === 'tier2_clutch' || result.selectedTier === 'tier3_miracle'),
      contrabandHoldCount: this.contrabandHoldCount,
      hullIntegrity: this.hullIntegrity,
      boardState: {
        rollIndex: roll.index,
        scoreAtCheckpoint: this.score,
        winProbabilityAtCheckpoint: this.winProbability,
        hullIntegrity: this.hullIntegrity,
        contrabandHoldCount: this.contrabandHoldCount,
      },
      score: this.score,
    });

    this.pendingRollPreview = null;
    this.lastCheckResult = result;
    this.activeStubs = await this.vault.listActiveStubs();
    return result;
  }

  async bankPendingRollAsStub(expiresAt: string | null = null): Promise<BankedStub> {
    if (!this.pendingRollPreview) {
      throw new Error('No pending roll is available to bank.');
    }
    const roll = this.rollsByIndex.get(this.pendingRollPreview.index);
    if (!roll) {
      throw new Error(`Roll ${this.pendingRollPreview.index} not found.`);
    }

    const stub = await this.vault.bankRollStub({
      matchId: this.matchId,
      cartridgeId: this.cartridge.id,
      roll,
      expiresAt,
    });
    this.controller.markHighStakesRollPlayed(roll.index);
    this.pendingRollPreview = null;
    this.activeStubs = await this.vault.listActiveStubs();
    return stub;
  }

  async claimVaultedStub(
    stubId: string,
    submission?: BlindSkillSubmission
  ): Promise<StubResolutionRecord> {
    const record = await this.vault.resolveStub(stubId, submission);
    const tierScore = TIER_SCORE_DELTA[record.selectedTier];
    this.score += tierScore;
    this.winProbability = clampProb(
      this.winProbability + TIER_WIN_PROB_DELTA[record.selectedTier]
    );

    this.steps.push({
      rollIndex: record.rollIndex,
      winProbability: this.winProbability,
      selectedTier: record.selectedTier,
      selectedSubSeed: record.selectedSubSeed,
      normalizedSkillRatio: submission
        ? Math.max(0, Math.min(1, submission.rawScore / Math.max(1, submission.maxScore)))
        : 0.5,
      contrabandHoldCount: this.contrabandHoldCount,
      hullIntegrity: this.hullIntegrity,
      boardState: {
        rollIndex: record.rollIndex,
        scoreAtCheckpoint: this.score,
        winProbabilityAtCheckpoint: this.winProbability,
        hullIntegrity: this.hullIntegrity,
        contrabandHoldCount: this.contrabandHoldCount,
      },
      score: this.score,
    });

    this.activeStubs = await this.vault.listActiveStubs();
    return record;
  }

  acknowledgeNextChapter(): void {
    this.controller.acknowledgeNewChapter();
  }

  async getSnapshot(): Promise<ActiveCabinetState> {
    this.activeStubs = await this.vault.listActiveStubs();
    return {
      matchId: this.matchId,
      rootSeed: this.rootSeed,
      cartridge: this.cartridge,
      chapterIndex: this.controller.getChapterIndex(),
      pullsConsumed: this.controller.getPullsConsumed(),
      pullsPerChapter: this.controller.getPullsPerChapter(),
      pullsRemaining: this.controller.getPullsRemaining(),
      score: this.score,
      winProbability: this.winProbability,
      hullIntegrity: this.hullIntegrity,
      contrabandHoldCount: this.contrabandHoldCount,
      pendingRollPreview: this.pendingRollPreview,
      lastCheckResult: this.lastCheckResult,
      steps: [...this.steps],
      activeStubs: [...this.activeStubs],
      salvageSummary: this.controller.getLastSalvageSummary(),
      isChapterComplete: this.controller.isChapterComplete(),
      miracleChallengeTargetScore: this.miracleChallengeTargetScore,
    };
  }

  buildShowdownBundle(): ShowdownBundle {
    const didWin =
      this.miracleChallengeTargetScore !== null
        ? this.score > this.miracleChallengeTargetScore
        : this.winProbability >= 0.5 || this.score >= 500;

    const { breakdowns, plan } = createDirectorTimelineFromTrajectory(this.steps, {
      matchId: this.matchId,
      cartridgeId: this.cartridge.id,
      targetDurationMs: 60_000,
      dramaWeights: this.cartridge.manifest.dramaWeights,
      supportsPresencePiP: this.cartridge.manifest.supportsPresencePiP,
    });

    const telemetryFrames: TelemetryFrame[] = this.steps.map((step, idx) => {
      const tierIdx = Math.max(0, SUB_SEED_TIERS.indexOf(step.selectedTier)) as 0 | 1 | 2 | 3;
      let flags = 0;
      if (step.isDoubleOneMisfire) flags |= TELEMETRY_FLAG_MISFIRE;
      if (step.isBlindCheckRecovery) flags |= TELEMETRY_FLAG_BLIND_RECOVERY;

      return {
        seq: idx,
        tMs: idx * 3000,
        rollIndex: step.rollIndex,
        winProbability: step.winProbability,
        dramaIndex: breakdowns[idx]?.dramaIndex ?? 0,
        score: step.score,
        tierIndex: tierIdx,
        flags,
        stateDelta: {
          hullIntegrity: step.hullIntegrity ?? 100,
          contrabandHoldCount: step.contrabandHoldCount ?? 0,
        },
      };
    });

    const ledgerCtx = {
      matchId: this.matchId,
      cartridgeId: this.cartridge.id,
      rootSeed: this.rootSeed,
      playerId: this.playerId,
      didWin,
      steps: this.steps,
    };

    const miracleCandidate = detectMiracleSeedCandidate(ledgerCtx);
    const miracleSnapshot = miracleCandidate
      ? createMiracleSeedSnapshot(miracleCandidate, this.steps)
      : null;
    const castBadges = evaluateCastLedgerBadges(ledgerCtx);

    return {
      matchId: this.matchId,
      cartridgeId: this.cartridge.id,
      title: `${this.cartridge.title} — 60s Showdown Reel`,
      didWin,
      finalScore: this.score,
      steps: [...this.steps],
      breakdowns,
      timelinePlan: plan,
      telemetryFrames,
      miracleCandidate,
      miracleSnapshot,
      castBadges,
    };
  }
}
