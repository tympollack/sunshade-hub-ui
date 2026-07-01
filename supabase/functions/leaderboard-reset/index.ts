// supabase/functions/leaderboard-reset/index.ts
//
// Deno edge function — schedule via Supabase Cron (pg_cron) to run daily
// at 00:00 UTC. The weekly reset only does anything on the day the ISO
// week rolls over (Monday); the monthly reset only does anything on the
// 1st. Re-running this function multiple times on the same day, or even
// for the same period twice, is safe — process_leaderboard_reset() is
// idempotent on the Postgres side.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const resets: Array<{ period_type: 'weekly' | 'monthly'; period_key: string }> = [];

  // Weekly reset fires on Monday (UTC) — the period that just closed is last week.
  if (now.getUTCDay() === 1 /* Monday */) {
    resets.push({ period_type: 'weekly', period_key: isoWeekKey(yesterday) });
  }

  // Monthly reset fires on the 1st — the period that just closed is last month.
  if (now.getUTCDate() === 1) {
    const key = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}`;
    resets.push({ period_type: 'monthly', period_key: key });
  }

  const results = [];
  for (const r of resets) {
    const { error } = await supabase.rpc('process_leaderboard_reset', {
      p_period_type: r.period_type,
      p_period_key: r.period_key,
    });
    results.push({ ...r, ok: !error, error: error?.message });
  }

  return new Response(JSON.stringify({ processed: results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
