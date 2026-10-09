import type { AtlasManifest, AtlasFrame, AtlasFrameLookupResult } from './types.js';

export const CDN_BASE_URL = 'https://cdn.sunshade.icu/assets/kenney';

/**
 * Resolves the full CDN URL for a given atlas pack or individual asset.
 */
export function resolveCdnUrl(pack: string, fileName?: string): string {
  const normalizedPack = pack.replace(/^\/+|\/+$/g, '');
  if (!fileName) {
    return `${CDN_BASE_URL}/${normalizedPack}`;
  }
  return `${CDN_BASE_URL}/${normalizedPack}/${fileName.replace(/^\/+/, '')}`;
}

/**
 * Extracts a specific frame by ID from a given AtlasManifest.
 */
export function getAtlasFrame(manifest: AtlasManifest, frameId: string): AtlasFrameLookupResult | null {
  if (!manifest || !manifest.frames || !manifest.frames[frameId]) {
    return null;
  }

  const frame = manifest.frames[frameId];
  return {
    pack: manifest.meta.pack,
    frameId,
    cdnUrl: manifest.meta.image,
    frame,
  };
}

/**
 * Formats Flame-compatible sprite options from an AtlasFrame.
 * Flame Engine SpriteAnimation / SpriteComponent requires:
 * srcPosition: Vector2(frame.x, frame.y)
 * srcSize: Vector2(frame.w, frame.h)
 * anchor: Anchor(ax, ay)
 */
export function toFlameSpriteDefinition(frame: AtlasFrame) {
  return {
    srcPosition: [frame.frame.x, frame.frame.y] as [number, number],
    srcSize: [frame.frame.w, frame.frame.h] as [number, number],
    anchor: frame.anchor ? [frame.anchor.ax, frame.anchor.ay] as [number, number] : [0.5, 0.5] as [number, number],
    trimmed: frame.trimmed,
  };
}
