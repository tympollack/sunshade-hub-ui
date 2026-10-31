/**
 * SunShade Environment & Domain Routing Configuration Helper
 * Exposes build properties and environment detection for production (hub.sunshade.icu) vs staging (hub-stag.sunshade.icu).
 */

export const BUILD_ENVIRONMENT = (
  process.env.NEXT_PUBLIC_ENVIRONMENT ||
  process.env.NEXT_PUBLIC_VERCEL_ENV ||
  process.env.VERCEL_ENV ||
  process.env.NODE_ENV ||
  'production'
).toLowerCase();

export function isStagingEnvironment(host?: string): boolean {
  const env = (
    process.env.NEXT_PUBLIC_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.VERCEL_ENV ||
    ''
  ).toLowerCase();

  if (env === 'staging' || env === 'preview' || env === 'development') {
    return true;
  }

  const targetHost = (
    host ||
    (typeof window !== 'undefined' ? window.location.hostname : '')
  ).toLowerCase();

  if (
    targetHost.includes('-stag') ||
    targetHost.includes('staging') ||
    targetHost.endsWith('.vercel.app') ||
    targetHost.includes('localhost') ||
    targetHost.includes('127.0.0.1')
  ) {
    return true;
  }

  return false;
}

export function getHubBaseUrl(host?: string): string {
  const isStag = isStagingEnvironment(host);

  if (isStag) {
    if (process.env.NEXT_PUBLIC_STAGING_HUB_URL) {
      return process.env.NEXT_PUBLIC_STAGING_HUB_URL.replace(/\/$/, '');
    }
    return 'https://hub-stag.sunshade.icu';
  }

  if (process.env.NEXT_PUBLIC_HUB_URL) {
    return process.env.NEXT_PUBLIC_HUB_URL.replace(/\/$/, '');
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }

  return 'https://hub.sunshade.icu';
}

import {
  isTrustedRedirectHost,
  getValidatedRedirectUrl,
  isValidRedirectUrl,
  isVotaryTarget,
  buildTokenRedirectUrl,
  extractRedirectTarget,
} from './auth/redirectValidator';

export {
  isTrustedRedirectHost,
  getValidatedRedirectUrl,
  isValidRedirectUrl,
  isVotaryTarget,
  buildTokenRedirectUrl,
  extractRedirectTarget,
};
