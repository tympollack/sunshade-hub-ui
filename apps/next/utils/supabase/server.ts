import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
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
