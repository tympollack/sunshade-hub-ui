import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getUserFromToken } from '../../../lib/supabase-server';
import { getRedis, SCORE_EVENTS_STREAM } from '../../../lib/redis';

/**
 * POST /api/score
 * Pushes a score delta onto the Upstash Redis stream.
 * The /api/cron/score-rollup route drains this stream every 15 minutes,
 * aggregates the deltas, and flushes them to leaderboard_entries via
 * the apply_leaderboard_deltas Postgres RPC.
 *
 * Auth: Hub OAuth JWT in Authorization: Bearer <token>
 * Body: { profileId, scope, delta, occurredAt? }
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { profileId, scope, delta, occurredAt } = (body ?? {}) as {
    profileId?: string;
    scope?: string;
    delta?: number;
    occurredAt?: number;
  };

  if (!profileId || !scope || typeof delta !== 'number') {
    return NextResponse.json(
      { error: '`profileId`, `scope`, and `delta` are required' },
      { status: 400 }
    );
  }

  // Verify the requesting user owns the profileId being scored.
  const supabase = createServiceClient();
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return NextResponse.json(
      { error: 'profileId does not belong to the authenticated user' },
      { status: 403 }
    );
  }

  const redis = getRedis();

  // @upstash/redis xadd: xadd(key, id, { field: value })
  await redis.xadd(
    SCORE_EVENTS_STREAM,
    '*',
    { payload: JSON.stringify({ profileId, scope, delta, occurredAt: occurredAt ?? Date.now() }) }
  );

  return NextResponse.json({ queued: true }, { status: 202 });
}
