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

interface StoredLedgerEntry extends EphemeralLedgerEntry {
  expiresAt: number;
}

export const GUEST_COOKIE_NAME = 'sunshade_guest_session';
const DEFAULT_EXPIRATION_SECONDS = 86400; // 24 hours
const MAX_LEDGER_ENTRIES = 5000;

// Ephemeral runtime-generated signing key if no environment secret is configured
// Prevents known constant signature forgery across deployments
const RUNTIME_GUEST_SECRET = `guest_sec_${crypto.randomUUID()}_${crypto.randomUUID()}`;

export function getGuestSecret(): string {
  return (
    process.env.GUEST_JWT_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    RUNTIME_GUEST_SECRET
  );
}

// Bounded in-memory ledger store for zero-WAN offline participation with TTL eviction
const ephemeralLedgerStore = new Map<string, StoredLedgerEntry>();

function pruneExpiredLedgers() {
  const now = Date.now();
  ephemeralLedgerStore.forEach((entry, key) => {
    if (entry.expiresAt < now) {
      ephemeralLedgerStore.delete(key);
    }
  });

  // Evict oldest entries if capacity exceeded
  if (ephemeralLedgerStore.size > MAX_LEDGER_ENTRIES) {
    const toRemove = ephemeralLedgerStore.size - MAX_LEDGER_ENTRIES;
    let count = 0;
    ephemeralLedgerStore.forEach((_, key) => {
      if (count < toRemove) {
        ephemeralLedgerStore.delete(key);
        count++;
      }
    });
  }
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder();
  return base64UrlEncodeBytes(encoder.encode(str));
}

function base64UrlDecodeBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlDecode(base64url: string): string {
  const bytes = base64UrlDecodeBytes(base64url);
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

async function signHmac(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64UrlEncodeBytes(new Uint8Array(sig));
}

async function verifyHmac(data: string, sigB64: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = base64UrlDecodeBytes(sigB64);
    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as unknown as BufferSource,
      encoder.encode(data) as unknown as BufferSource
    );
  } catch {
    return false;
  }
}

/**
 * Generates an ephemeral guest session with cryptographically secure UUID and signed JWT.
 * Fully Web Crypto and Edge Runtime compatible.
 */
export async function createGuestToken(options?: {
  meshNodeId?: string;
  starterBalance?: number;
  starterTokens?: number;
  ttlSeconds?: number;
}): Promise<{ token: string; session: GuestSession }> {
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
  const signature = await signHmac(`${encodedHeader}.${encodedPayload}`, getGuestSecret());

  const token = `${encodedHeader}.${encodedPayload}.${signature}`;

  // Automatically provision the initial ephemeral ledger entry
  provisionGuestLedger(guestUuid, session.starterBalance, session.starterTokens, ttl);

  return { token, session };
}

/**
 * Validates and decodes a signed guest JWT session token.
 * Fully Web Crypto and Edge Runtime compatible.
 */
export async function verifyGuestToken(token?: string | null): Promise<GuestSession | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;
  const isValid = await verifyHmac(`${headerB64}.${payloadB64}`, signature, getGuestSecret());
  if (!isValid) {
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
 * Provisions or updates an anonymous starter ledger account with TTL eviction.
 */
export function provisionGuestLedger(
  guestId: string,
  balanceUsd = 0.10,
  tokens = 10,
  ttlSeconds = DEFAULT_EXPIRATION_SECONDS
): EphemeralLedgerEntry {
  pruneExpiredLedgers();

  const existing = ephemeralLedgerStore.get(guestId);
  if (existing) {
    return existing;
  }

  const nowIso = new Date().toISOString();
  const entry: StoredLedgerEntry = {
    guestId,
    balanceUsd,
    tokens,
    allowedApps: ['pukhuk', 'cozy', 'wsw', 'patchwork', 'valerie', 'makerverse'],
    createdAt: nowIso,
    updatedAt: nowIso,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };

  ephemeralLedgerStore.set(guestId, entry);
  return entry;
}

/**
 * Retrieves the ephemeral ledger account for a guest.
 */
export function getGuestLedger(guestId: string): EphemeralLedgerEntry | null {
  pruneExpiredLedgers();
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
