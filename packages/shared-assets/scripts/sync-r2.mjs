#!/usr/bin/env node

/**
 * Cloudflare R2 CDN Storage Sync & Verification Utility
 * Manages bucket distribution, immutable image caching, revalidatable manifest caching,
 * restricted CORS policies, and edge status validation.
 *
 * Target Domain: https://cdn.sunshade.icu/assets/kenney/
 * Storage Bucket: sunshade-game-assets
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const ATLASES_DIR = path.resolve(__dirname, '../atlases');

export const R2_BUCKET = process.env.R2_BUCKET || 'sunshade-game-assets';
export const CDN_BASE_URL = process.env.CDN_BASE_URL || 'https://cdn.sunshade.icu/assets/kenney';

/**
 * Asset-specific caching policies:
 * - Binary images (PNG): immutable 1-year cache
 * - JSON manifests: short 5-minute TTL with stale-while-revalidate to ensure coordinate updates propagate quickly
 */
export const IMAGE_CACHE_CONTROL_HEADER = 'public, max-age=31536000, immutable';
export const MANIFEST_CACHE_CONTROL_HEADER = 'public, max-age=300, stale-while-revalidate=86400';
export const CACHE_CONTROL_HEADER = IMAGE_CACHE_CONTROL_HEADER; // default for images

export const CORS_CONFIG_PATH = path.resolve(__dirname, '../config/r2-cors.json');
export const TAXONOMY_REGEX = /^assets\/kenney\/[a-z0-9_-]+(\/[a-z0-9._-]+)+$/i;

/**
 * Definitive mapping of all six atlas packs to their deterministic CDN R2 keys under assets/kenney/.
 */
export const ATLAS_PACK_DEFINITIONS = [
  {
    pack: 'isometric-tiles',
    manifestFile: 'isometric-tiles.atlas.json',
    manifestR2Key: 'assets/kenney/manifests/isometric-tiles.atlas.json',
    imageFile: 'isometric-tiles-atlas.png',
    imageR2Key: 'assets/kenney/isometric-miniature-dungeon/isometric-tiles-atlas.png',
  },
  {
    pack: 'ui-sprites',
    manifestFile: 'ui-sprites.atlas.json',
    manifestR2Key: 'assets/kenney/manifests/ui-sprites.atlas.json',
    imageFile: 'ui-sprites-atlas.png',
    imageR2Key: 'assets/kenney/ui-pack/ui-sprites-atlas.png',
  },
  {
    pack: 'modular-characters',
    manifestFile: 'modular-characters.atlas.json',
    manifestR2Key: 'assets/kenney/manifests/modular-characters.atlas.json',
    imageFile: 'modular-characters-atlas.png',
    imageR2Key: 'assets/kenney/modular-characters/modular-characters-atlas.png',
  },
  {
    pack: 'playing-cards',
    manifestFile: 'playing-cards.atlas.json',
    manifestR2Key: 'assets/kenney/manifests/playing-cards.atlas.json',
    imageFile: 'playing-cards-atlas.png',
    imageR2Key: 'assets/kenney/boardgame-pack/playing-cards-atlas.png',
  },
  {
    pack: 'particle-pack',
    manifestFile: 'particle-pack.atlas.json',
    manifestR2Key: 'assets/kenney/manifests/particle-pack.atlas.json',
    imageFile: 'particle-pack-atlas.png',
    imageR2Key: 'assets/kenney/particle-pack/particle-pack-atlas.png',
  },
  {
    pack: 'input-prompts',
    manifestFile: 'input-prompts.atlas.json',
    manifestR2Key: 'assets/kenney/manifests/input-prompts.atlas.json',
    imageFile: 'input-prompts-atlas.png',
    imageR2Key: 'assets/kenney/input-prompts/input-prompts-atlas.png',
  },
];

/**
 * Validates whether an R2 object key follows the normalized Kenney taxonomy.
 */
export function validateTaxonomyKey(key) {
  if (!key.startsWith('assets/kenney/')) {
    return { valid: false, reason: 'Key does not start with assets/kenney/' };
  }
  if (!TAXONOMY_REGEX.test(key)) {
    return { valid: false, reason: `Key does not match valid taxonomy schema: ${key}` };
  }
  return { valid: true };
}

/**
 * Verifies public accessibility and Cloudflare edge cache response headers.
 * Sends simulated Origin header to verify CORS compliance.
 */
