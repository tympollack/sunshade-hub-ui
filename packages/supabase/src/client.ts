import { createBrowserClient, type CookieOptions } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SSO_DOMAIN = '.sunshade.icu';

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const isSunShadeDomain = () => {
  if (!isBrowser()) return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'sunshade.icu' || host.endsWith('.sunshade.icu');
};

function parseCookies(): { name: string; value: string }[] {
  if (!isBrowser()) return [];

  const raw = document.cookie;
  if (!raw) return [];

  return raw.split('; ').map((chunk) => {
    const eqIdx = chunk.indexOf('=');
    if (eqIdx === -1) return { name: chunk, value: '' };
    const name = chunk.slice(0, eqIdx);
    const value = chunk.slice(eqIdx + 1);
    try {
      return { name, value: decodeURIComponent(value) };
    } catch {
      return { name, value };
    }
  });
}

function setAllCookies(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
  if (!isBrowser()) return;

  const isHttps = window.location.protocol === 'https:';

  cookiesToSet.forEach(({ name, value, options = {} }) => {
    const encoded = encodeURIComponent(value);
    const parts = [`${name}=${encoded}`];

    parts.push(`Path=${options.path || '/'}`);
    if (typeof options.maxAge === 'number') parts.push(`Max-Age=${options.maxAge}`);
    if (options.expires) parts.push(`Expires=${new Date(options.expires).toUTCString()}`);

    if (isSunShadeDomain()) {
      parts.push(`domain=${SSO_DOMAIN}`);
    }

    parts.push('SameSite=Lax');
    if (isHttps) {
      parts.push('Secure');
    }

    document.cookie = parts.join('; ');
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (!isLocal) {
    throw new Error(
      '[Supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. ' +
      'Check Vercel → Settings → Environment Variables and ensure both vars are enabled for the Preview environment.'
    );
  }
}

export const supabase = createBrowserClient(
  supabaseUrl ?? 'http://127.0.0.1:54321',
  supabaseAnonKey ?? 'local-anon-key-placeholder',
  {
    cookieOptions: {
      path: '/',
      ...(isSunShadeDomain() ? { domain: SSO_DOMAIN } : {}),
      sameSite: 'lax',
      secure: isBrowser() && window.location.protocol === 'https:',
    },
    cookies: {
      getAll: parseCookies,
      setAll: setAllCookies,
    },
  }
);
