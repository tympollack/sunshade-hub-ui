#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate node_modules for image-size
const hubRootDir = path.resolve(__dirname, '../../..');
const require = createRequire(path.join(hubRootDir, 'node_modules'));
let sizeOf;
try {
  sizeOf = require('image-size');
} catch (err) {
  console.warn('⚠️ image-size module not found directly, falling back to dummy reader');
  sizeOf = () => null;
}

// Configurable source and target directories
const SOURCE_DIR =
  process.env.KENNEY_ASSETS_DIR ||
  (fs.existsSync('C:\\Users\\Tymz\\dev\\downloaded_assets\\kenney.nl')
    ? 'C:\\Users\\Tymz\\dev\\downloaded_assets\\kenney.nl'
    : path.resolve(hubRootDir, '../../downloaded_assets/kenney.nl'));

const PKG_ASSETS_DIR = path.resolve(__dirname, '..');
const TARGET_RAW_DIR = path.join(PKG_ASSETS_DIR, 'raw');
const MANIFEST_PATH = path.join(PKG_ASSETS_DIR, 'assets-manifest.json');
const ROOT_MANIFEST_PATH = path.join(hubRootDir, 'scripts', 'assets-manifest.json');

const VALID_EXTS = new Set([
  '.png',
  '.svg',
  '.jpg',
  '.jpeg',
  '.ogg',
  '.wav',
  '.mp3',
  '.glb',
  '.obj',
  '.mtl',
  '.fbx',
  '.ttf',
  '.xml',
]);

const MIME_MAP = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.glb': 'model/gltf-binary',
  '.obj': 'model/obj',
  '.mtl': 'model/mtl',
  '.fbx': 'application/octet-stream',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml',
};

