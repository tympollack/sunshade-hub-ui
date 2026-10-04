import fs from 'node:fs';
import path from 'node:path';
import type {
  AssetEntry,
  AssetManifest,
  ManifestValidationResult,
} from './types';

export * from './types';
export * from './normalizer';

/**
 * Validates that an asset manifest is well-formed, all entries have required fields,
 * and all referenced asset files exist on disk with zero missing paths.
 */
export function validateManifest(
  manifest: AssetManifest,
  baseDir?: string
): ManifestValidationResult {
  const result: ManifestValidationResult = {
    valid: true,
    total_checked: 0,
    missing_paths: [],
    malformed_entries: [],
    errors: [],
  };

  if (!manifest || typeof manifest !== 'object') {
    result.valid = false;
    result.errors.push('Manifest root is not a valid JSON object');
    return result;
  }

  if (!manifest.version || typeof manifest.version !== 'string') {
    result.valid = false;
    result.errors.push('Manifest is missing valid "version" property');
  }

  if (!Array.isArray(manifest.assets)) {
    result.valid = false;
    result.errors.push('Manifest "assets" property must be an array');
    return result;
  }

  const seenIds = new Set<string>();

  for (let i = 0; i < manifest.assets.length; i++) {
    const asset = manifest.assets[i];
    result.total_checked++;

    // Guard required fields
    if (
      !asset.id ||
      !asset.pack_id ||
      !asset.relative_path ||
      !asset.file_name ||
      !asset.category ||
      !Array.isArray(asset.tags)
    ) {
      result.malformed_entries.push(
        asset.id || `Index #${i} (missing required metadata fields)`
      );
      continue;
    }

    // Check duplicate IDs
    if (seenIds.has(asset.id)) {
      result.malformed_entries.push(`Duplicate asset ID: ${asset.id}`);
    }
    seenIds.add(asset.id);

    // Verify file existence if base directory is supplied
    if (baseDir) {
      const fullPath = path.resolve(baseDir, asset.relative_path);
      if (!fs.existsSync(fullPath)) {
        result.missing_paths.push(asset.relative_path);
      }
    }
  }

  if (result.missing_paths.length > 0 || result.malformed_entries.length > 0) {
    result.valid = false;
    if (result.missing_paths.length > 0) {
      result.errors.push(
        `Found ${result.missing_paths.length} missing asset paths on disk`
      );
    }
    if (result.malformed_entries.length > 0) {
      result.errors.push(
        `Found ${result.malformed_entries.length} malformed asset entries`
      );
    }
  }

  return result;
}

export function getAssetById(
  manifest: AssetManifest,
  id: string
): AssetEntry | undefined {
  return manifest.assets.find((a) => a.id === id);
}

export function getAssetsByPack(
  manifest: AssetManifest,
  packId: string
): AssetEntry[] {
  return manifest.assets.filter((a) => a.pack_id === packId);
}

export function getAssetsByCategory(
  manifest: AssetManifest,
  category: string
): AssetEntry[] {
  return manifest.assets.filter((a) => a.category === category);
}

export function getAssetsByTag(
  manifest: AssetManifest,
  tag: string
): AssetEntry[] {
  const normalizedTag = tag.toLowerCase();
  return manifest.assets.filter((a) =>
    a.tags.some((t) => t.toLowerCase() === normalizedTag)
  );
}
