import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';
import { getRedis, SCORE_EVENTS_STREAM } from '../../../../lib/redis';

type PeriodType = 'weekly' | 'monthly' | 'alltime';

interface ScoreDeltaEvent {
  profileId: string;
  scope: string;
  delta: number;
  occurredAt: number;
}

interface StreamEntry {
  id: string;
  message: Record<string, string>;
}

function currentPeriodKeys(now: Date): { periodType: PeriodType; periodKey: string }[] {
  const keys: { periodType: PeriodType; periodKey: string }[] = [];

  keys.push({ periodType: 'alltime', periodKey: 'alltime' });

  keys.push({
    periodType: 'monthly',
    periodKey: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
  });

  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  keys.push({
    periodType: 'weekly',
    periodKey: `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`,
  });

  return keys;
}

/**
 * POST /api/cron/worker
 * Triggered every 15 minutes by a GitHub Actions workflow (.github/workflows/worker-cron.yml).
 * Drains up to 1000 entries from the Upstash Redis stream, aggregates score deltas
 * in memory, then flushes them to leaderboard_entries via apply_leaderboard_deltas
 * (exactly-once, offset tracked in Postgres stream_offsets).
 *
 * Auth: CRON_SECRET env var is REQUIRED. Requests without a matching
 *       Authorization: Bearer <CRON_SECRET> header are rejected with 401.
 *       Set CRON_SECRET in both Vercel env vars and the GitHub repo secret.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET env var is not set — refusing to run unprotected');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const redis = getRedis();
  const supabase = createServiceClient();

  // Resume from the last-processed stream offset stored in Postgres,
  // so a cold start or failed previous run never reprocesses old events.
  const { data: offsetRow } = await supabase
    .from('stream_offsets')
    .select('last_id')
    .eq('stream_name', SCORE_EVENTS_STREAM)
    .maybeSingle();

  const lastId: string = offsetRow?.last_id ?? '0-0';

  // Drain up to 1000 messages in one call.
  const messages = await redis.xread(SCORE_EVENTS_STREAM, lastId, { count: 1000 });

  if (!messages || messages.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No new events' });
  }

  // Aggregate deltas in memory — one map entry per (period, scope, profile).
  const aggregated = new Map<string, {
    period_type: string;
    period_key:  string;
    scope:       string;
    profile_id:  string;
    delta:       number;
  }>();

  let batchLastId = lastId;

  for (const entry of messages as StreamEntry[]) {
    batchLastId = entry.id;

    let event: ScoreDeltaEvent;
    try {
      event = JSON.parse(entry.message['payload']) as ScoreDeltaEvent;
    } catch {
      console.warn('Skipping malformed score event:', entry.id);
      continue;
    }

    for (const { periodType, periodKey } of currentPeriodKeys(new Date(event.occurredAt))) {
      const mapKey = `${periodType}:${periodKey}:${event.scope}:${event.profileId}`;
      const existing = aggregated.get(mapKey);
      if (existing) {
        existing.delta += event.delta;
      } else {
        aggregated.set(mapKey, {
          period_type: periodType,
          period_key:  periodKey,
          scope:       event.scope,
          profile_id:  event.profileId,
          delta:       event.delta,
        });
      }
    }
  }

  const deltas = Array.from(aggregated.values());

  // Flush atomically — apply_leaderboard_deltas updates stream_offsets in the
  // same transaction, guaranteeing exactly-once application.
  const { error } = await supabase.rpc('apply_leaderboard_deltas', {
    deltas,
    p_stream_name: SCORE_EVENTS_STREAM,
    p_last_id:     batchLastId,
  });

  if (error) {
    console.error('score-rollup RPC error:', error);
    return NextResponse.json(
      { error: 'Failed to flush leaderboard deltas', detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ processed: messages.length, flushed: deltas.length });
}
