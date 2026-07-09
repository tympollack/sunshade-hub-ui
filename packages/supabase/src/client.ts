import { createBrowserClient, type CookieOptions } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SSO_DOMAIN = '.sunshade.icu';

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

function getCookie(name: string): string | null | undefined {
  if (!isBrowser()) return null;

  const prefix = `${name}=`;
  for (const chunk of document.cookie.split('; ')) {
    if (chunk.startsWith(prefix)) {
      const value = chunk.slice(prefix.length);
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  return null;
}

function setCookie(name: string, value: string, options: CookieOptions = {}) {
  if (!isBrowser()) return;

  const encoded = encodeURIComponent(value);
  const parts = [`${name}=${encoded}`];

  if (options.path) parts.push(`Path=${options.path}`);
  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${new Date(options.expires).toUTCString()}`);

  parts.push(`domain=${SSO_DOMAIN}`, 'SameSite=Lax', 'Secure');

  document.cookie = parts.join('; ');
}

function removeCookie(name: string, options: CookieOptions = {}) {
  if (!isBrowser()) return;

  const parts = [`${name}=`];

  if (options.path) parts.push(`Path=${options.path}`);
  parts.push('Max-Age=0', `Expires=${new Date(0).toUTCString()}`);
  parts.push(`domain=${SSO_DOMAIN}`, 'SameSite=Lax', 'Secure');

  document.cookie = parts.join('; ');
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
      domain: SSO_DOMAIN,
      sameSite: 'lax',
      secure: true,
    },
    cookies: {
      get: getCookie,
      set: setCookie,
      remove: removeCookie,
    },
  }
);
