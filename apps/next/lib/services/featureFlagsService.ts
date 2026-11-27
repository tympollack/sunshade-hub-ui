import type { EcosystemApp } from '../../data/ecosystemApps';

export type FeatureFlagCategory = 'card' | 'widget' | 'system' | 'general';

export interface HubFeatureFlag {
  id?: string;
  key: string;
  name: string;
  description?: string | null;
  category: FeatureFlagCategory;
  enabled: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_HUB_FEATURE_FLAGS: Record<string, boolean> = {
  // Card visibility
  card_dartup: true,
  card_wsw: true,
  card_pukhuk: true,
  card_cozy: true,
  card_patchwork: true,
  card_valerie: true,
  card_makerverse: true,
  // Widgets & systems
  widget_dartup: true,
  widget_chess: true,
  widget_ecosystem_log: true,
  showcase_launchpad: true,
  connected_services: true,
  guest_launch: true,
  arcade_deck: true,
};

/**
 * Normalizes flags from either an array of HubFeatureFlag records or a key-value record
 */
export function normalizeFeatureFlags(
  rawFlags?: Array<{ key: string; enabled: boolean; [key: string]: any }> | Record<string, boolean> | null
): Record<string, boolean> {
  const result: Record<string, boolean> = { ...DEFAULT_HUB_FEATURE_FLAGS };

  if (!rawFlags) return result;

  if (Array.isArray(rawFlags)) {
    for (const flag of rawFlags) {
      if (flag && typeof flag.key === 'string') {
        result[flag.key] = Boolean(flag.enabled);
      }
    }
  } else if (typeof rawFlags === 'object') {
    for (const [key, val] of Object.entries(rawFlags)) {
      result[key] = Boolean(val);
    }
  }

  return result;
}

/**
 * Check whether a specific feature flag or card visibility parameter is enabled.
 */
export function isFeatureEnabled(
  flags: HubFeatureFlag[] | Record<string, boolean> | undefined | null,
  key: string,
  fallback = true
): boolean {
  if (!flags) {
    return DEFAULT_HUB_FEATURE_FLAGS[key] ?? fallback;
  }

  if (Array.isArray(flags)) {
    const match = flags.find((f) => f.key === key);
    return match ? Boolean(match.enabled) : (DEFAULT_HUB_FEATURE_FLAGS[key] ?? fallback);
  }

  if (key in flags) {
    return Boolean(flags[key]);
  }

  return DEFAULT_HUB_FEATURE_FLAGS[key] ?? fallback;
}

/**
 * Filters the list of Launchpad ecosystem apps according to active feature flags.
 * Card keys follow the convention: card_<app.id>
 */
export function filterVisibleLaunchpadApps(
  apps: EcosystemApp[],
  flags: HubFeatureFlag[] | Record<string, boolean> | undefined | null
): EcosystemApp[] {
  if (!apps || !Array.isArray(apps)) return [];

  return apps.filter((app) => {
    const cardKey = `card_${app.id}`;
    return isFeatureEnabled(flags, cardKey, true);
  });
}