const PACK_DEFINITIONS = [
  {
    src: 'kenney_modular-characters',
    pack_id: 'modular-characters',
    name: 'Kenney Modular Characters',
    category: 'characters',
    tags: ['modular', 'character', 'avatar', 'body', 'customization'],
  },
  {
    src: 'kenney_isometric-miniature-dungeon',
    pack_id: 'isometric-miniature-dungeon',
    name: 'Kenney Isometric Miniature Dungeon',
    category: 'isometric',
    tags: ['isometric', 'dungeon', 'environment', 'tiles', 'terrain'],
  },
  {
    src: 'kenney_isometric-miniature-farm',
    pack_id: 'isometric-miniature-farm',
    name: 'Kenney Isometric Miniature Farm',
    category: 'isometric',
    tags: ['isometric', 'farm', 'landscape', 'outdoor', 'tiles'],
  },
  {
    src: 'kenney_isometric-miniature-library',
    pack_id: 'isometric-miniature-library',
    name: 'Kenney Isometric Miniature Library',
    category: 'furniture',
    tags: ['isometric', 'library', 'furniture', 'interior', 'props'],
  },
  {
    src: 'kenney_mini-dungeon',
    pack_id: 'mini-dungeon',
    name: 'Kenney Mini Dungeon',
    category: 'dungeon',
    tags: ['3d', 'models', 'dungeon', 'low-poly'],
  },
  {
    src: 'kenney_modular-dungeon-kit_1.0',
    pack_id: 'modular-dungeon-kit',
    name: 'Kenney Modular Dungeon Kit',
    category: 'dungeon',
    tags: ['3d', 'models', 'dungeon-kit', 'modular'],
  },
  {
    src: 'kenney_physics-assets',
    pack_id: 'physics-assets',
    name: 'Kenney Physics Assets',
    category: 'physics',
    tags: ['physics', '2d', 'elements', 'blocks', 'obstacles'],
  },
  {
    src: 'kenney_particle-pack',
    pack_id: 'particle-pack',
    name: 'Kenney Particle Pack',
    category: 'particles',
    tags: ['particle', 'fx', 'burst', 'smoke', 'fire', 'visual-effects'],
  },
  {
    src: 'kenney_smoke-particles',
    pack_id: 'smoke-particles',
    name: 'Kenney Smoke Particles',
    category: 'particles',
    tags: ['particle', 'smoke', 'puff', 'dust', 'cloud'],
  },
  {
    src: 'kenney_ui-pack',
    pack_id: 'ui-pack',
    name: 'Kenney UI Pack',
    category: 'ui',
    tags: ['ui', 'buttons', 'icons', 'bars', 'controls', 'interface'],
  },
  {
    src: 'kenney_ui-pack-space-expansion',
    pack_id: 'ui-pack-space-expansion',
    name: 'Kenney UI Pack Space Expansion',
    category: 'ui',
    tags: ['ui', 'sci-fi', 'space', 'hud', 'futuristic'],
  },
  {
    src: 'kenney_fantasy-ui-borders',
    pack_id: 'fantasy-ui-borders',
    name: 'Kenney Fantasy UI Borders',
    category: 'ui',
    tags: ['ui', 'borders', 'frames', 'fantasy', 'ornate'],
  },
  {
    src: 'kenney_foliage-sprites',
    pack_id: 'foliage-sprites',
    name: 'Kenney Foliage Sprites',
    category: 'environment',
    tags: ['foliage', 'nature', 'trees', 'plants', 'sprites'],
  },
  {
    src: 'kenney_pattern-pack',
    pack_id: 'pattern-pack',
    name: 'Kenney Pattern Pack',
    category: 'textures',
    tags: ['pattern', 'seamless', 'texture', 'background'],
  },
  {
    src: 'kenney_pattern-pack-extra',
    pack_id: 'pattern-pack-extra',
    name: 'Kenney Pattern Pack Extra',
    category: 'textures',
    tags: ['pattern', 'extra', 'seamless', 'texture'],
  },
  {
    src: 'kenney_pattern-pack-lines',
    pack_id: 'pattern-pack-lines',
    name: 'Kenney Pattern Pack Lines',
    category: 'textures',
    tags: ['pattern', 'lines', 'geometric', 'texture'],
  },
  {
    src: 'kenney_pattern-pack-pixel',
    pack_id: 'pattern-pack-pixel',
    name: 'Kenney Pattern Pack Pixel',
    category: 'textures',
    tags: ['pattern', 'pixel', 'retro', 'tiles'],
  },
  {
    src: 'kenney_prototype-textures',
    pack_id: 'prototype-textures',
    name: 'Kenney Prototype Textures',
    category: 'textures',
    tags: ['prototype', 'grid', 'dev', 'greybox', 'levels'],
  },
  {
    src: 'kenney_retro-textures-fantasy',
    pack_id: 'retro-textures-fantasy',
    name: 'Kenney Retro Textures Fantasy',
    category: 'textures',
    tags: ['retro', 'fantasy', 'surfaces', 'pixel-art'],
  },
  {
    src: 'kenney_road-textures',
    pack_id: 'road-textures',
    name: 'Kenney Road Textures',
    category: 'textures',
    tags: ['roads', 'asphalt', 'traffic', 'urban', 'ground'],
  },
  {
    src: 'kenney_skyboxes',
    pack_id: 'skyboxes',
    name: 'Kenney Skyboxes',
    category: 'environment',
    tags: ['skybox', 'sky', 'environment', 'day', 'night', 'background'],
  },
  {
    src: 'kenney_skyboxes-space',
    pack_id: 'skyboxes-space',
    name: 'Kenney Skyboxes Space',
    category: 'environment',
    tags: ['skybox', 'space', 'nebula', 'galaxy', 'sci-fi'],
  },
  {
    src: 'kenney_development-essentials',
    pack_id: 'development-essentials',
    name: 'Kenney Development Essentials',
    category: 'development',
    tags: ['dev', 'normals', 'noise', 'uv', 'pixels', 'gradients'],
  },
  {
    src: 'kenney_construct-game-sources',
    pack_id: 'construct-game-sources',
    name: 'Kenney Construct Game Sources',
    category: 'game-sources',
    tags: ['construct', 'sources', 'templates'],
  },
];

export function normalizeKebabCase(name) {
  const dotIndex = name.lastIndexOf('.');
  const hasExt = dotIndex > 0;
  const base = hasExt ? name.slice(0, dotIndex) : name;
  const ext = hasExt ? name.slice(dotIndex).toLowerCase() : '';

  const normalizedBase = base
    .replace(/×/g, 'x')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9]+)/g, '$1-$2')
    .replace(/([0-9]+)([a-zA-Z])/g, (m, p1, p2) => {
      const lower = p2.toLowerCase();
      if (lower === 'x' || lower === 'd') return `${p1}${lower}`;
      return `${p1}-${p2}`;
    })
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return `${normalizedBase}${ext}`;
}

export function normalizePathSegments(relativePath) {
  const normalizedSlashes = relativePath.replace(/\\/g, '/');
  const segments = normalizedSlashes.split('/').filter(Boolean);
  return segments.map((seg) => normalizeKebabCase(seg)).join('/');
}

function getImageDimensions(filePath, ext) {
  if (!['.png', '.svg', '.jpg', '.jpeg'].includes(ext)) {
    return null;
  }
  try {
    const dims = sizeOf(filePath);
    if (dims && typeof dims.width === 'number' && typeof dims.height === 'number') {
      return { width: dims.width, height: dims.height };
    }
  } catch (err) {
    // Return null if dimension parsing failed
  }
  return null;
}

