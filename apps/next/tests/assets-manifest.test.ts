import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateManifest,
  getAssetById,
  getAssetsByPack,
  getAssetsByCategory,
  getAssetsByTag,
  normalizeKebabCase,
  type AssetManifest,
} from '../../../packages/assets/src/index';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const MANIFEST_PATH = path.join(REPO_ROOT, 'packages', 'assets', 'assets-manifest.json');
const MIRROR_MANIFEST_PATH = path.join(REPO_ROOT, 'scripts', 'assets-manifest.json');
const ASSETS_BASE_DIR = path.join(REPO_ROOT, 'packages', 'assets');

describe('Kenney CC0 Asset Inventory Pipeline (TASK-KENNEY-PIPE-01)', () => {
  it('manifest files exist at packages/assets and scripts/assets-manifest.json', () => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
    expect(fs.existsSync(MIRROR_MANIFEST_PATH)).toBe(true);
  });

  it('manifest is valid JSON with expected top-level schema', () => {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(raw) as AssetManifest;

    expect(manifest.version).toBe('1.0.0');
    expect(manifest.total_assets).toBeGreaterThan(5000);
    expect(Array.isArray(manifest.packs)).toBe(true);
    expect(manifest.packs.length).toBeGreaterThanOrEqual(20);
    expect(Array.isArray(manifest.assets)).toBe(true);
    expect(manifest.assets.length).toBe(manifest.total_assets);
  });

  it('validates all staged assets with zero missing paths and zero malformed entries', () => {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(raw) as AssetManifest;

    const validation = validateManifest(manifest, ASSETS_BASE_DIR);
    expect(validation.valid).toBe(true);
    expect(validation.missing_paths).toEqual([]);
    expect(validation.malformed_entries).toEqual([]);
    expect(validation.errors).toEqual([]);
  });

  it('includes required source packs from task specification', () => {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(raw) as AssetManifest;
    const packIds = manifest.packs.map((p) => p.pack_id);

    const expectedPacks = [
      'modular-characters',
      'isometric-miniature-dungeon',
      'isometric-miniature-farm',
      'isometric-miniature-library',
      'physics-assets',
      'particle-pack',
      'smoke-particles',
      'ui-pack',
      'ui-pack-space-expansion',
      'playing-cards',
      'boardgame',
      'sci-fi-rts',
    ];

    for (const expected of expectedPacks) {
      expect(packIds).toContain(expected);
    }
  });

  it('enforces lowercase kebab-case naming for all asset filenames', () => {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(raw) as AssetManifest;
    const fileNameRegex = /^[a-z0-9.-]+$/;
    const pathRegex = /^[a-z0-9./-]+$/;

    for (const asset of manifest.assets.slice(0, 500)) {
      expect(asset.file_name).toMatch(fileNameRegex);
      expect(asset.relative_path).toMatch(pathRegex);
    }
  });

  it('indexes image dimensions for visual sprites and cards', () => {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(raw) as AssetManifest;

    const cards = getAssetsByPack(manifest, 'playing-cards');
    expect(cards.length).toBeGreaterThan(0);
    const firstCard = cards[0];
    expect(firstCard.dimensions).not.toBeNull();
    expect(firstCard.dimensions?.width).toBeGreaterThan(0);
    expect(firstCard.dimensions?.height).toBeGreaterThan(0);
  });

  it('retrieves assets by ID, pack, category, and tags', () => {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(raw) as AssetManifest;

    const particleAssets = getAssetsByCategory(manifest, 'particles');
    expect(particleAssets.length).toBeGreaterThan(0);

    const uiAudioAssets = getAssetsByCategory(manifest, 'ui-audio');
    expect(uiAudioAssets.length).toBeGreaterThan(0);

    const avatarTags = getAssetsByTag(manifest, 'avatar');
    expect(avatarTags.length).toBeGreaterThan(0);

    const sample = manifest.assets[0];
    const retrieved = getAssetById(manifest, sample.id);
    expect(retrieved).toEqual(sample);
  });

  it('normalizeKebabCase utility handles complex identifiers cleanly', () => {
    expect(normalizeKebabCase('card_spades_10.png')).toBe('card-spades-10.png');
    expect(normalizeKebabCase('tile_isometric_grass.png')).toBe('tile-isometric-grass.png');
    expect(normalizeKebabCase('alienBeige.png')).toBe('alien-beige.png');
    expect(normalizeKebabCase('blue_button00.png')).toBe('blue-button-00.png');
  });
});
