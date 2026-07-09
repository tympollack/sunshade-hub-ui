import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SSO_COOKIE_OPTIONS: CookieOptions = {
  path: '/',
  domain: '.sunshade.icu',
  sameSite: 'lax',
  secure: true,
  httpOnly: true,
};

/**
 * SSR-safe Supabase client for React Server Components and Server Actions.
 * Reads/writes auth cookies so the server sees the same session as the browser.
 * Uses the anon key + RLS — service-role actions should still use createServiceClient().
 */
export async function createSSRClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SSO_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet, _headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...SSO_COOKIE_OPTIONS,
              })
            );
          } catch {
            // setAll called from a Server Component — safe to ignore,
            // middleware will handle session refresh.
          }
        },
      },
    }
  );
}
