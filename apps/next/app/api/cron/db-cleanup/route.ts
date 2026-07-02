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
    const now = new Date().toISOString();
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    // Deactivate hub_events whose end_time has passed.
    const { error: eventsError } = await supabase
      .from('hub_events')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('end_time', now);

    if (eventsError) {
      console.error('db-cleanup hub_events error:', eventsError);
      return NextResponse.json(
        { error: 'hub_events cleanup failed', detail: eventsError.message },
        { status: 500 }
      );
    }

    // Purge hub_tokens_ledger entries older than 1 year.
    const { error: ledgerError } = await supabase
      .from('hub_tokens_ledger')
      .delete()
      .lt('created_at', oneYearAgo);

    if (ledgerError) {
      console.error('db-cleanup hub_tokens_ledger error:', ledgerError);
      return NextResponse.json(
        { error: 'hub_tokens_ledger cleanup failed', detail: ledgerError.message },
        { status: 500 }
      );
    }

    // Purge chess.matches older than 1 year.
    const { error: matchesError } = await supabase
      .schema('chess')
      .from('matches')
      .delete()
      .lt('created_at', oneYearAgo);

    if (matchesError) {
      console.error('db-cleanup chess.matches error:', matchesError);
      return NextResponse.json(
        { error: 'chess.matches cleanup failed', detail: matchesError.message },
        { status: 500 }
      );
    }

    // Purge chess.points_ledger entries older than 1 year.
    const { error: chessLedgerError } = await supabase
      .schema('chess')
      .from('points_ledger')
      .delete()
      .lt('created_at', oneYearAgo);

    if (chessLedgerError) {
      console.error('db-cleanup chess.points_ledger error:', chessLedgerError);
      return NextResponse.json(
        { error: 'chess.points_ledger cleanup failed', detail: chessLedgerError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, job: 'db-cleanup' });
  } finally {
    await releaseLock(LOCK_KEY, lockToken);
  }
}
