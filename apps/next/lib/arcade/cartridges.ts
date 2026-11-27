import type { CartridgeGenre, CartridgePluginManifest } from '@digitalcanopy/dramacast';

export type MinigameMode = 'precision-pulse' | 'frequency-lock' | 'target-tap';

export interface ArcadeCartridge {
  id: string;
  title: string;
  subtitle: string;
  genre: CartridgeGenre;
  version: string;
  minReelsEngineVersion: string;
  pullsPerChapter: number;
  cooldownMinutes: number;
  dailyChapterCap: number | null;
  entryCostTokens: number;
  maxRewardTokens: number;
  isUnlockedByDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  minigameMode: MinigameMode;
  accentColor: string;
  manifest: CartridgePluginManifest;
}

export const DEFAULT_ARCADE_CARTRIDGES: ArcadeCartridge[] = [
  {
    id: 'dart-up-skirmish',
    title: 'Dart Up! Sky Skirmish',
    subtitle: 'High-altitude dogfight rolls with 4-second lock-on blind skill checks.',
    genre: 'arcade',
    version: '1.0.0',
    minReelsEngineVersion: '0.1.0',
    pullsPerChapter: 15,
    cooldownMinutes: 0,
    dailyChapterCap: null,
    entryCostTokens: 0,
    maxRewardTokens: 0,
    isUnlockedByDefault: true,
    isActive: true,
    sortOrder: 10,
    minigameMode: 'precision-pulse',
    accentColor: '#f97316',
    manifest: {
      cartridgeId: 'dart-up-skirmish',
      version: '1.0.0',
      title: 'Dart Up! Sky Skirmish',
      genre: 'arcade',
      minReelsEngineVersion: '0.1.0',
      viewport: {
        width: 1280,
        height: 720,
        aspectRatio: '16:9',
        cameraMode: 'follow_entity',
      },
      eventTags: ['SECTOR_DRIFT', 'WARP_ANOMALY', 'PIRATE_AMBUSH', 'JACKPOT_VAULT'],
      dramaWeights: {
        comebackSwingWeight: 1.2,
        nearMissWeight: 1.1,
        miracleTierWeight: 1.3,
      },
      telemetryFields: [
        { key: 'altitude', type: 'uint16', min: 0, max: 10000 },
        { key: 'hullIntegrity', type: 'uint16', min: 0, max: 100 },
      ],
      supportsPresencePiP: true,
    },
  },
  {
    id: 'smuggler-run',
    title: 'Syndicate Smuggler Run',
    subtitle: 'Thread customs sweeps, bank contraband stubs, and chase Ghost Ship wins.',
    genre: 'smuggler',
    version: '1.0.0',
    minReelsEngineVersion: '0.1.0',
    pullsPerChapter: 15,
    cooldownMinutes: 0,
    dailyChapterCap: null,
    entryCostTokens: 0,
    maxRewardTokens: 0,
    isUnlockedByDefault: true,
    isActive: true,
    sortOrder: 20,
    minigameMode: 'frequency-lock',
    accentColor: '#06b6d4',
    manifest: {
      cartridgeId: 'smuggler-run',
      version: '1.0.0',
      title: 'Syndicate Smuggler Run',
      genre: 'smuggler',
      minReelsEngineVersion: '0.1.0',
      viewport: {
        width: 1280,
        height: 720,
        aspectRatio: '16:9',
        cameraMode: 'board_overview',
      },
      eventTags: ['CUSTOMS_SWEEP', 'SALVAGE_BEACON', 'SYNDICATE_DROP', 'NEBULA_STORM'],
      dramaWeights: {
        comebackSwingWeight: 1.1,
        misfireRecoveryWeight: 1.3,
        miracleTierWeight: 1.2,
      },
      telemetryFields: [
        { key: 'contrabandHoldCount', type: 'uint16', min: 0, max: 10 },
        { key: 'hullIntegrity', type: 'uint16', min: 0, max: 100 },
      ],
      supportsPresencePiP: true,
    },
  },
  {
    id: 'puk-huk-blitz',
    title: 'Puk Huk Arcade Blitz',
    subtitle: 'Rapid-fire overtime shootout rolls with clutch comeback Miracle Seeds.',
    genre: 'arcade',
    version: '1.0.0',
    minReelsEngineVersion: '0.1.0',
    pullsPerChapter: 12,
    cooldownMinutes: 0,
    dailyChapterCap: null,
    entryCostTokens: 0,
    maxRewardTokens: 0,
    isUnlockedByDefault: true,
    isActive: true,
    sortOrder: 30,
    minigameMode: 'target-tap',
    accentColor: '#10b981',
    manifest: {
      cartridgeId: 'puk-huk-blitz',
      version: '1.0.0',
      title: 'Puk Huk Arcade Blitz',
      genre: 'arcade',
      minReelsEngineVersion: '0.1.0',
      viewport: {
        width: 1280,
        height: 720,
        aspectRatio: '16:9',
        cameraMode: 'split_focus',
      },
      eventTags: ['SECTOR_DRIFT', 'SALVAGE_BEACON', 'JACKPOT_VAULT'],
      dramaWeights: {
        streakMomentumWeight: 1.25,
        nearMissWeight: 1.2,
      },
      telemetryFields: [
        { key: 'puckVelocity', type: 'uint16', min: 0, max: 500 },
      ],
      supportsPresencePiP: true,
    },
  },
  {
    id: 'second-wind-hold',
    title: 'Second Wind: Last Hold',
    subtitle: 'Tactical defense rolls built for sub-12% Second Wind & Against All Odds comebacks.',
    genre: 'strategy',
    version: '1.0.0',
    minReelsEngineVersion: '0.1.0',
    pullsPerChapter: 15,
    cooldownMinutes: 0,
    dailyChapterCap: null,
    entryCostTokens: 0,
    maxRewardTokens: 0,
    isUnlockedByDefault: true,
    isActive: true,
    sortOrder: 40,
    minigameMode: 'precision-pulse',
    accentColor: '#f59e0b',
    manifest: {
      cartridgeId: 'second-wind-hold',
      version: '1.0.0',
      title: 'Second Wind: Last Hold',
      genre: 'strategy',
      minReelsEngineVersion: '0.1.0',
      viewport: {
        width: 1280,
        height: 720,
        aspectRatio: '16:9',
        cameraMode: 'board_overview',
      },
      eventTags: ['PIRATE_AMBUSH', 'NEBULA_STORM', 'WARP_ANOMALY'],
      dramaWeights: {
        comebackSwingWeight: 1.4,
        misfireRecoveryWeight: 1.2,
      },
      telemetryFields: [
        { key: 'hullIntegrity', type: 'uint16', min: 0, max: 100 },
      ],
      supportsPresencePiP: true,
    },
  },
];

