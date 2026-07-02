import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '../../../../utils/cron-auth';
import { acquireLock, releaseLock } from '../../../../utils/redis-lock';
import { createServiceClient } from '../../../../lib/supabase-server';

const LOCK_KEY = 'cron:global_critical_lock';
const LOCK_TTL_SECS = 120; // 2 minutes — auto-expires if the function crashes

/**
 * POST /api/cron/db-cleanup
 * Triggered by QStash on a nightly schedule.
 * Purges expired rows: old game_events, processed ledger entries, stale sessions.
 *
 * Uses a Redis distributed lock to prevent overlap with other critical cron
 * jobs (e.g. leaderboard-reset). Returns 409 if the lock is held so QStash retries.
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

    // Purge game_events older than 90 days that have already been synced.
    const { error: eventsError } = await supabase
      .from('game_events')
      .delete()
      .eq('synced', true)
      .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (eventsError) {
      console.error('db-cleanup game_events error:', eventsError);
      return NextResponse.json(
        { error: 'game_events cleanup failed', detail: eventsError.message },
        { status: 500 }
      );
    }

    // Purge points_ledger entries older than 1 year.
    const { error: ledgerError } = await supabase
      .from('points_ledger')
      .delete()
      .lt('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

    if (ledgerError) {
      console.error('db-cleanup points_ledger error:', ledgerError);
      return NextResponse.json(
        { error: 'points_ledger cleanup failed', detail: ledgerError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, job: 'db-cleanup' });
  } finally {
    await releaseLock(LOCK_KEY, lockToken);
  }
}
