import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getUserFromToken } from '../../../lib/supabase-server';

/**
 * POST /api/events
 * Sync a batch of local GameEvents from a client device into game_events.
 * Idempotent: ON CONFLICT (game_id, profile_id, seq) DO NOTHING means
 * a client can re-submit the same events after a network retry safely.
 *
 * Auth: Hub OAuth JWT in Authorization: Bearer <token>
 * Body: { events: GameEvent[] }
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
  const events: Record<string, unknown>[] = body?.events;

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: '`events` must be a non-empty array' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found for authenticated user' }, { status: 404 });
  }

  const rows = events.map((e) => ({
    id:           e['id'],
    game_id:      e['gameId'],
    profile_id:   profile.id,
    event_type:   e['type'],
    payload:      e['payload'],
    seq:          e['seq'],
    vector_clock: e['vectorClock'] ?? {},
    created_at:   e['createdAt']
      ? new Date(e['createdAt'] as number).toISOString()
      : new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('game_events')
    .upsert(rows, { onConflict: 'game_id,profile_id,seq', ignoreDuplicates: true });

  if (error) {
    console.error('POST /api/events error:', error);
    return NextResponse.json({ error: 'Failed to persist events' }, { status: 500 });
  }

  return NextResponse.json({ synced: rows.length });
}
