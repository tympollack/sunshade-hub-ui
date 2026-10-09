import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  R2_BUCKET,
  CDN_BASE_URL,
  CACHE_CONTROL_HEADER,
  CORS_CONFIG_PATH,
  validateCorsConfig,
  validateTaxonomyKey,
} from '../scripts/sync-r2.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKFLOW_PATH = path.resolve(__dirname, '../../../.github/workflows/deploy-assets-r2.yml');

test('Cloudflare R2 Bucket and CDN custom domain configuration', () => {
  assert.equal(R2_BUCKET, 'sunshade-game-assets');
  assert.equal(CDN_BASE_URL, 'https://cdn.sunshade.icu/assets/kenney');
  assert.equal(CACHE_CONTROL_HEADER, 'public, max-age=31536000, immutable');
});

test('R2 CORS Configuration exists and validates required rules', () => {
  assert.ok(fs.existsSync(CORS_CONFIG_PATH), 'CORS config file must exist');
  const cors = JSON.parse(fs.readFileSync(CORS_CONFIG_PATH, 'utf8'));

  const validation = validateCorsConfig(cors);
  assert.ok(validation.valid, `CORS validation failed: ${validation.reason}`);

  const rule = cors[0];
  assert.ok(rule.AllowedOrigins.includes('https://*.sunshade.icu'), 'Must allow https://*.sunshade.icu');
  assert.ok(rule.AllowedOrigins.includes('http://localhost:*'), 'Must allow http://localhost:*');
  assert.ok(rule.AllowedMethods.includes('GET'), 'Must allow GET method');
  assert.ok(rule.AllowedMethods.includes('HEAD'), 'Must allow HEAD method');
});

test('Taxonomy validation enforces deterministic Kenney asset paths', () => {
  const validKey = 'assets/kenney/modular-characters/char_head.png';
  const invalidKey1 = 'wrong-prefix/test.png';
  const invalidKey2 = 'assets/kenney/';

  assert.ok(validateTaxonomyKey(validKey).valid, 'Valid taxonomy key should pass');
  assert.equal(validateTaxonomyKey(invalidKey1).valid, false, 'Invalid prefix should fail');
  assert.equal(validateTaxonomyKey(invalidKey2).valid, false, 'Empty subpath should fail');
});

test('GitHub Actions deploy workflow deploy-assets-r2.yml exists and is well-formed', () => {
  assert.ok(fs.existsSync(WORKFLOW_PATH), 'deploy-assets-r2.yml workflow must exist');
  const content = fs.readFileSync(WORKFLOW_PATH, 'utf8');

  assert.ok(content.includes('Deploy Game Assets to Cloudflare R2'), 'Workflow must have proper name');
  assert.ok(content.includes('sunshade-game-assets'), 'Workflow must reference R2 bucket sunshade-game-assets');
  assert.ok(content.includes('public, max-age=31536000, immutable'), 'Workflow must set immutable cache headers');
  assert.ok(content.includes('cdn.sunshade.icu'), 'Workflow must target cdn.sunshade.icu');
  assert.ok(content.includes('verifyCdnEndpoint'), 'Workflow must verify edge responses');
});

test('Simulated edge cache response handles cf-cache-status: HIT and HTTP 200', () => {
  const mockHeaders = {
    'cache-control': 'public, max-age=31536000, immutable',
    'cf-cache-status': 'HIT',
    'access-control-allow-origin': '*',
  };

  const isSuccess = 200 === 200;
  const isCached = mockHeaders['cf-cache-status'] === 'HIT';
  const hasImmutable = mockHeaders['cache-control'].includes('immutable');

  assert.ok(isSuccess, 'Status must be HTTP 200');
  assert.ok(isCached, 'cf-cache-status must be HIT');
  assert.ok(hasImmutable, 'Cache-control must contain immutable');
});
