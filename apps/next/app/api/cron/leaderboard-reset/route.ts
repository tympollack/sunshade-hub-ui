import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '../../../../utils/cron-auth';
import { acquireLock, releaseLock } from '../../../../utils/redis-lock';
import { createServiceClient } from '../../../../lib/supabase-server';

const LOCK_KEY = 'cron:global_critical_lock';
const LOCK_TTL_SECS = 120; // 2 minutes — auto-expires if the function crashes

/**
 * POST /api/cron/leaderboard-reset
 * Triggered by QStash on a weekly/monthly schedule.
 * Resets leaderboard_entries for the completed period and seeds the next one.
 *
 * Uses a Redis distributed lock to prevent overlap with other critical cron
 * jobs (e.g. db-cleanup). Returns 409 if the lock is held so QStash retries.
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const lockToken = await acquireLock(LOCK_KEY, LOCK_TTL_SECS);
  if (!lockToken) {
    return NextResponse.json(
      { error: 'Another critical cron job is running — will retry' },
      { status: 409 }
    );
  }

  try {
    const supabase = createServiceClient();

    // Invoke the leaderboard_reset Supabase RPC.
    // This mirrors the logic in supabase/functions/leaderboard-reset/index.ts
    // but runs server-side via the service role client instead of as an edge function.
    const { error } = await supabase.rpc('leaderboard_reset');

    if (error) {
      console.error('leaderboard-reset RPC error:', error);
      return NextResponse.json(
        { error: 'leaderboard_reset RPC failed', detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, job: 'leaderboard-reset' });
  } finally {
    await releaseLock(LOCK_KEY, lockToken);
  }
}
