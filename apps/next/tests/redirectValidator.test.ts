import { describe, it, expect } from 'vitest';
import {
  isTrustedRedirectHost,
  isValidRedirectUrl,
  getValidatedRedirectUrl,
  isVotaryTarget,
  buildTokenRedirectUrl,
  buildVotarySsoRedirectUrl,
  extractRedirectTarget,
  resolvePostAuthRedirectUrl,
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

    it('whitelists approved vercel preview deployments under sunshade-systems org', () => {
      expect(isTrustedRedirectHost('cozy-git-feat-test-sunshade-systems.vercel.app')).toBe(true);
      expect(isTrustedRedirectHost('votary-git-main-sunshade-systems.vercel.app')).toBe(true);
      expect(isTrustedRedirectHost('hub-staging-branch-sunshade-systems.vercel.app')).toBe(true);
      expect(isTrustedRedirectHost('cozy.vercel.app')).toBe(true);
      expect(isTrustedRedirectHost('chess.vercel.app')).toBe(true);
      expect(isTrustedRedirectHost('pukhuk.vercel.app')).toBe(true);
    });

    it('rejects unapproved external domains and arbitrary unowned vercel domains', () => {
      expect(isTrustedRedirectHost('evil.com')).toBe(false);
      expect(isTrustedRedirectHost('notvotary.app')).toBe(false);
      expect(isTrustedRedirectHost('votary-attacker.vercel.app')).toBe(false);
      expect(isTrustedRedirectHost('cozy-attacker.vercel.app')).toBe(false);
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
      expect(isValidRedirectUrl('/foo\\evil.com')).toBe(false);
      expect(isValidRedirectUrl('/path\\to\\resource')).toBe(false);
      expect(getValidatedRedirectUrl('//evil.com', '/dashboard')).toBe('/dashboard');
      expect(getValidatedRedirectUrl('/foo\\evil.com', '/dashboard')).toBe('/dashboard');
    });

    it('rejects plaintext HTTP for remote hosts while permitting localhost', () => {
      expect(isValidRedirectUrl('http://votary.app/auth/callback')).toBe(false);
      expect(isValidRedirectUrl('http://sunshade.icu')).toBe(false);
      expect(isValidRedirectUrl('http://localhost:3000')).toBe(true);
      expect(isValidRedirectUrl('http://127.0.0.1:3000')).toBe(true);
      expect(getValidatedRedirectUrl('http://votary.app', '/dashboard')).toBe('/dashboard');
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

    it('safely URL-encodes tokens with special characters to prevent parameter injection', () => {
      const specialSession = {
        access_token: 'jwt.with&special=chars#fragment',
        refresh_token: 'refresh+token/with space and &',
      };
      const result = buildTokenRedirectUrl('https://votary.app/auth/callback', specialSession);

      expect(result).toBe(
        'https://votary.app/auth/callback#access_token=jwt.with%26special%3Dchars%23fragment&refresh_token=refresh%2Btoken%2Fwith%20space%20and%20%26'
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

    it('refuses to append tokens to plaintext HTTP remote targets', () => {
      const insecureTarget = 'http://votary.app/auth/callback';
      expect(buildTokenRedirectUrl(insecureTarget, mockSession)).toBe('http://votary.app/auth/callback');
    });

    it('refuses to append tokens to unsafe schemes on localhost', () => {
      expect(buildTokenRedirectUrl('javascript:alert(1)', mockSession)).toBe('javascript:alert(1)');
      expect(buildTokenRedirectUrl('data:text/html,evil', mockSession)).toBe('data:text/html,evil');
      expect(buildTokenRedirectUrl('custom-scheme://localhost/token', mockSession)).toBe('custom-scheme://localhost/token');
    });
  });

  describe('buildVotarySsoRedirectUrl', () => {
    it('routes bare votary homepage and preserves query params through /auth/callback when session exists', () => {
      const session = {
        access_token: 'access_123',
        refresh_token: 'refresh_456',
      };
      expect(buildVotarySsoRedirectUrl('https://votary.app', session)).toBe(
        'https://votary.app/auth/callback?return_to=%2F#access_token=access_123&refresh_token=refresh_456'
      );
      expect(buildVotarySsoRedirectUrl('https://votary.app/?poll=abc&tab=votes', session)).toBe(
        'https://votary.app/auth/callback?return_to=%2F%3Fpoll%3Dabc%26tab%3Dvotes#access_token=access_123&refresh_token=refresh_456'
      );
      expect(buildVotarySsoRedirectUrl('https://votary.app/auth/callback?return_to=%2Fsettings', session)).toBe(
        'https://votary.app/auth/callback?return_to=%2Fsettings#access_token=access_123&refresh_token=refresh_456'
      );
    });

    it('returns original target directly without /auth/callback when session is absent', () => {
      expect(buildVotarySsoRedirectUrl('https://votary.app', null)).toBe('https://votary.app');
      expect(buildVotarySsoRedirectUrl('https://votary.app/?poll=abc', null)).toBe('https://votary.app/?poll=abc');
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

  describe('resolvePostAuthRedirectUrl', () => {
    const session = { access_token: 'acc-123', refresh_token: 'ref-456' };

    it('preserves same-origin path, query, and hash as internal navigation without tokens', () => {
      const result = resolvePostAuthRedirectUrl(
        'https://sunshade-hub-git-preview-team.vercel.app/dashboard?view=Settings#security',
        session,
        'https://sunshade-hub-git-preview-team.vercel.app'
      );

      expect(result).toEqual({
        kind: 'internal',
        url: '/dashboard?view=Settings#security',
      });
    });

    it('does not forward tokens to loopback origins from production Hub', () => {
      const result = resolvePostAuthRedirectUrl(
        'http://localhost:4000/auth/callback?next=%2Fpolls',
        session,
        'https://hub.sunshade.icu'
      );

      expect(result).toEqual({
        kind: 'external',
        url: 'http://localhost:4000/auth/callback?next=%2Fpolls',
      });
    });

    it('forwards fragment tokens to loopback and preview origins from staging or local Hub', () => {
      const loopbackResult = resolvePostAuthRedirectUrl(
        'http://localhost:4000/polls?tab=recent',
        session,
        'https://hub-stag.sunshade.icu'
      );
      expect(loopbackResult).toEqual({
        kind: 'external',
        url: 'http://localhost:4000/auth/callback#access_token=acc-123&refresh_token=ref-456&next=%2Fpolls%3Ftab%3Drecent',
      });

      const previewResult = resolvePostAuthRedirectUrl(
        'https://valerie-git-feat.vercel.app/polls/1',
        session,
        'https://hub.sunshade.icu'
      );
      expect(previewResult).toEqual({
        kind: 'external',
        url: 'https://valerie-git-feat.vercel.app/auth/callback#access_token=acc-123&refresh_token=ref-456&next=%2Fpolls%2F1',
      });
    });
  });
});
