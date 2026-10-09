# Shared Assets & Multi-Engine Texture Atlases (`@sunshade/shared-assets`)

Unified texture atlases, Flame-compatible sprite sheets, and Cloudflare R2 CDN manifests across the SunShade gaming ecosystem.

## Features

- **Multi-Engine Compatibility:** Fully compatible with Flame Engine (Flutter) `SpriteSheet` / `SpriteAnimation` and HTML5 Canvas / WebGL (Next.js).
- **Geometric Invariants:**
  - Zero pixel bleeding and collision-free texture sheets.
  - Standardized isometric terrain tiles to **256x128** bounding boxes with Flame anchor `(0.5, 0.75)`.
  - Standardized UI icons to **64x64** and **128x128** grids with center anchor `(0.5, 0.5)`.
- **Cloudflare R2 CDN:**
  - Distribution endpoint: `https://cdn.sunshade.icu/assets/kenney/`
  - Bucket: `sunshade-game-assets`
  - Immutable edge caching: `Cache-Control: public, max-age=31536000, immutable`
  - CORS: Permitted for `https://*.sunshade.icu` and `http://localhost:*` for `GET` and `HEAD`.

## Directory Structure

```
packages/shared-assets/
├── atlases/                     # Multi-engine JSON coordinate sheets
│   ├── isometric-tiles.atlas.json
│   ├── ui-sprites.atlas.json
│   ├── modular-characters.atlas.json
│   ├── playing-cards.atlas.json
│   ├── particle-pack.atlas.json
│   └── input-prompts.atlas.json
├── config/
│   └── r2-cors.json             # R2 CORS configuration policy
├── scripts/
│   ├── pack-atlases.mjs         # Automated bin-packing routine
│   └── sync-r2.mjs              # R2 sync and edge verification utility
├── src/
│   ├── index.ts                 # Package exports
│   ├── types.ts                 # TypeScript interfaces (Flame/WebGL)
│   ├── validator.ts             # Bounding box & overlap validation
│   └── resolvers.ts             # CDN URLs and Flame sprite definitions
└── tests/
    ├── atlases.test.mjs         # Atlas geometry & parser tests
    └── r2-cdn.test.mjs          # R2 CDN, CORS & caching tests
```

## Commands

- **Run Tests:** `npm test`
- **Verify Atlases:** `npm run pack:atlases`
- **Verify R2 Preflight:** `npm run sync:r2`
- **Typecheck:** `npm run typecheck`