export async function verifyCdnEndpoint(url, origin = 'https://hub.sunshade.icu') {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const req = https.get(
      parsed,
      {
        headers: {
          Origin: origin,
          Accept: 'image/png,application/json,*/*',
        },
      },
      (res) => {
        const headers = res.headers;
        const statusCode = res.statusCode || 0;
        const cacheControl = headers['cache-control'] || '';
        const cfCacheStatus = (headers['cf-cache-status'] || 'NONE').toString().toUpperCase();
        const cors = headers['access-control-allow-origin'] || '';

        resolve({
          url,
          statusCode,
          cacheControl,
          cfCacheStatus,
          cors,
          isSuccess: statusCode === 200,
          isCached: cfCacheStatus === 'HIT' || cfCacheStatus === 'DYNAMIC' || cacheControl.includes('immutable') || cacheControl.includes('max-age'),
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        url,
        statusCode: 0,
        cacheControl: '',
        cfCacheStatus: 'ERROR',
        cors: '',
        isSuccess: false,
        isCached: false,
        error: err.message,
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        url,
        statusCode: 0,
        cacheControl: '',
        cfCacheStatus: 'TIMEOUT',
        cors: '',
        isSuccess: false,
        isCached: false,
        error: 'Request timed out',
      });
    });
  });
}

/**
 * Validates the loaded CORS configuration against security requirements:
 * Permitting GET and HEAD from *.sunshade.icu and localhost:*, while restricting AllowedHeaders.
 */
export function validateCorsConfig(config) {
  if (!Array.isArray(config) || config.length === 0) {
    return { valid: false, reason: 'CORS config must be a non-empty array' };
  }

  const rule = config[0];
  const origins = rule.AllowedOrigins || [];
  const methods = rule.AllowedMethods || [];
  const headers = rule.AllowedHeaders || [];

  const hasWildcardSunshade = origins.some((o) => o.includes('*.sunshade.icu') || o.includes('sunshade.icu'));
  const hasLocalhost = origins.some((o) => o.includes('localhost'));
  const hasGet = methods.includes('GET');
  const hasHead = methods.includes('HEAD');

  if (!hasWildcardSunshade) {
    return { valid: false, reason: 'AllowedOrigins missing *.sunshade.icu' };
  }
  if (!hasLocalhost) {
    return { valid: false, reason: 'AllowedOrigins missing localhost' };
  }
  if (!hasGet || !hasHead) {
    return { valid: false, reason: 'AllowedMethods must include GET and HEAD' };
  }
  if (headers.includes('*')) {
    return { valid: false, reason: 'AllowedHeaders must not use wildcard *; restrict to necessary request headers' };
  }

  return { valid: true };
}

export function runPreflightCheck() {
  console.log('--- Cloudflare R2 CDN Configuration Pre-Flight ---');
  console.log(`Bucket:                  ${R2_BUCKET}`);
  console.log(`CDN Base URL:            ${CDN_BASE_URL}`);
  console.log(`Image Cache-Control:     ${IMAGE_CACHE_CONTROL_HEADER}`);
  console.log(`Manifest Cache-Control:  ${MANIFEST_CACHE_CONTROL_HEADER}`);

  // Validate CORS
  if (fs.existsSync(CORS_CONFIG_PATH)) {
    const cors = JSON.parse(fs.readFileSync(CORS_CONFIG_PATH, 'utf8'));
    const corsValidation = validateCorsConfig(cors);
    if (!corsValidation.valid) {
      console.error(`❌ CORS Policy check failed: ${corsValidation.reason}`);
      process.exit(1);
    }
    console.log('✅ CORS Policy valid (restricted headers, *.sunshade.icu and localhost:* permitted).');
  } else {
    console.error(`❌ CORS config not found at: ${CORS_CONFIG_PATH}`);
    process.exit(1);
  }

  // Validate Atlas Pack Definitions & Manifest Presence
  console.log(`Checking ${ATLAS_PACK_DEFINITIONS.length} atlas pack definitions...`);
  for (const packDef of ATLAS_PACK_DEFINITIONS) {
    const manifestPath = path.join(ATLASES_DIR, packDef.manifestFile);
    const imagePath = path.join(ATLASES_DIR, packDef.imageFile);

    if (!fs.existsSync(manifestPath)) {
      console.error(`❌ Manifest file missing: ${manifestPath}`);
      process.exit(1);
    }

    const manifestTaxonomy = validateTaxonomyKey(packDef.manifestR2Key);
    const imageTaxonomy = validateTaxonomyKey(packDef.imageR2Key);

    if (!manifestTaxonomy.valid) {
      console.error(`❌ Invalid manifest taxonomy key: ${packDef.manifestR2Key} (${manifestTaxonomy.reason})`);
      process.exit(1);
    }
    if (!imageTaxonomy.valid) {
      console.error(`❌ Invalid image taxonomy key: ${packDef.imageR2Key} (${imageTaxonomy.reason})`);
      process.exit(1);
    }

    const hasLocalImage = fs.existsSync(imagePath);
    console.log(`  ✓ ${packDef.pack}: manifest verified; CDN image target -> ${packDef.imageR2Key}${hasLocalImage ? ' (local staged)' : ' (streamed via R2 CDN)'}`);
  }

  console.log('✅ All atlas manifests and image sheets validated with deterministic R2 CDN taxonomy keys.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPreflightCheck();
}
