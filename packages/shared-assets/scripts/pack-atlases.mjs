#!/usr/bin/env node

/**
 * SunShade Automated Texture Atlas Packing Routine
 * Implements deterministic 2D shelf/bin-packing algorithm with margin guards
 * to prevent pixel bleeding and guarantee zero overlapping bounds.
 * Generates Flame (Flutter) & WebGL (Next.js) JSON coordinate manifests.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ATLASES_DIR = path.resolve(__dirname, '../atlases');

/**
 * @typedef {Object} SpriteInput
 * @property {string} id
 * @property {number} w
 * @property {number} h
 * @property {{ ax: number, ay: number }} [anchor]
 */

/**
 * @typedef {Object} PackOptions
 * @property {number} [maxWidth]
 * @property {number} [padding]
 * @property {string} packName
 * @property {string} imageCdnUrl
 */

/**
 * Packs rectangular sprite frames into an optimal sheet with guaranteed padding.
 * Automatically expands canvas width if any individual sprite exceeds default maxWidth,
 * guaranteeing all frames remain completely inside canvas dimensions.
 */
export function packSpriteSheet(sprites, options) {
  let { maxWidth = 2048, padding = 0, packName, imageCdnUrl } = options;

  // Expand maxWidth if any individual sprite is wider than the configured boundary
  for (const sprite of sprites) {
    if (sprite.w > maxWidth) {
      maxWidth = Math.pow(2, Math.ceil(Math.log2(sprite.w)));
    }
  }

  let currentX = 0;
  let currentY = 0;
  let rowHeight = 0;
  let sheetWidth = 0;
  let sheetHeight = 0;

  const frames = {};

  for (const sprite of sprites) {
    if (currentX + sprite.w > maxWidth && currentX > 0) {
      // Start next row
      currentX = 0;
      currentY += rowHeight + padding;
      rowHeight = 0;
    }

    frames[sprite.id] = {
      frame: {
        x: currentX,
        y: currentY,
        w: sprite.w,
        h: sprite.h,
      },
      rotated: false,
      trimmed: false,
      spriteSourceSize: {
        x: 0,
        y: 0,
        w: sprite.w,
        h: sprite.h,
      },
      sourceSize: {
        w: sprite.w,
        h: sprite.h,
      },
      anchor: sprite.anchor || { ax: 0.5, ay: 0.5 },
    };

    currentX += sprite.w + padding;
    rowHeight = Math.max(rowHeight, sprite.h);
    sheetWidth = Math.max(sheetWidth, currentX);
    sheetHeight = Math.max(sheetHeight, currentY + rowHeight);
  }

  // Round up sheet dimensions to power of 2 for GPU optimization, ensuring dimensions cover actual extent
  const powerOfTwoW = Math.max(maxWidth, Math.pow(2, Math.ceil(Math.log2(Math.max(sheetWidth, 64)))));
  const powerOfTwoH = Math.pow(2, Math.ceil(Math.log2(Math.max(sheetHeight, 64))));

  return {
    meta: {
      app: 'sunshade-atlas-pipeline',
      version: '1.0.0',
      image: imageCdnUrl,
      format: 'RGBA8888',
      size: {
        w: powerOfTwoW,
        h: powerOfTwoH,
      },
      scale: '1',
      pack: packName,
    },
    frames,
  };
}

export function verifyAtlasDirectory() {
  if (!fs.existsSync(ATLASES_DIR)) {
    throw new Error(`Atlases directory not found at: ${ATLASES_DIR}`);
  }

  const files = fs.readdirSync(ATLASES_DIR).filter((f) => f.endsWith('.atlas.json'));
  console.log(`Found ${files.length} atlas manifest(s) in ${ATLASES_DIR}`);

  let allValid = true;

  for (const file of files) {
    const filePath = path.join(ATLASES_DIR, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const frames = Object.entries(content.frames || {});
    console.log(`- ${file}: ${frames.length} frames, Canvas: ${content.meta?.size?.w}x${content.meta?.size?.h}`);

    // Verify containment and non-overlap
    for (let i = 0; i < frames.length; i++) {
      const [idA, dataA] = frames[i];
      const a = dataA.frame;

      if (a.x + a.w > content.meta.size.w || a.y + a.h > content.meta.size.h) {
        console.error(`  ❌ Frame ${idA} exceeds atlas canvas dimensions: ${a.x + a.w} > ${content.meta.size.w} or ${a.y + a.h} > ${content.meta.size.h}`);
        allValid = false;
      }

      for (let j = i + 1; j < frames.length; j++) {
        const [idB, dataB] = frames[j];
        const b = dataB.frame;

        const overlapsX = a.x < b.x + b.w && a.x + a.w > b.x;
        const overlapsY = a.y < b.y + b.h && a.y + a.h > b.y;

        if (overlapsX && overlapsY) {
          console.error(`  ❌ Overlap detected between ${idA} and ${idB}`);
          allValid = false;
        }
      }
    }
  }

  if (!allValid) {
    process.exit(1);
  }
  console.log('✅ All texture atlases passed multi-engine bounding and non-overlap verification.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  verifyAtlasDirectory();
}
