import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '../../../../utils/cron-auth';
import { acquireLock, releaseLock } from '../../../../utils/redis-lock';
import { createServiceClient } from '../../../../lib/supabase-server';

const LOCK_KEY = 'cron:global_critical_lock';
const LOCK_TTL_SECS = 120; // 2 minutes — auto-expires if the function crashes

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * POST /api/cron/leaderboard-reset
 * Triggered daily by cron-job.org at 00:05 UTC.
 * Only performs work on days a period actually closes:
 *   - Monday  → archive last week's leaderboard
 *   - 1st     → archive last month's leaderboard
 * Idempotent: process_leaderboard_reset is safe to call multiple times.
 *
 * Uses a Redis distributed lock to prevent overlap with db-cleanup.
 * Returns 409 if the lock is held so the caller can retry.
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
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const resets: Array<{ period_type: 'weekly' | 'monthly'; period_key: string }> = [];

    // Weekly reset fires on Monday — archive the ISO week that just closed.
    if (now.getUTCDay() === 1) {
      resets.push({ period_type: 'weekly', period_key: isoWeekKey(yesterday) });
    }

    // Monthly reset fires on the 1st — archive the month that just closed.
    if (now.getUTCDate() === 1) {
      const key = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}`;
      resets.push({ period_type: 'monthly', period_key: key });
    }

    if (resets.length === 0) {
      return NextResponse.json({ ok: true, job: 'leaderboard-reset', skipped: true, reason: 'Not a reset day' });
    }

    const results = [];
    for (const r of resets) {
      const { error } = await supabase.rpc('process_leaderboard_reset', {
        p_period_type: r.period_type,
        p_period_key:  r.period_key,
      });
      if (error) console.error(`leaderboard-reset RPC error (${r.period_type} ${r.period_key}):`, error);
      results.push({ ...r, ok: !error, error: error?.message });
    }

    const anyFailed = results.some((r) => !r.ok);
    return NextResponse.json(
      { ok: !anyFailed, job: 'leaderboard-reset', results },
      { status: anyFailed ? 500 : 200 }
    );
  } finally {
    await releaseLock(LOCK_KEY, lockToken);
  }
}
