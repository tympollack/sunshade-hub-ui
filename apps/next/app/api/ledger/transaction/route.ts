import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getUserFromToken } from '../../../../lib/supabase-server';

/**
 * POST /api/ledger/transaction
 * Idempotent cross-game currency transaction through the append-only ledger.
 *
 * Flow:
 *  1. Verify Hub OAuth JWT
 *  2. Confirm the authenticated user owns `profileId`
 *  3. Validate `idempotency_key` is present (duplicate check delegated to Postgres)
 *  4. Call process_ledger_transaction RPC (service role) — atomic, exactly-once
 *
 * Auth: Hub OAuth JWT in Authorization: Bearer <token>
 * Body: {
 *   profileId:      string (uuid)
 *   currency:       'game_points' | 'hub_points'
 *   gameId?:        string  (required when currency = 'game_points')
 *   delta:          number  (positive = credit, negative = debit)
 *   reason:         string  (e.g. 'purchase', 'match_reward')
 *   idempotencyKey: string  (caller-supplied, unique per logical transaction)
 * }
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
  const { profileId, currency, gameId, delta, reason, idempotencyKey } = (body ?? {}) as {
    profileId?:      string;
    currency?:       string;
    gameId?:         string;
    delta?:          number;
    reason?:         string;
    idempotencyKey?: string;
  };

  if (!profileId || !currency || typeof delta !== 'number' || !reason || !idempotencyKey) {
    return NextResponse.json(
      { error: '`profileId`, `currency`, `delta`, `reason`, and `idempotencyKey` are required' },
      { status: 400 }
    );
  }

  if (!['game_points', 'hub_points'].includes(currency)) {
    return NextResponse.json(
      { error: '`currency` must be "game_points" or "hub_points"' },
      { status: 400 }
    );
  }

  if (currency === 'game_points' && !gameId) {
    return NextResponse.json(
      { error: '`gameId` is required for game_points transactions' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Verify the requesting user owns the profileId being debited/credited.
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return NextResponse.json(
      { error: 'profileId does not belong to the authenticated user' },
      { status: 403 }
    );
  }

  // Delegate to the Postgres RPC — handles idempotency_key deduplication
  // and the balance update atomically in a single transaction.
  const { data, error } = await supabase.rpc('process_ledger_transaction', {
    p_profile_id:      profileId,
    p_currency:        currency,
    p_game_id:         gameId ?? null,
    p_delta:           delta,
    p_reason:          reason,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    console.error('POST /api/ledger/transaction RPC error:', error);
    return NextResponse.json({ error: 'Transaction failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
