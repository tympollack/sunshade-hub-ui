import { createClient } from '@supabase/supabase-js';

// Fallback to localhost for local development if env vars are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5MzU1MjAwMCwiZXhwIjoxOTkwNzUyMDAwfQ.gQ-XXXXXX'; 
// Note: In a real app, never hardcode the anon key; but local Supabase defaults to this signature structure. 
// For this scaffolding, we expect the dev to pass real env vars, but we'll mock the client if they don't.

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