export function getArcadeCartridge(cartridgeId: string): ArcadeCartridge | undefined {
  return DEFAULT_ARCADE_CARTRIDGES.find((c) => c.id === cartridgeId);
}

/**
 * Merges database cartridge rows with local instant-load definitions so cabinets
 * always render immediately while reflecting DB-managed unlocks and entry costs.
 */
export function mergeCartridgeCatalog(
  dbRows?: Array<Record<string, any>> | null,
  userUnlockedIds?: ReadonlySet<string>
): Array<ArcadeCartridge & { isUnlocked: boolean }> {
  if (!dbRows || dbRows.length === 0) {
    return DEFAULT_ARCADE_CARTRIDGES.map((c) => ({
      ...c,
      isUnlocked: c.isUnlockedByDefault || (userUnlockedIds?.has(c.id) ?? false),
    }));
  }

  const defaultsById = new Map(DEFAULT_ARCADE_CARTRIDGES.map((c) => [c.id, c]));

  return dbRows
    .filter((row) => row && row.is_active !== false)
    .map((row) => {
      const fallback = defaultsById.get(row.id);
      const isUnlockedByDefault = Boolean(row.is_unlocked_by_default ?? fallback?.isUnlockedByDefault ?? true);
      const manifestRaw = (row.manifest && typeof row.manifest === 'object' ? row.manifest : {}) as Record<string, any>;

      const cartridge: ArcadeCartridge = {
        id: String(row.id),
        title: String(row.title || fallback?.title || row.id),
        subtitle: String(row.subtitle ?? fallback?.subtitle ?? ''),
        genre: (row.genre || fallback?.genre || 'arcade') as CartridgeGenre,
        version: String(row.version || fallback?.version || '1.0.0'),
        minReelsEngineVersion: String(row.min_reels_engine_version || fallback?.minReelsEngineVersion || '0.1.0'),
        pullsPerChapter: Number(row.pulls_per_chapter ?? fallback?.pullsPerChapter ?? 15),
        cooldownMinutes: Number(row.cooldown_minutes ?? fallback?.cooldownMinutes ?? 0),
        dailyChapterCap: row.daily_chapter_cap !== undefined ? row.daily_chapter_cap : (fallback?.dailyChapterCap ?? null),
        entryCostTokens: Number(row.entry_cost_tokens ?? fallback?.entryCostTokens ?? 0),
        maxRewardTokens: Number(row.max_reward_tokens ?? fallback?.maxRewardTokens ?? 0),
        isUnlockedByDefault,
        isActive: row.is_active !== false,
        sortOrder: Number(row.sort_order ?? fallback?.sortOrder ?? 100),
        minigameMode: fallback?.minigameMode ?? 'precision-pulse',
        accentColor: fallback?.accentColor ?? '#f97316',
        manifest: {
          cartridgeId: String(row.id),
          version: String(row.version || fallback?.version || '1.0.0'),
          title: String(row.title || fallback?.title || row.id),
          genre: (row.genre || fallback?.genre || 'arcade') as CartridgeGenre,
          minReelsEngineVersion: String(row.min_reels_engine_version || '0.1.0'),
          viewport: manifestRaw.viewport || fallback?.manifest.viewport || {
            width: 1280,
            height: 720,
            aspectRatio: '16:9',
            cameraMode: 'follow_entity',
          },
          eventTags: Array.isArray(manifestRaw.eventTags)
            ? manifestRaw.eventTags
            : (fallback?.manifest.eventTags ?? ['SECTOR_DRIFT']),
          dramaWeights: fallback?.manifest.dramaWeights,
          telemetryFields: fallback?.manifest.telemetryFields ?? [],
          supportsPresencePiP: Boolean(manifestRaw.supportsPresencePiP ?? true),
        },
      };

      return {
        ...cartridge,
        isUnlocked: isUnlockedByDefault || (userUnlockedIds?.has(cartridge.id) ?? false),
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