export function buildManifest() {
  console.log('🚀 Starting Kenney CC0 Asset Curation & Manifest Generator...');
  console.log(`📁 Source: ${SOURCE_DIR}`);
  console.log(`🎯 Staging: ${TARGET_RAW_DIR}`);

  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Source Kenney assets directory not found at: ${SOURCE_DIR}`);
  }

  if (!fs.existsSync(TARGET_RAW_DIR)) {
    fs.mkdirSync(TARGET_RAW_DIR, { recursive: true });
  }

  const manifestAssets = [];
  const manifestPacks = [];
  const allCategories = new Set();
  const seenDestPaths = new Map();

  function stageFile(srcPath, packDef, subPath, categoryOverride = null, extraTags = []) {
    const ext = path.extname(srcPath).toLowerCase();
    if (!VALID_EXTS.has(ext)) return;

    const normalizedSubPath = normalizePathSegments(subPath);
    const fileName = path.basename(normalizedSubPath);
    const destRelPath = `raw/${packDef.pack_id}/${normalizedSubPath}`;
    const destFullPath = path.join(PKG_ASSETS_DIR, destRelPath);

    // Collision avoidance
    let finalDestFullPath = destFullPath;
    let finalRelPath = destRelPath;
    let finalFileName = fileName;

    if (seenDestPaths.has(destRelPath) && seenDestPaths.get(destRelPath) !== srcPath) {
      const count = (seenDestPaths.get(`_count_${destRelPath}`) || 1) + 1;
      seenDestPaths.set(`_count_${destRelPath}`, count);
      const dot = fileName.lastIndexOf('.');
      const base = dot > 0 ? fileName.slice(0, dot) : fileName;
      finalFileName = `${base}-${count}${ext}`;
      const dirName = path.dirname(destRelPath);
      finalRelPath = `${dirName}/${finalFileName}`;
      finalDestFullPath = path.join(PKG_ASSETS_DIR, finalRelPath);
    }
    seenDestPaths.set(destRelPath, srcPath);

    const destDir = path.dirname(finalDestFullPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(srcPath, finalDestFullPath);

    const stats = fs.statSync(finalDestFullPath);
    const dimensions = getImageDimensions(finalDestFullPath, ext);

    const category = categoryOverride || (ext === '.ogg' || ext === '.wav' || ext === '.mp3' ? 'ui-audio' : packDef.category);
    allCategories.add(category);

    // Derive tags
    const pathTags = normalizedSubPath
      .replace(ext, '')
      .split('/')
      .flatMap((seg) => seg.split('-'))
      .filter((t) => t && t.length > 1 && !/^\d+$/.test(t));

    const combinedTags = Array.from(
      new Set([
        packDef.pack_id,
        category,
        ext.replace('.', ''),
        ...packDef.tags,
        ...extraTags,
        ...pathTags,
      ])
    );

    const extSlug = ext.replace('.', '');
    const pathSlug = finalRelPath.replace(/^raw\//, '').replace(/\//g, '-').replace(/\.[^.]+$/, '');
    const assetId = `${packDef.pack_id}-${pathSlug}-${extSlug}`;

    manifestAssets.push({
      id: assetId,
      pack_id: packDef.pack_id,
      relative_path: finalRelPath,
      file_name: finalFileName,
      extension: ext,
      mime_type: MIME_MAP[ext] || 'application/octet-stream',
      dimensions,
      category,
      tags: combinedTags,
      size_bytes: stats.size,
    });
  }

  // Process standard packs
  for (const packDef of PACK_DEFINITIONS) {
    const packSrcDir = path.join(SOURCE_DIR, packDef.src);
    if (!fs.existsSync(packSrcDir)) {
      console.warn(`⚠️ Pack directory not found: ${packSrcDir}, skipping`);
      continue;
    }

    let packAssetCount = 0;
    console.log(`📦 Processing pack: ${packDef.name} (${packDef.pack_id})...`);

    function walkPack(dir, relPrefix = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const nextRel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walkPack(fullPath, nextRel);
        } else {
          stageFile(fullPath, packDef, nextRel);
          packAssetCount++;
        }
      }
    }

    walkPack(packSrcDir);

    manifestPacks.push({
      pack_id: packDef.pack_id,
      name: packDef.name,
      category: packDef.category,
      license: 'CC0',
      total_assets: packAssetCount,
    });
  }

  // Extract special assets from construct-game-sources (.c3p archives)
  const constructDir = path.join(SOURCE_DIR, 'kenney_construct-game-sources', 'Construct 3');
  if (fs.existsSync(constructDir)) {
    // 1. Playing Cards & Boardgame from diceCards.c3p
    const diceCardsPath = path.join(constructDir, 'diceCards.c3p');
    if (fs.existsSync(diceCardsPath)) {
      console.log('🃏 Extracting Playing Cards and Boardgame assets from diceCards.c3p...');
      const tempExtractDir = path.join(PKG_ASSETS_DIR, 'temp-dice-cards');
      if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
      fs.mkdirSync(tempExtractDir, { recursive: true });

      try {
        execSync(`tar -xf "${diceCardsPath}" -C "${tempExtractDir}"`);
        const imagesDir = path.join(tempExtractDir, 'images');
        if (fs.existsSync(imagesDir)) {
          let cardCount = 0;
          let dieCount = 0;
          const files = fs.readdirSync(imagesDir);

          const playingCardsDef = {
            pack_id: 'playing-cards',
            name: 'Kenney Playing Cards',
            category: 'playing-cards',
            tags: ['cards', 'deck', '52-cards', 'cardback', 'suits', 'tabletop'],
          };
          const boardgameDef = {
            pack_id: 'boardgame',
            name: 'Kenney Boardgame Pack',
            category: 'boardgame',
            tags: ['boardgame', 'dice', 'die', 'tabletop', 'rolling'],
          };

          for (const f of files) {
            const fullPath = path.join(imagesDir, f);
            if (f.startsWith('card')) {
              stageFile(fullPath, playingCardsDef, f, 'playing-cards', ['playing-cards', 'cards', 'deck']);
              cardCount++;
            } else if (f.startsWith('die')) {
              stageFile(fullPath, boardgameDef, f, 'boardgame', ['boardgame', 'dice', 'tabletop']);
              dieCount++;
            }
          }

          manifestPacks.push({
            pack_id: 'playing-cards',
            name: 'Kenney Playing Cards',
            category: 'playing-cards',
            license: 'CC0',
            total_assets: cardCount,
          });
          manifestPacks.push({
            pack_id: 'boardgame',
            name: 'Kenney Boardgame Pack',
            category: 'boardgame',
            license: 'CC0',
            total_assets: dieCount,
          });
        }
      } catch (err) {
        console.warn('⚠️ Could not extract diceCards.c3p:', err.message);
      } finally {
        if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
      }
    }

    // 2. Sci-Fi RTS assets from spaceShooter.c3p
    const spaceShooterPath = path.join(constructDir, 'spaceShooter.c3p');
    if (fs.existsSync(spaceShooterPath)) {
      console.log('🚀 Extracting Sci-Fi RTS assets from spaceShooter.c3p...');
      const tempExtractDir = path.join(PKG_ASSETS_DIR, 'temp-space-shooter');
      if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
      fs.mkdirSync(tempExtractDir, { recursive: true });

      try {
        execSync(`tar -xf "${spaceShooterPath}" -C "${tempExtractDir}"`);
        const imagesDir = path.join(tempExtractDir, 'images');
        if (fs.existsSync(imagesDir)) {
          let sciFiCount = 0;
          const files = fs.readdirSync(imagesDir);
          const sciFiDef = {
            pack_id: 'sci-fi-rts',
            name: 'Kenney Sci-Fi RTS',
            category: 'sci-fi',
            tags: ['sci-fi', 'rts', 'space', 'shooter', 'ships', 'lasers'],
          };

          for (const f of files) {
            const fullPath = path.join(imagesDir, f);
            stageFile(fullPath, sciFiDef, f, 'sci-fi', ['sci-fi', 'space', 'ships']);
            sciFiCount++;
          }

          manifestPacks.push({
            pack_id: 'sci-fi-rts',
            name: 'Kenney Sci-Fi RTS',
            category: 'sci-fi',
            license: 'CC0',
            total_assets: sciFiCount,
          });
        }
      } catch (err) {
        console.warn('⚠️ Could not extract spaceShooter.c3p:', err.message);
      } finally {
        if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
      }
    }
  }

  // Sort assets deterministically by relative_path
  manifestAssets.sort((a, b) => a.relative_path.localeCompare(b.relative_path));

  const manifest = {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    total_assets: manifestAssets.length,
    categories: Array.from(allCategories).sort(),
    packs: manifestPacks,
    assets: manifestAssets,
  };

  const manifestJson = JSON.stringify(manifest, null, 2);

  // Write manifest in packages/assets/assets-manifest.json
  fs.writeFileSync(MANIFEST_PATH, manifestJson, 'utf-8');
  console.log(`✅ Assets manifest written to: ${MANIFEST_PATH}`);

  // Write mirrored manifest in scripts/assets-manifest.json
  const rootScriptsDir = path.dirname(ROOT_MANIFEST_PATH);
  if (!fs.existsSync(rootScriptsDir)) {
    fs.mkdirSync(rootScriptsDir, { recursive: true });
  }
  fs.writeFileSync(ROOT_MANIFEST_PATH, manifestJson, 'utf-8');
  console.log(`✅ Mirrored manifest written to: ${ROOT_MANIFEST_PATH}`);

  console.log(`\n🎉 Success! Cataloged ${manifestAssets.length} assets across ${manifestPacks.length} packs.`);
  console.log(`Categories: ${manifest.categories.join(', ')}\n`);

  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildManifest();
}
