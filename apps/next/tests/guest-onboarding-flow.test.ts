import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createGuestToken,
  verifyGuestToken,
  getGuestLedger,
  provisionGuestLedger,
  getGuestCookieOptions,
  GUEST_COOKIE_NAME,
} from '../lib/auth/guestTokens';
import { GET as claimGuestRoute } from '../app/claim/guest/route';
import { middleware } from '../middleware';

describe('Zero-WAN Guest Session Generator & Onboarding Flow', () => {
  describe('Cryptographic Guest Tokens & Ledger', () => {
    it('generates a cryptographically valid signed JWT with ephemeral UUID and $0.10 starter balance', async () => {
      const { token, session } = await createGuestToken({
        meshNodeId: 'flypack-mesh-alpha-01',
      });

      expect(token).toBeTruthy();
      expect(token.split('.').length).toBe(3);

      expect(session.sub).toMatch(/^guest_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(session.role).toBe('guest');
      expect(session.starterBalance).toBe(0.10);
      expect(session.starterTokens).toBe(10);
      expect(session.meshNodeId).toBe('flypack-mesh-alpha-01');
      expect(session.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('verifies a valid token and successfully retrieves session payload', async () => {
      const { token, session } = await createGuestToken();
      const decoded = await verifyGuestToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded!.sub).toBe(session.sub);
      expect(decoded!.role).toBe('guest');
      expect(decoded!.starterBalance).toBe(0.10);
    });

    it('rejects tampered or forged JWT tokens', async () => {
      const { token } = await createGuestToken();
      const [h, p] = token.split('.');
      const forgedToken = `${h}.${p}.forgedSignature1234567890`;

      expect(await verifyGuestToken(forgedToken)).toBeNull();
    });

    it('rejects expired guest tokens', async () => {
      const { token } = await createGuestToken({ ttlSeconds: -10 });
      expect(await verifyGuestToken(token)).toBeNull();
    });

    it('provisions and retrieves anonymous ledger account for instant app participation', async () => {
      const { session } = await createGuestToken();
      const ledger = getGuestLedger(session.sub);

      expect(ledger).not.toBeNull();
      expect(ledger!.guestId).toBe(session.sub);
      expect(ledger!.balanceUsd).toBe(0.10);
      expect(ledger!.tokens).toBe(10);
      expect(ledger!.allowedApps).toContain('pukhuk');
      expect(ledger!.allowedApps).toContain('cozy');
    });

    it('scopes cookie to .sunshade.icu on sunshade domains and omits domain on localhost', () => {
      const prodOpts = getGuestCookieOptions('hub.sunshade.icu');
      expect(prodOpts.domain).toBe('.sunshade.icu');
      expect(prodOpts.httpOnly).toBe(true);
      expect(prodOpts.sameSite).toBe('lax');
      expect(prodOpts.secure).toBe(true);

      const localOpts = getGuestCookieOptions('localhost:3000');
      expect(localOpts.domain).toBeUndefined();
      expect(localOpts.httpOnly).toBe(true);
      expect(localOpts.sameSite).toBe('lax');
    });
  });

  describe('WiFi Intercept Claim Route (/claim/guest)', () => {
    it('completes zero-WAN handshake, sets guest cookie, and redirects within 300ms', async () => {
      const startTime = performance.now();
      const req = new NextRequest('http://localhost:3000/claim/guest?redirectTo=/dashboard');
      const res = await claimGuestRoute(req);
      const durationMs = performance.now() - startTime;

      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
      expect(durationMs).toBeLessThan(300);

      // Verify HTTP-only session cookie
      const cookie = res.cookies.get(GUEST_COOKIE_NAME);
      expect(cookie).toBeDefined();
      expect(cookie!.value).toBeTruthy();

      const decoded = await verifyGuestToken(cookie!.value);
      expect(decoded).not.toBeNull();
      expect(decoded!.role).toBe('guest');
      expect(decoded!.starterBalance).toBe(0.10);
    });

    it('preserves target redirect and sets mesh node header', async () => {
      const req = new NextRequest('http://localhost:3000/claim/guest?redirectTo=/games/pukhuk&mesh_node=flypack-north-02');
      const res = await claimGuestRoute(req);

      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('http://localhost:3000/games/pukhuk');
      expect(res.headers.get('X-Mesh-Node')).toBe('flypack-north-02');
    });
  });

  describe('Middleware Sub-App & Guest Access Routing', () => {
    it('recognizes guest session cookie on sub-app routes without secondary login prompts', async () => {
      const { token, session } = await createGuestToken();
      const req = new NextRequest('http://localhost:3000/games/pukhuk', {
        headers: {
          cookie: `${GUEST_COOKIE_NAME}=${token}`,
        },
      });

      const res = await middleware(req);
      expect(res.status).not.toBe(302); // Not redirected to /login
      expect(res.headers.get('x-guest-id')).toBe(session.sub);
      expect(res.headers.get('x-guest-role')).toBe('guest');
      expect(res.headers.get('x-guest-balance')).toBe('0.1');
    });

    it('redirects guest visitors from /login directly to dashboard', async () => {
      const { token } = await createGuestToken();
      const req = new NextRequest('http://localhost:3000/login', {
        headers: {
          cookie: `${GUEST_COOKIE_NAME}=${token}`,
        },
      });

      const res = await middleware(req);
      expect([302, 307]).toContain(res.status);
      expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
    });
  });
});
