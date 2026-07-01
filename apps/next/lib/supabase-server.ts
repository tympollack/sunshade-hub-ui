import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for Next.js API routes.
 * Bypasses RLS — only ever used server-side (route handlers, cron jobs).
 * Never import this from a Client Component or expose it to the browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Verify a Hub OAuth JWT (Bearer token) and return the auth user.
 * Uses the anon client so Supabase validates the token against its
 * JWT secret without us holding the secret ourselves.
 */
export async function getUserFromToken(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
