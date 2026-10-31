import { describe, it, expect } from 'vitest';
import {
  isTrustedRedirectHost,
  isValidRedirectUrl,
  getValidatedRedirectUrl,
  isVotaryTarget,
  buildTokenRedirectUrl,
  extractRedirectTarget,
} from '../lib/auth/redirectValidator';

describe('Redirect Validator & Votary Cross-Domain Handshake', () => {
  describe('Host Whitelist (isTrustedRedirectHost)', () => {
    it('whitelists votary.app and its subdomains', () => {
      expect(isTrustedRedirectHost('votary.app')).toBe(true);
      expect(isTrustedRedirectHost('app.votary.app')).toBe(true);
      expect(isTrustedRedirectHost('staging.votary.app')).toBe(true);
      expect(isTrustedRedirectHost('auth.votary.app')).toBe(true);
    });

    it('whitelists sunshade.icu and its subdomains', () => {
      expect(isTrustedRedirectHost('sunshade.icu')).toBe(true);
      expect(isTrustedRedirectHost('hub.sunshade.icu')).toBe(true);
      expect(isTrustedRedirectHost('hub-stag.sunshade.icu')).toBe(true);
      expect(isTrustedRedirectHost('cozy.sunshade.icu')).toBe(true);
      expect(isTrustedRedirectHost('patchwork.sunshade.icu')).toBe(true);
    });

    it('whitelists localhost and 127.0.0.1 for local testing', () => {
      expect(isTrustedRedirectHost('localhost')).toBe(true);
      expect(isTrustedRedirectHost('127.0.0.1')).toBe(true);
    });

    it('whitelists approved vercel preview deployments', () => {
      expect(isTrustedRedirectHost('cozy-git-feat-test-sunshade-systems.vercel.app')).toBe(true);
      expect(isTrustedRedirectHost('votary-git-main-sunshade-systems.vercel.app')).toBe(true);
      expect(isTrustedRedirectHost('votary.vercel.app')).toBe(true);
    });

    it('rejects unapproved external domains', () => {
      expect(isTrustedRedirectHost('evil.com')).toBe(false);
      expect(isTrustedRedirectHost('notvotary.app')).toBe(false);
      expect(isTrustedRedirectHost('fake-sunshade.icu.malicious.com')).toBe(false);
      expect(isTrustedRedirectHost('votary.app.attacker.com')).toBe(false);
      expect(isTrustedRedirectHost('')).toBe(false);
    });
  });

  describe('URL Validation & Fallback Handling', () => {
    it('allows relative internal URLs', () => {
      expect(isValidRedirectUrl('/dashboard')).toBe(true);
      expect(isValidRedirectUrl('/profile/settings')).toBe(true);
      expect(getValidatedRedirectUrl('/claim')).toBe('/claim');
    });

    it('blocks protocol-relative open redirect attacks', () => {
      expect(isValidRedirectUrl('//evil.com')).toBe(false);
      expect(isValidRedirectUrl('//evil.com/path')).toBe(false);
      expect(isValidRedirectUrl('/\\evil.com')).toBe(false);
      expect(getValidatedRedirectUrl('//evil.com', '/dashboard')).toBe('/dashboard');
    });

    it('validates approved external targets and returns full URL', () => {
      expect(isValidRedirectUrl('https://votary.app/auth/callback')).toBe(true);
      expect(isValidRedirectUrl('https://staging.votary.app/auth/callback?foo=bar')).toBe(true);
      expect(getValidatedRedirectUrl('https://votary.app/auth/callback')).toBe('https://votary.app/auth/callback');
    });

    it('falls back to /dashboard on unapproved external domains', () => {
      expect(getValidatedRedirectUrl('https://attacker.com/steal-token')).toBe('/dashboard');
      expect(getValidatedRedirectUrl('https://phishing-site.org', '/dashboard')).toBe('/dashboard');
      expect(getValidatedRedirectUrl('javascript:alert(1)', '/dashboard')).toBe('/dashboard');
      expect(getValidatedRedirectUrl(null, '/dashboard')).toBe('/dashboard');
    });
  });

  describe('isVotaryTarget detection', () => {
    it('identifies votary.app targets', () => {
      expect(isVotaryTarget('https://votary.app')).toBe(true);
      expect(isVotaryTarget('https://votary.app/auth/callback')).toBe(true);
      expect(isVotaryTarget('https://app.votary.app/auth/callback')).toBe(true);
    });

    it('does not misidentify other targets', () => {
      expect(isVotaryTarget('/dashboard')).toBe(false);
      expect(isVotaryTarget('https://hub.sunshade.icu')).toBe(false);
      expect(isVotaryTarget('https://evil-votary.app')).toBe(false);
    });
  });

  describe('buildTokenRedirectUrl (Fragment Token Transfer)', () => {
    const mockSession = {
      access_token: 'test_access_jwt_123',
      refresh_token: 'test_refresh_token_456',
    };

    it('appends access_token and refresh_token via URL hash fragment', () => {
      const target = 'https://votary.app/auth/callback';
      const result = buildTokenRedirectUrl(target, mockSession);

      expect(result).toBe(
        'https://votary.app/auth/callback#access_token=test_access_jwt_123&refresh_token=test_refresh_token_456'
      );
    });

    it('strips existing hash fragment before appending tokens', () => {
      const target = 'https://votary.app/auth/callback#old-fragment';
      const result = buildTokenRedirectUrl(target, mockSession);

      expect(result).toBe(
        'https://votary.app/auth/callback#access_token=test_access_jwt_123&refresh_token=test_refresh_token_456'
      );
    });

    it('returns clean URL without hash if session tokens are missing', () => {
      const target = 'https://votary.app/auth/callback#something';
      expect(buildTokenRedirectUrl(target, null)).toBe('https://votary.app/auth/callback');
      expect(buildTokenRedirectUrl(target, { access_token: 'abc' })).toBe('https://votary.app/auth/callback');
    });
  });

  describe('extractRedirectTarget helper', () => {
    it('extracts redirectTo parameter with highest priority', () => {
      const params = new URLSearchParams({
        redirectTo: 'https://votary.app/auth/callback',
        redirect_to: 'https://hub.sunshade.icu/profile',
      });
      expect(extractRedirectTarget(params)).toBe('https://votary.app/auth/callback');
    });

    it('extracts redirect_to, returnTo, next fallbacks', () => {
      expect(extractRedirectTarget({ redirect_to: 'https://votary.app' })).toBe('https://votary.app');
      expect(extractRedirectTarget({ next: '/profile' })).toBe('/profile');
    });

    it('falls back to /dashboard if target is unapproved', () => {
      expect(extractRedirectTarget({ redirectTo: 'https://evil.com/phish' })).toBe('/dashboard');
      expect(extractRedirectTarget(null)).toBe('/dashboard');
    });
  });
});
