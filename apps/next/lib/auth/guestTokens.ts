import crypto from 'node:crypto';

export interface GuestSession {
  sub: string;
  role: 'guest';
  starterBalance: number; // in USD (e.g. 0.10)
  starterTokens: number;  // in HT (e.g. 10)
  meshNodeId: string;
  createdAt: number;
  exp: number; // Unix timestamp in seconds
}

export interface EphemeralLedgerEntry {
  guestId: string;
  balanceUsd: number;
  tokens: number;
  allowedApps: string[];
  createdAt: string;
  updatedAt: string;
}

export const GUEST_COOKIE_NAME = 'sunshade_guest_session';
const DEFAULT_EXPIRATION_SECONDS = 86400; // 24 hours
const GUEST_JWT_SECRET =
  process.env.GUEST_JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'sunshade-zero-wan-guest-secret-mesh-2026';

// Ephemeral in-memory ledger store for zero-WAN offline participation
const ephemeralLedgerStore = new Map<string, EphemeralLedgerEntry>();

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function signHmac(data: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Generates an ephemeral guest session with cryptographically secure UUID and signed JWT.
 */
export function createGuestToken(options?: {
  meshNodeId?: string;
  starterBalance?: number;
  starterTokens?: number;
  ttlSeconds?: number;
}): { token: string; session: GuestSession } {
  const now = Math.floor(Date.now() / 1000);
  const ttl = options?.ttlSeconds || DEFAULT_EXPIRATION_SECONDS;
  const guestUuid = `guest_${crypto.randomUUID()}`;

  const session: GuestSession = {
    sub: guestUuid,
    role: 'guest',
    starterBalance: options?.starterBalance ?? 0.10,
    starterTokens: options?.starterTokens ?? 10,
    meshNodeId: options?.meshNodeId || 'flypack-mesh-alpha-01',
    createdAt: now,
    exp: now + ttl,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(session));
  const signature = signHmac(`${encodedHeader}.${encodedPayload}`, GUEST_JWT_SECRET);

  const token = `${encodedHeader}.${encodedPayload}.${signature}`;

  // Automatically provision the initial ephemeral ledger entry
  provisionGuestLedger(guestUuid, session.starterBalance, session.starterTokens);

  return { token, session };
}

/**
 * Validates and decodes a signed guest JWT session token.
 */
export function verifyGuestToken(token?: string | null): GuestSession | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;
  const expectedSig = signHmac(`${headerB64}.${payloadB64}`, GUEST_JWT_SECRET);

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payloadJson = base64UrlDecode(payloadB64);
    const session: GuestSession = JSON.parse(payloadJson);

    // Verify expiration
    const now = Math.floor(Date.now() / 1000);
    if (session.exp && session.exp < now) {
      return null;
    }

    if (session.role !== 'guest' || !session.sub) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Provisions or updates an anonymous starter ledger account.
 */
export function provisionGuestLedger(
  guestId: string,
  balanceUsd = 0.10,
  tokens = 10
): EphemeralLedgerEntry {
  const existing = ephemeralLedgerStore.get(guestId);
  if (existing) {
    return existing;
  }

  const nowIso = new Date().toISOString();
  const entry: EphemeralLedgerEntry = {
    guestId,
    balanceUsd,
    tokens,
    allowedApps: ['pukhuk', 'cozy', 'wsw', 'patchwork', 'valerie', 'makerverse'],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  ephemeralLedgerStore.set(guestId, entry);
  return entry;
}

/**
 * Retrieves the ephemeral ledger account for a guest.
 */
export function getGuestLedger(guestId: string): EphemeralLedgerEntry | null {
  return ephemeralLedgerStore.get(guestId) || null;
}

/**
 * Resolves standard cookie configuration options for SunShade guest sessions.
 */
export function getGuestCookieOptions(host?: string) {
  const hostname = (host || '').toLowerCase().split(':')[0];
  const isSunShadeDomain = hostname === 'sunshade.icu' || hostname.endsWith('.sunshade.icu');
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  return {
    httpOnly: true,
    secure: !isLocalhost,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: DEFAULT_EXPIRATION_SECONDS,
    ...(isSunShadeDomain ? { domain: '.sunshade.icu' } : {}),
  };
}
