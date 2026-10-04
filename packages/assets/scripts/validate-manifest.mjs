#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PKG_ASSETS_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(PKG_ASSETS_DIR, 'assets-manifest.json');

export function validateManifestFile(manifestPath = MANIFEST_PATH, baseDir = PKG_ASSETS_DIR) {
  console.log('🔍 Validating Asset Manifest against disk...');
  console.log(`📄 Manifest: ${manifestPath}`);
  console.log(`📁 Base Dir: ${baseDir}`);

  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Manifest not found at: ${manifestPath}`);
    return { valid: false, errors: [`Manifest file not found: ${manifestPath}`] };
  }

  let manifest;
  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    manifest = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Malformed JSON in manifest: ${err.message}`);
    return { valid: false, errors: [`Malformed JSON: ${err.message}`] };
  }

  const errors = [];
  const missingPaths = [];
  const invalidNaming = [];
  const malformedEntries = [];

  if (!manifest.version || typeof manifest.version !== 'string') {
    errors.push('Missing or invalid manifest version');
  }

  if (!Array.isArray(manifest.packs) || manifest.packs.length === 0) {
    errors.push('Missing or empty packs array');
  }

  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    errors.push('Missing or empty assets array');
  } else {
    console.log(`📊 Validating ${manifest.assets.length} assets...`);

    const seenIds = new Set();
    const kebabCaseRegex = /^[a-z0-9.-]+$/;

    for (let i = 0; i < manifest.assets.length; i++) {
      const asset = manifest.assets[i];

      // Field checks
      if (
        !asset.id ||
        !asset.pack_id ||
        !asset.relative_path ||
        !asset.file_name ||
        !asset.category ||
        !Array.isArray(asset.tags)
      ) {
        malformedEntries.push(asset.id || `Index #${i}`);
        continue;
      }

      // Unique ID check
      if (seenIds.has(asset.id)) {
        malformedEntries.push(`Duplicate ID: ${asset.id}`);
      }
      seenIds.add(asset.id);

      // Check lowercase kebab-case naming
      if (!kebabCaseRegex.test(asset.file_name)) {
        invalidNaming.push(asset.file_name);
      }

      // Check file existence on disk
      const fullPath = path.join(baseDir, asset.relative_path);
      if (!fs.existsSync(fullPath)) {
        missingPaths.push(asset.relative_path);
      }
    }
  }

  if (missingPaths.length > 0) {
    errors.push(`Missing ${missingPaths.length} asset files on disk. First 5: ${missingPaths.slice(0, 5).join(', ')}`);
  }

  if (malformedEntries.length > 0) {
    errors.push(`Found ${malformedEntries.length} malformed entries. First 5: ${malformedEntries.slice(0, 5).join(', ')}`);
  }

  if (invalidNaming.length > 0) {
    errors.push(`Found ${invalidNaming.length} non-kebab-case filenames. First 5: ${invalidNaming.slice(0, 5).join(', ')}`);
  }

  if (errors.length > 0) {
    console.error('\n❌ Manifest validation FAILED with errors:');
    for (const e of errors) {
      console.error(`  - ${e}`);
    }
    return { valid: false, errors, total: manifest.assets ? manifest.assets.length : 0 };
  }

  console.log(`\n✅ Manifest validation PASSED! Verified ${manifest.assets.length} assets with zero missing paths and zero malformed entries.\n`);
  return { valid: true, errors: [], total: manifest.assets.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateManifestFile();
  if (!result.valid) {
    process.exit(1);
  }
}
