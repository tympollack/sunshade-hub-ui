import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '../../../../lib/supabase-server';
import { getRedis } from '../../../../lib/redis';

export const MATCH_EVENTS_QUEUE = 'match_events_queue';

/**
 * POST /api/matches/ingest
 * Receives a completed match result from a game client (e.g. War: Second Wind)
 * and queues it onto the Upstash Redis list `match_events_queue` for a
 * downstream worker to drain into match_history / game_stats.
 *
 * Auth: Hub OAuth JWT in Authorization: Bearer <token>
 * Body: { game_name, opponent_name, result, match_type, moves }
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
  const { game_name, opponent_name, result, match_type, moves } = (body ?? {}) as {
    game_name?: string;
    opponent_name?: string;
    result?: string;
    match_type?: string;
    moves?: number;
  };

  if (
    !game_name ||
    !opponent_name ||
    !result ||
    !match_type ||
    typeof moves !== 'number'
  ) {
    return NextResponse.json(
      { error: '`game_name`, `opponent_name`, `result`, `match_type`, and `moves` are required' },
      { status: 400 }
    );
  }

  const enrichedEvent = {
    user_id: user.id,
    game_name,
    opponent_name,
    result,
    match_type,
    moves,
    created_at: new Date().toISOString(),
  };

  try {
    const redis = getRedis();
    await redis.lpush(MATCH_EVENTS_QUEUE, JSON.stringify(enrichedEvent));
  } catch (error) {
    console.error('POST /api/matches/ingest Redis error:', error);
    return NextResponse.json(
      { error: 'Failed to queue match event' },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, queued: true });
}
