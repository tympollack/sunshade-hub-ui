/**
 * SunShade Environment & Domain Routing Configuration Helper
 * Exposes build properties and environment detection for production (hub.sunshade.icu) vs staging (hub-stag.sunshade.icu).
 */

export const BUILD_ENVIRONMENT = (
  process.env.NEXT_PUBLIC_ENVIRONMENT ||
  process.env.NEXT_PUBLIC_VERCEL_ENV ||
  process.env.NODE_ENV ||
  'production'
).toLowerCase();

export function isStagingEnvironment(host?: string): boolean {
  if (BUILD_ENVIRONMENT === 'staging' || BUILD_ENVIRONMENT === 'preview') return true;

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return hostname.includes('-stag') || hostname.includes('staging');
  }

  if (host) {
    return host.includes('-stag') || host.includes('staging');
  }

  return false;
}

export function getHubBaseUrl(host?: string): string {
  if (process.env.NEXT_PUBLIC_HUB_URL) {
    return process.env.NEXT_PUBLIC_HUB_URL.replace(/\/$/, '');
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }

  const isStag = isStagingEnvironment(host);
  return isStag ? 'https://hub-stag.sunshade.icu' : 'https://hub.sunshade.icu';
}
