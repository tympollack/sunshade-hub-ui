import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

export const supabase = createClient(
  supabaseUrl ?? 'http://127.0.0.1:54321',
  supabaseAnonKey ?? 'local-anon-key-placeholder'
);
