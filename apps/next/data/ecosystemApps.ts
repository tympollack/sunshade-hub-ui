export type ReleaseTag = 'Production' | 'Local Mesh Only' | 'Beta';

export interface EcosystemApp {
  id: string;
  name: string;
  slug: string;
  bio: string;
  releaseTag: ReleaseTag;
  version: string;
  bannerUrl: string;
  blurDataUrl?: string;
  launchRoute: string;
  category: 'Game' | 'Civic Utility' | 'Creative';
  ctaType: 'Play Now' | 'Launch';
  badgeColor?: string;
  ssoSupported?: boolean;
}

// 16:9 blurred placeholder data URL (dark neutral gradient)
export const DEFAULT_BLUR_DATA_URL =
  'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoQAAkAAUAmJaQAA3AA/vsEAAA=';

export const ECOSYSTEM_APPS: EcosystemApp[] = [
  {
    id: 'wsw',
    name: 'War: Second Wind',
    slug: 'wsw',
    bio: 'Tactical post-collapse resource skirmishes over local mesh flypack frequencies.',
    releaseTag: 'Beta',
    version: 'v0.9.2',
    bannerUrl: '/apps/wsw.webp',
    blurDataUrl: DEFAULT_BLUR_DATA_URL,
    launchRoute: 'https://wsw.sunshade.icu',
    category: 'Game',
    ctaType: 'Play Now',
    ssoSupported: true,
  },
  {
    id: 'pukhuk',
    name: 'Puk Huk',
    slug: 'pukhuk',
    bio: 'High-velocity zero-latency street hockey and puck dueling over offline mesh networks.',
    releaseTag: 'Production',
    version: 'v1.4.0',
    bannerUrl: '/apps/pukhuk.webp',
    blurDataUrl: DEFAULT_BLUR_DATA_URL,
    launchRoute: 'https://pukhuk.sunshade.icu',
    category: 'Game',
    ctaType: 'Play Now',
    ssoSupported: true,
  },
  {
    id: 'cozy',
    name: 'Cozy',
    slug: 'cozy',
    bio: 'Hyperlocal neighborhood spaces, mutual aid boards, and ambient presence beacons.',
    releaseTag: 'Production',
    version: 'v2.1.0',
    bannerUrl: '/apps/cozy.webp',
    blurDataUrl: DEFAULT_BLUR_DATA_URL,
    launchRoute: 'https://cozy.sunshade.icu',
    category: 'Civic Utility',
    ctaType: 'Launch',
    ssoSupported: true,
  },
  {
    id: 'patchwork',
    name: 'PatchWork',
    slug: 'patchwork',
    bio: 'Decentralized municipal hazard reporting, road repairs, and community infrastructure audits.',
    releaseTag: 'Production',
    version: 'v1.8.2',
    bannerUrl: '/apps/patchwork.webp',
    blurDataUrl: DEFAULT_BLUR_DATA_URL,
    launchRoute: 'https://patchwork.sunshade.icu',
    category: 'Civic Utility',
    ctaType: 'Launch',
    ssoSupported: true,
  },
  {
    id: 'valerie',
    name: 'Project Valerie',
    slug: 'valerie',
    bio: 'Sovereign civic consensus, H3 geospatial advocate pairing, and verified stance deliberation.',
    releaseTag: 'Local Mesh Only',
    version: 'v0.8.0',
    bannerUrl: '/apps/valerie.webp',
    blurDataUrl: DEFAULT_BLUR_DATA_URL,
    launchRoute: 'https://valerie.sunshade.icu',
    category: 'Civic Utility',
    ctaType: 'Launch',
    ssoSupported: true,
  },
  {
    id: 'makerverse',
    name: 'Makerverse',
    slug: 'makerverse',
    bio: 'Open-hardware schematics, collaborative 3D manufacturing queue, and local tooling collective.',
    releaseTag: 'Beta',
    version: 'v0.5.1',
    bannerUrl: '/apps/makerverse.webp',
    blurDataUrl: DEFAULT_BLUR_DATA_URL,
    launchRoute: 'https://makerverse.sunshade.icu',
    category: 'Creative',
    ctaType: 'Launch',
    ssoSupported: true,
  },
];
