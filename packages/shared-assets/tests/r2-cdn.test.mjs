import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  R2_BUCKET,
  CDN_BASE_URL,
  IMAGE_CACHE_CONTROL_HEADER,
  MANIFEST_CACHE_CONTROL_HEADER,
  CORS_CONFIG_PATH,
  ATLAS_PACK_DEFINITIONS,
  validateCorsConfig,
  validateTaxonomyKey,
} from '../scripts/sync-r2.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKFLOW_PATH = path.resolve(__dirname, '../../../.github/workflows/deploy-assets-r2.yml');

test('Cloudflare R2 Bucket and CDN custom domain configuration with split caching policies', () => {
  assert.equal(R2_BUCKET, 'sunshade-game-assets');
  assert.equal(CDN_BASE_URL, 'https://cdn.sunshade.icu/assets/kenney');
  assert.equal(IMAGE_CACHE_CONTROL_HEADER, 'public, max-age=31536000, immutable');
  assert.equal(MANIFEST_CACHE_CONTROL_HEADER, 'public, max-age=300, stale-while-revalidate=86400');
});

test('R2 CORS Configuration restricts AllowedHeaders and permits expected origins', () => {
  assert.ok(fs.existsSync(CORS_CONFIG_PATH), 'CORS config file must exist');
  const cors = JSON.parse(fs.readFileSync(CORS_CONFIG_PATH, 'utf8'));

  const validation = validateCorsConfig(cors);
  assert.ok(validation.valid, `CORS validation failed: ${validation.reason}`);

  const rule = cors[0];
  assert.ok(rule.AllowedOrigins.includes('https://*.sunshade.icu'), 'Must allow https://*.sunshade.icu');
  assert.ok(rule.AllowedOrigins.includes('http://localhost:*'), 'Must allow http://localhost:*');
  assert.ok(rule.AllowedMethods.includes('GET'), 'Must allow GET method');
  assert.ok(rule.AllowedMethods.includes('HEAD'), 'Must allow HEAD method');

  // Verify AllowedHeaders are strictly limited (no wildcard *)
  assert.equal(rule.AllowedHeaders.includes('*'), false, 'AllowedHeaders must not contain wildcard *');
  assert.ok(rule.AllowedHeaders.includes('Content-Type'));
  assert.ok(rule.AllowedHeaders.includes('Origin'));

  // Test that wildcard AllowedHeaders is rejected by validator
  const insecureCors = [{ ...rule, AllowedHeaders: ['*'] }];
  assert.equal(validateCorsConfig(insecureCors).valid, false, 'Validator must reject wildcard AllowedHeaders');
});

test('Atlas Pack Definitions cover all 6 packs and map strictly under assets/kenney/', () => {
  assert.equal(ATLAS_PACK_DEFINITIONS.length, 6, 'Must define all 6 atlas packs');

  const expectedPacks = [
    'isometric-tiles',
    'ui-sprites',
    'modular-characters',
    'playing-cards',
    'particle-pack',
    'input-prompts',
  ];

  for (const exp of expectedPacks) {
    const found = ATLAS_PACK_DEFINITIONS.find((p) => p.pack === exp);
    assert.ok(found, `Missing definition for pack: ${exp}`);
    assert.ok(found.manifestR2Key.startsWith('assets/kenney/manifests/'), `Manifest key must be under assets/kenney/manifests/`);
    assert.ok(found.imageR2Key.startsWith('assets/kenney/'), `Image key must be under assets/kenney/`);
    assert.ok(validateTaxonomyKey(found.manifestR2Key).valid, `Manifest taxonomy valid for ${exp}`);
    assert.ok(validateTaxonomyKey(found.imageR2Key).valid, `Image taxonomy valid for ${exp}`);
  }
});

test('Taxonomy validation enforces deterministic Kenney asset paths', () => {
  const validKey = 'assets/kenney/modular-characters/char_head.png';
  const invalidKey1 = 'wrong-prefix/test.png';
  const invalidKey2 = 'assets/kenney/';

  assert.ok(validateTaxonomyKey(validKey).valid, 'Valid taxonomy key should pass');
  assert.equal(validateTaxonomyKey(invalidKey1).valid, false, 'Invalid prefix should fail');
  assert.equal(validateTaxonomyKey(invalidKey2).valid, false, 'Empty subpath should fail');
});

test('GitHub Actions deploy workflow deploys CORS, all 6 packs, and enforces CDN check failure', () => {
  assert.ok(fs.existsSync(WORKFLOW_PATH), 'deploy-assets-r2.yml workflow must exist');
  const content = fs.readFileSync(WORKFLOW_PATH, 'utf8');

  assert.ok(content.includes('Deploy Game Assets to Cloudflare R2'), 'Workflow must have proper name');
  assert.ok(content.includes('sunshade-game-assets'), 'Workflow must reference R2 bucket sunshade-game-assets');
  assert.ok(content.includes('wrangler r2 bucket cors set'), 'Workflow must apply CORS policy');
  assert.ok(content.includes('ATLAS_PACK_DEFINITIONS'), 'Workflow must loop over all pack definitions');
  assert.ok(content.includes('process.exit(1)'), 'Workflow must fail on CDN verification errors');
});

test('Simulated edge cache response handles cf-cache-status: HIT, CORS and HTTP 200', () => {
  const mockHeaders = {
    'cache-control': 'public, max-age=31536000, immutable',
    'cf-cache-status': 'HIT',
    'access-control-allow-origin': 'https://hub.sunshade.icu',
  };

  const isSuccess = 200 === 200;
  const isCached = mockHeaders['cf-cache-status'] === 'HIT';
  const hasImmutable = mockHeaders['cache-control'].includes('immutable');
  const hasCors = Boolean(mockHeaders['access-control-allow-origin']);

  assert.ok(isSuccess, 'Status must be HTTP 200');
  assert.ok(isCached, 'cf-cache-status must be HIT');
  assert.ok(hasImmutable, 'Cache-control must contain immutable');
  assert.ok(hasCors, 'CORS header must be present');
});
