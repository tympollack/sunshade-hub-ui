/**
 * Normalizes filenames and directory paths to lowercase kebab-case.
 * Handles camelCase, PascalCase, snake_case, numbers, spaces, and symbols.
 * Example: 'card_spades_10.PNG' -> 'card-spades-10.png'
 * Example: 'TileIsometricGrass.png' -> 'tile-isometric-grass.png'
 */
export function normalizeKebabCase(name: string): string {
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

/**
 * Normalizes each segment of a relative path to lowercase kebab-case.
 * Example: 'PNG/Face/face_0.png' -> 'png/face/face-0.png'
 */
export function normalizePathSegments(relativePath: string): string {
  const normalizedSlashes = relativePath.replace(/\\/g, '/');
  const segments = normalizedSlashes.split('/').filter(Boolean);
  return segments.map((seg) => normalizeKebabCase(seg)).join('/');
}
