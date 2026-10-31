/**
 * SunShade Auth & Cross-Domain Redirect Validator
 * Whitelists allowed redirect targets across the SunShade Ecosystem and sister applications (e.g., The Votary).
 */

export interface AuthSessionTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  [key: string]: any;
}

/**
 * Checks whether a given hostname is a trusted origin for redirects.
 * Whitelisted targets include:
 * - The Votary: votary.app and all subdomains (*.votary.app)
 * - SunShade root domain and all subdomains: sunshade.icu and *.sunshade.icu
 * - Local development: localhost, 127.0.0.1
 * - SunShade Systems Vercel Organization preview deployments (*-sunshade-systems.vercel.app, *.sunshade-systems.vercel.app)
 */
export function isTrustedRedirectHost(rawHost: string): boolean {
  if (!rawHost || typeof rawHost !== 'string') return false;
  const host = rawHost.toLowerCase().trim();

  // 1. The Votary root domain and all subdomains (*.votary.app)
  if (host === 'votary.app' || host.endsWith('.votary.app')) {
    return true;
  }

  // 2. SunShade root domain and all subdomains (*.sunshade.icu)
  if (host === 'sunshade.icu' || host.endsWith('.sunshade.icu')) {
    return true;
  }

  // 3. Localhost development
  if (host === 'localhost' || host === '127.0.0.1') {
    return true;
  }

  // 4. SunShade Vercel Organization preview deployments (strictly scoped to sunshade-systems org)
  if (
    host.endsWith('-sunshade-systems.vercel.app') ||
    host.endsWith('.sunshade-systems.vercel.app') ||
    host === 'sunshade-systems.vercel.app'
  ) {
    return true;
  }

  // 5. Official known production/staging aliases under vercel.app
  if (/^(cozy|chess|pukhuk|critterverse|sunshade)\.vercel\.app$/.test(host)) {
    return true;
  }

  return false;
}

/**
 * Checks if a candidate URL string is safe to redirect to.
 * Relative URLs (starting with '/' but not '//') and URLs with trusted hosts are valid.
 */
export function isValidRedirectUrl(rawUrl: unknown): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const cleanUrl = rawUrl.trim();

  // Relative path: must start with single '/' and not '//' or '/\' to prevent protocol-relative redirects
  if (cleanUrl.startsWith('/')) {
    return !cleanUrl.startsWith('//') && !cleanUrl.startsWith('/\\');
  }

  try {
    const parsed = new URL(cleanUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    return isTrustedRedirectHost(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Validates a candidate redirect URL, falling back to a safe internal path (default: /dashboard)
 * if the URL is invalid or points to an unapproved external domain.
 */
export function getValidatedRedirectUrl(rawUrl: unknown, fallbackUrl = '/dashboard'): string {
  if (isValidRedirectUrl(rawUrl)) {
    return (rawUrl as string).trim();
  }
  return fallbackUrl;
}

/**
 * Checks whether a URL target belongs strictly to The Votary (votary.app or *.votary.app).
 */
export function isVotaryTarget(targetUrl: string): boolean {
  try {
    if (!targetUrl || typeof targetUrl !== 'string' || targetUrl.startsWith('/')) return false;
    const parsed = new URL(targetUrl);
    const host = parsed.hostname.toLowerCase();
    return host === 'votary.app' || host.endsWith('.votary.app');
  } catch {
    return false;
  }
}

/**
 * Appends authenticated session tokens (access_token & refresh_token) to the redirect URL
 * via hash fragment: `${redirectTo}#access_token=${encoded}&refresh_token=${encoded}`.
 * Using the hash fragment prevents token leakage in server logs, referrer headers, and intermediary proxies.
 * Both tokens are strictly URL-encoded to prevent parameter injection or parsing corruption.
 */
export function buildTokenRedirectUrl(
  targetUrl: string,
  session?: AuthSessionTokens | null
): string {
  const cleanTarget = targetUrl.split('#')[0];

  if (!session?.access_token || !session?.refresh_token) {
    return cleanTarget;
  }

  const encodedAccess = encodeURIComponent(session.access_token);
  const encodedRefresh = encodeURIComponent(session.refresh_token);

  return `${cleanTarget}#access_token=${encodedAccess}&refresh_token=${encodedRefresh}`;
}

/**
 * Helper to extract and validate redirect destination from various query parameter conventions.
 */
export function extractRedirectTarget(
  searchParams: { get: (key: string) => string | null } | URLSearchParams | Record<string, string | undefined> | null | undefined,
  fallbackUrl = '/dashboard'
): string {
  if (!searchParams) return fallbackUrl;

  const getParam = (key: string): string | null => {
    if ('get' in searchParams && typeof searchParams.get === 'function') {
      return searchParams.get(key);
    }
    return (searchParams as Record<string, string | undefined>)[key] || null;
  };

  const raw =
    getParam('redirectTo') ||
    getParam('redirect_to') ||
    getParam('redirect') ||
    getParam('returnTo') ||
    getParam('return_to') ||
    getParam('next') ||
    getParam('callbackUrl') ||
    getParam('callback') ||
    getParam('app_url') ||
    getParam('url');

  return getValidatedRedirectUrl(raw, fallbackUrl);
}
