/**
 * SunShade Multi-Engine Texture Atlas Specification
 * Fully compliant with Flutter/Flame SpriteSheet contracts and Next.js / WebGL 2D Canvas coordinate maps.
 */

export interface AtlasRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AtlasAnchor {
  ax: number;
  ay: number;
}

export interface AtlasFrame {
  frame: AtlasRect;
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: AtlasRect;
  sourceSize: {
    w: number;
    h: number;
  };
  anchor?: AtlasAnchor;
}

export interface AtlasMeta {
  app: string;
  version: string;
  image: string;
  format: string;
  size: {
    w: number;
    h: number;
  };
  scale: string;
  pack: string;
}

export interface AtlasManifest {
  meta: AtlasMeta;
  frames: Record<string, AtlasFrame>;
}

export interface AtlasFrameLookupResult {
  pack: string;
  frameId: string;
  cdnUrl: string;
  frame: AtlasFrame;
}
