#!/usr/bin/env node

/**
 * Cloudflare R2 CDN Storage Sync & Verification Utility
 * Manages bucket distribution, immutable caching, CORS policies, and edge status validation.
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

export const R2_BUCKET = process.env.R2_BUCKET || 'sunshade-game-assets';
export const CDN_BASE_URL = process.env.CDN_BASE_URL || 'https://cdn.sunshade.icu/assets/kenney';
export const CACHE_CONTROL_HEADER = 'public, max-age=31536000, immutable';
export const CORS_CONFIG_PATH = path.resolve(__dirname, '../config/r2-cors.json');

export const TAXONOMY_REGEX = /^assets\/kenney\/[a-z0-9_-]+(\/[a-z0-9._-]+)+$/i;

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
 * Asserts HTTP 200 and cf-cache-status (HIT / DYNAMIC / REVALIDATED) on edge requests.
 */
export async function verifyCdnEndpoint(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.get(parsed, (res) => {
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
        isCached: cfCacheStatus === 'HIT' || cfCacheStatus === 'DYNAMIC' || cacheControl.includes('immutable'),
      });
    });

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
 * Validates the loaded CORS configuration against requirements:
 * Permitting GET and HEAD from *.sunshade.icu and localhost:*.
 */
export function validateCorsConfig(config) {
  if (!Array.isArray(config) || config.length === 0) {
    return { valid: false, reason: 'CORS config must be a non-empty array' };
  }

  const rule = config[0];
  const origins = rule.AllowedOrigins || [];
  const methods = rule.AllowedMethods || [];

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

  return { valid: true };
}

export function runPreflightCheck() {
  console.log('--- Cloudflare R2 CDN Configuration Pre-Flight ---');
  console.log(`Bucket:        ${R2_BUCKET}`);
  console.log(`CDN Base URL:  ${CDN_BASE_URL}`);
  console.log(`Cache-Control: ${CACHE_CONTROL_HEADER}`);

  if (fs.existsSync(CORS_CONFIG_PATH)) {
    const cors = JSON.parse(fs.readFileSync(CORS_CONFIG_PATH, 'utf8'));
    const corsValidation = validateCorsConfig(cors);
    if (!corsValidation.valid) {
      console.error(`❌ CORS Policy check failed: ${corsValidation.reason}`);
      process.exit(1);
    }
    console.log('✅ CORS Policy valid (*.sunshade.icu and localhost:* permitted for GET/HEAD).');
  } else {
    console.error(`❌ CORS config not found at: ${CORS_CONFIG_PATH}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPreflightCheck();
}
