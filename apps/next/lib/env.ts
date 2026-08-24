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

/**
 * Checks whether a given hostname is a trusted SunShade ecosystem origin.
 * Trusted origins include:
 * - sunshade.icu and any subdomain (*.sunshade.icu)
 * - SunShade Systems Vercel preview deployments (*-sunshade-systems.vercel.app, *.sunshade-systems.vercel.app)
 * - Official SunShade ecosystem app Vercel deployment prefixes (cozy-*, chess-*, pukhuk-*, critterverse-*, sunshade-*)
 * - Localhost development (localhost, 127.0.0.1)
 */
export function isTrustedRedirectHost(rawHost: string): boolean {
  if (!rawHost || typeof rawHost !== 'string') return false;
  const host = rawHost.toLowerCase().trim();

  // 1. SunShade root domain and all subdomains
  if (host === 'sunshade.icu' || host.endsWith('.sunshade.icu')) {
    return true;
  }

  // 2. Local development
  if (host === 'localhost' || host === '127.0.0.1') {
    return true;
  }

  // 3. SunShade Vercel Organization preview deployments
  if (
    host.endsWith('-sunshade-systems.vercel.app') ||
    host.endsWith('.sunshade-systems.vercel.app') ||
    host === 'sunshade-systems.vercel.app'
  ) {
    return true;
  }

  // 4. Known SunShade ecosystem app Vercel preview deployment patterns
  if (
    /^(cozy|chess|pukhuk|critterverse|sunshade)-[a-z0-9-]+\.vercel\.app$/.test(host) ||
    /^(cozy|chess|pukhuk|critterverse|sunshade)\.vercel\.app$/.test(host)
  ) {
    return true;
  }

  return false;
}

/**
 * Validates a redirect URL, returning the validated URL if safe, or a fallback URL if unsafe.
 */
export function getValidatedRedirectUrl(rawUrl: unknown, fallbackUrl = '/dashboard'): string {
  if (!rawUrl || typeof rawUrl !== 'string') return fallbackUrl;

  const cleanUrl = rawUrl.trim();
  if (cleanUrl.startsWith('/')) {
    return cleanUrl;
  }

  try {
    const parsed = new URL(cleanUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return fallbackUrl;
    }

    if (isTrustedRedirectHost(parsed.hostname)) {
      return parsed.toString();
    }
  } catch {
    // If URL parsing fails, return fallback
  }

  return fallbackUrl;
}
