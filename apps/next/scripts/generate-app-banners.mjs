import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('apps/next/public/apps');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const apps = [
  {
    slug: 'wsw',
    name: 'War: Second Wind',
    tagline: 'Tactical Mesh Skirmish',
    bg1: '#7f1d1d',
    bg2: '#18181b',
    accent: '#ef4444',
  },
  {
    slug: 'pukhuk',
    name: 'Puk Huk',
    tagline: 'Zero-Latency Puck Duel',
    bg1: '#0e7490',
    bg2: '#0f172a',
    accent: '#06b6d4',
  },
  {
    slug: 'cozy',
    name: 'Cozy',
    tagline: 'Neighborhood Spaces &amp; Aid',
    bg1: '#c2410c',
    bg2: '#1c1917',
    accent: '#f97316',
  },
  {
    slug: 'patchwork',
    name: 'PatchWork',
    tagline: 'Municipal Infrastructure Audits',
    bg1: '#047857',
    bg2: '#064e3b',
    accent: '#10b981',
  },
  {
    slug: 'valerie',
    name: 'Project Valerie',
    tagline: 'Verified Civic Consensus',
    bg1: '#6d28d9',
    bg2: '#1e1b4b',
    accent: '#8b5cf6',
  },
  {
    slug: 'makerverse',
    name: 'Makerverse',
    tagline: 'Open-Hardware Manufacturing Queue',
    bg1: '#1d4ed8',
    bg2: '#0f172a',
    accent: '#3b82f6',
  },
];

async function createBanners() {
  for (const app of apps) {
    const svg = `
      <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${app.bg1}" />
            <stop offset="100%" stop-color="${app.bg2}" />
          </linearGradient>
          <radialGradient id="glow" cx="80%" cy="20%" r="60%">
            <stop offset="0%" stop-color="${app.accent}" stop-opacity="0.4" />
            <stop offset="100%" stop-color="${app.bg2}" stop-opacity="0" />
          </radialGradient>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="1280" height="720" fill="url(#grad)" />
        <rect width="1280" height="720" fill="url(#glow)" />
        <rect width="1280" height="720" fill="url(#grid)" />
        <circle cx="1050" cy="200" r="180" fill="${app.accent}" opacity="0.15" filter="blur(60px)" />
        <g transform="translate(100, 420)">
          <rect x="0" y="-30" width="140" height="32" rx="16" fill="${app.accent}" opacity="0.25" />
          <text x="70" y="-8" fill="${app.accent}" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" text-anchor="middle" letter-spacing="2">SUNSHADE</text>
          <text x="0" y="55" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="64" letter-spacing="-1">${app.name}</text>
          <text x="0" y="110" fill="rgba(255,255,255,0.75)" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="26">${app.tagline}</text>
        </g>
      </svg>
    `;

    const dest = path.join(outDir, `${app.slug}.webp`);
    await sharp(Buffer.from(svg))
      .webp({ quality: 90 })
      .toFile(dest);
    console.log(`Generated: ${dest}`);
  }
}

createBanners().catch(console.error);
