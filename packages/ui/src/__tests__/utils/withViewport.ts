/**
 * Viewport matrix testing utilities for @sunshade/ui
 * Simulates mobile viewport constraints across device tiers.
 */

export interface ViewportPreset {
  name: string;
  width: number;
  height: number;
}

export const VIEWPORT_PRESETS = {
  compact: { name: 'compact (320x568)', width: 320, height: 568 },
  standard: { name: 'standard (390x844)', width: 390, height: 844 },
  wide: { name: 'wide (412x915)', width: 412, height: 915 },
} as const;

export type ViewportKey = keyof typeof VIEWPORT_PRESETS;

export function getViewportPreset(key: ViewportKey): ViewportPreset {
  return VIEWPORT_PRESETS[key];
}

/**
 * Returns style constraints for container simulation
 */
export function getViewportContainerStyle(preset: ViewportPreset) {
  return {
    width: preset.width,
    maxWidth: preset.width,
    overflow: 'hidden' as const,
    boxSizing: 'border-box' as const,
  };
}
