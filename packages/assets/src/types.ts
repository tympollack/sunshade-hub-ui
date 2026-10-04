export interface AssetDimensions {
  width: number;
  height: number;
}

export interface AssetEntry {
  id: string;
  pack_id: string;
  relative_path: string;
  file_name: string;
  extension: string;
  mime_type: string;
  dimensions: AssetDimensions | null;
  category: string;
  tags: string[];
  size_bytes: number;
}

export interface AssetPackMetadata {
  pack_id: string;
  name: string;
  category: string;
  license: string;
  total_assets: number;
  description?: string;
}

export interface AssetManifest {
  version: string;
  generated_at: string;
  total_assets: number;
  categories: string[];
  packs: AssetPackMetadata[];
  assets: AssetEntry[];
}

export interface ManifestValidationResult {
  valid: boolean;
  total_checked: number;
  missing_paths: string[];
  malformed_entries: string[];
  errors: string[];
}
