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
 * POST /api/cron/score-rollup
 * Triggered by Vercel Cron every 15 minutes (see vercel.json).
 * Drains up to 1000 entries from the Upstash Redis stream,
 * aggregates score deltas in memory, then flushes them to
 * leaderboard_entries via apply_leaderboard_deltas (exactly-once,
 * offset tracked in Postgres stream_offsets table).
 *
 * Auth: CRON_SECRET header — Vercel injects this automatically for
 * cron jobs when set in project env vars. Requests without it are
 * rejected to prevent external triggering.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const redis = getRedis();
  const supabase = createServiceClient();

  // Read the last-processed stream ID from Postgres so we resume correctly
  // after a cold start or a failed previous run.
  const { data: offsetRow } = await supabase
    .from('stream_offsets')
    .select('last_id')
    .eq('stream_name', SCORE_EVENTS_STREAM)
    .maybeSingle();

  const lastId: string = offsetRow?.last_id ?? '0-0';

  // Drain up to 1000 messages from the stream in one call.
  // @upstash/redis xread returns { id: string; message: Record<string,string> }[] | null
  const messages = await redis.xread(SCORE_EVENTS_STREAM, lastId, { count: 1000 });

  if (!messages || messages.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No new events' });
  }

  // Aggregate deltas in memory before writing to Postgres — reduces DB round-trips.
  // Map key: `${periodType}:${periodKey}:${scope}:${profileId}`
  const aggregated = new Map<string, {
    period_type: string;
    period_key:  string;
    scope:       string;
    profile_id:  string;
    delta:       number;
  }>();

  interface StreamEntry {
    id: string;
    message: Record<string, string>;
  }

  let batchLastId = lastId;

  for (const entry of messages as StreamEntry[]) {
    batchLastId = entry.id;

    let event: ScoreDeltaEvent;
    try {
      const raw = entry.message['payload'];
      event = JSON.parse(raw) as ScoreDeltaEvent;
    } catch {
      console.warn('Skipping malformed score event:', entry.id);
      continue;
    }

    const eventDate = new Date(event.occurredAt);

    for (const { periodType, periodKey } of currentPeriodKeys(eventDate)) {
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

  // Flush to Postgres atomically — apply_leaderboard_deltas also updates
  // stream_offsets in the same transaction, so exactly-once is guaranteed.
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
