import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';
import { getRedis, SCORE_EVENTS_STREAM } from '../../../../lib/redis';
import { verifyCronAuth } from '../../../../utils/cron-auth';
import { acquireLock, releaseLock } from '../../../../utils/redis-lock';

const LOCK_KEY = 'cron:global_critical_lock';
const LOCK_TTL_SECS = 120; // 2 minutes — auto-expires if the function crashes

export const MATCH_EVENTS_QUEUE = 'match_events_queue';

const VICTORY_CURRENCY_REWARD = 50;
const DEFEAT_CURRENCY_REWARD = 10;

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

interface MatchEvent {
  user_id: string;
  game_name: string;
  opponent_name: string;
  result: string;
  match_type: string;
  moves: number;
  created_at: string;
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
 * Atomically reads and clears the match_events_queue Redis list.
 * Uses a single Lua script (LRANGE + DEL) so no events can be appended
 * and silently dropped between the read and the clear.
 */
async function drainMatchEventsQueue(redis: ReturnType<typeof getRedis>): Promise<string[]> {
  const script = `
    local items = redis.call("LRANGE", KEYS[1], 0, -1)
    redis.call("DEL", KEYS[1])
    return items
  `;
  const items = await redis.eval(script, [MATCH_EVENTS_QUEUE], []);
  return (items as string[]) ?? [];
}

/**
 * Pushes raw (unprocessed) match event strings back onto the queue.
 * Used when a downstream Supabase write fails, so events aren't lost.
 */
async function requeueMatchEvents(redis: ReturnType<typeof getRedis>, rawEvents: string[]): Promise<void> {
  if (rawEvents.length === 0) return;
  await redis.rpush(MATCH_EVENTS_QUEUE, ...rawEvents);
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
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const lockToken = await acquireLock(LOCK_KEY, LOCK_TTL_SECS);
  if (!lockToken) {
    return NextResponse.json(
      { error: 'Another critical cron job is running — will retry' },
      { status: 409 }
    );
  }

  const redis = getRedis();
  const supabase = createServiceClient();

  try {
    const scoreRollupResult = await runScoreRollup(redis, supabase);
    if (scoreRollupResult.status === 'error') {
      return NextResponse.json(
        { error: 'Failed to flush leaderboard deltas', detail: scoreRollupResult.detail },
        { status: 500 }
      );
    }

    const matchIngestResult = await runMatchIngest(redis, supabase);
    if (matchIngestResult.status === 'error') {
      return NextResponse.json(
        { error: 'Failed to persist match events', detail: matchIngestResult.detail },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      scoreRollup: scoreRollupResult,
      matchIngest: matchIngestResult,
    });
  } finally {
    await releaseLock(LOCK_KEY, lockToken);
  }
}

type ScoreRollupResult =
  | { status: 'skipped'; reason: string }
  | { status: 'ok'; processed: number; flushed: number }
  | { status: 'error'; detail: string };

async function runScoreRollup(
  redis: ReturnType<typeof getRedis>,
  supabase: ReturnType<typeof createServiceClient>
): Promise<ScoreRollupResult> {
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
    return { status: 'skipped', reason: 'No new score events' };
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
    return { status: 'error', detail: error.message };
  }

  return { status: 'ok', processed: messages.length, flushed: deltas.length };
}

type MatchIngestResult =
  | { status: 'skipped'; reason: string }
  | { status: 'ok'; processed: number; usersUpdated: number }
  | { status: 'error'; detail: string };

async function runMatchIngest(
  redis: ReturnType<typeof getRedis>,
  supabase: ReturnType<typeof createServiceClient>
): Promise<MatchIngestResult> {
  const rawEvents = await drainMatchEventsQueue(redis);
  if (rawEvents.length === 0) {
    return { status: 'skipped', reason: 'No new match events' };
  }

  const events: MatchEvent[] = [];
  for (const raw of rawEvents) {
    try {
      events.push(JSON.parse(raw) as MatchEvent);
    } catch {
      console.warn('Skipping malformed match event:', raw);
    }
  }

  if (events.length === 0) {
    return { status: 'skipped', reason: 'All match events were malformed' };
  }

  // 1. Batch insert into match_history.
  const historyRows = events.map((e) => ({
    user_id:       e.user_id,
    game_name:     e.game_name,
    opponent_name: e.opponent_name,
    result:        e.result,
    match_type:    e.match_type,
    moves:         e.moves,
    created_at:    e.created_at,
  }));

  const { error: historyError } = await supabase.from('match_history').insert(historyRows);
  if (historyError) {
    console.error('match_history insert error:', historyError);
    await requeueMatchEvents(redis, rawEvents);
    return { status: 'error', detail: historyError.message };
  }

  // 2. Aggregate per (user_id, game_name) so we issue one upsert per pair.
  const groups = new Map<string, {
    user_id: string;
    game_name: string;
    matchesInBatch: number;
    winsInBatch: number;
    currencyDelta: number;
  }>();

  for (const e of events) {
    const key = `${e.user_id}:${e.game_name}`;
    const isVictory = e.result === 'Victory';
    const reward = isVictory ? VICTORY_CURRENCY_REWARD : DEFEAT_CURRENCY_REWARD;

    const existing = groups.get(key);
    if (existing) {
      existing.matchesInBatch += 1;
      existing.winsInBatch += isVictory ? 1 : 0;
      existing.currencyDelta += reward;
    } else {
      groups.set(key, {
        user_id: e.user_id,
        game_name: e.game_name,
        matchesInBatch: 1,
        winsInBatch: isVictory ? 1 : 0,
        currencyDelta: reward,
      });
    }
  }

  const userIds = Array.from(new Set(events.map((e) => e.user_id)));
  const gameNames = Array.from(new Set(events.map((e) => e.game_name)));

  const { data: existingStats, error: fetchError } = await supabase
    .from('game_stats')
    .select('user_id, game_name, matches_played, wins, local_currency, achievements_unlocked, achievements_total')
    .in('user_id', userIds)
    .in('game_name', gameNames);

  if (fetchError) {
    console.error('game_stats fetch error:', fetchError);
    await requeueMatchEvents(redis, rawEvents);
    return { status: 'error', detail: fetchError.message };
  }

  const existingMap = new Map<string, {
    matches_played: number;
    wins: number;
    local_currency: number;
    achievements_unlocked: number;
    achievements_total: number;
  }>();
  for (const row of existingStats ?? []) {
    existingMap.set(`${row.user_id}:${row.game_name}`, row);
  }

  const upsertRows = Array.from(groups.values()).map((g) => {
    const key = `${g.user_id}:${g.game_name}`;
    const prior = existingMap.get(key);

    const matches_played = (prior?.matches_played ?? 0) + g.matchesInBatch;
    const wins = (prior?.wins ?? 0) + g.winsInBatch;
    const win_rate = matches_played > 0 ? wins / matches_played : 0;
    const local_currency = (prior?.local_currency ?? 0) + g.currencyDelta;

    return {
      user_id: g.user_id,
      game_name: g.game_name,
      matches_played,
      wins,
      win_rate,
      local_currency,
      achievements_unlocked: prior?.achievements_unlocked ?? 0,
      achievements_total: prior?.achievements_total ?? 0,
    };
  });

  const { error: upsertError } = await supabase
    .from('game_stats')
    .upsert(upsertRows, { onConflict: 'user_id,game_name' });

  if (upsertError) {
    console.error('game_stats upsert error:', upsertError);
    await requeueMatchEvents(redis, rawEvents);
    return { status: 'error', detail: upsertError.message };
  }

  return { status: 'ok', processed: events.length, usersUpdated: upsertRows.length };
}
