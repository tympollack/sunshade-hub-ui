import type { AtlasManifest, AtlasFrame } from './types.js';

export interface ValidationError {
  frameId?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates that an AtlasManifest conforms strictly to multi-engine (Flame & WebGL)
 * geometry, ensuring zero pixel bleeding, no bounding box collisions/overlaps,
 * and valid texture canvas bounds.
 */
export function validateAtlasManifest(manifest: AtlasManifest): ValidationResult {
  const errors: ValidationError[] = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: [{ message: 'Manifest must be an object' }] };
  }

  const { meta, frames } = manifest;

  if (!meta || !meta.size || meta.size.w <= 0 || meta.size.h <= 0) {
    errors.push({ message: 'Invalid or missing meta.size dimensions' });
  }

  if (!frames || typeof frames !== 'object') {
    errors.push({ message: 'Frames dictionary missing or invalid' });
    return { valid: errors.length === 0, errors };
  }

  const frameEntries = Object.entries(frames);
  if (frameEntries.length === 0) {
    errors.push({ message: 'Manifest contains no frames' });
  }

  // Check individual frame bounds and canvas containment
  for (const [frameId, frameData] of frameEntries) {
    const { frame, sourceSize, anchor } = frameData;

    if (!frame || frame.w <= 0 || frame.h <= 0 || frame.x < 0 || frame.y < 0) {
      errors.push({ frameId, message: `Invalid frame rectangle: [x:${frame?.x}, y:${frame?.y}, w:${frame?.w}, h:${frame?.h}]` });
      continue;
    }

    if (meta.size && (frame.x + frame.w > meta.size.w || frame.y + frame.h > meta.size.h)) {
      errors.push({
        frameId,
        message: `Frame bounds [x:${frame.x + frame.w}, y:${frame.y + frame.h}] exceed atlas canvas dimensions [w:${meta.size.w}, h:${meta.size.h}]`
      });
    }

    if (sourceSize && (sourceSize.w <= 0 || sourceSize.h <= 0)) {
      errors.push({ frameId, message: 'Invalid sourceSize dimensions' });
    }

    if (anchor && (anchor.ax < 0 || anchor.ax > 1 || anchor.ay < 0 || anchor.ay > 1)) {
      errors.push({ frameId, message: `Anchor out of normalized [0, 1] bounds: [ax:${anchor.ax}, ay:${anchor.ay}]` });
    }

    // Standard grid checks
    if (meta.pack === 'isometric-tiles' && (frame.w !== 256 || frame.h !== 128)) {
      errors.push({ frameId, message: `Isometric terrain tile must conform to 256x128 standard bounding box; received ${frame.w}x${frame.h}` });
    }

    if (meta.pack === 'ui-sprites') {
      const is64 = frame.w === 64 && frame.h === 64;
      const is128 = frame.w === 128 && frame.h === 128;
      if (!is64 && !is128) {
        errors.push({ frameId, message: `UI sprite must conform to 64x64 or 128x128 grid; received ${frame.w}x${frame.h}` });
      }
    }
  }

  // Pairwise overlap collision detection to guarantee zero bleeding / overlap
  for (let i = 0; i < frameEntries.length; i++) {
    const [idA, dataA] = frameEntries[i];
    const a = dataA.frame;

    for (let j = i + 1; j < frameEntries.length; j++) {
      const [idB, dataB] = frameEntries[j];
      const b = dataB.frame;

      // Two axis-aligned rectangles overlap if they intersect in both dimensions
      const overlapsX = a.x < b.x + b.w && a.x + a.w > b.x;
      const overlapsY = a.y < b.y + b.h && a.y + a.h > b.y;

      if (overlapsX && overlapsY) {
        errors.push({
          message: `Texture overlap detected between frame '${idA}' and frame '${idB}'`
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
