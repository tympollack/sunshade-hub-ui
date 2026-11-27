import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getUserFromToken } from '../../../../lib/supabase-server';
import {
  executeCreatorSplitTransaction,
  type LiveContributionType,
} from '../../../../lib/live/gladiatorDropsService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const txKey = (searchParams.get('txKey') || '').trim();
  if (!txKey) {
    return NextResponse.json({ verified: false, error: 'txKey is required.' }, { status: 400 });
  }

  try {
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('hub_tokens_ledger')
      .select('id, metadata')
      .contains('metadata', { idempotency_key: txKey })
      .limit(1);

    if (error) {
      return NextResponse.json({ verified: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      verified: Array.isArray(data) && data.length > 0,
      txKey,
    });
  } catch (err: any) {
    return NextResponse.json(
      { verified: false, error: err?.message || 'Verification failed.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Bearer token is required to send Gladiator Drops or cheers.' },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid authentication session.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      creatorId,
      creatorName,
      actionType,
      grossTokens,
      idempotencyKey,
      dropId,
      matchId,
    } = body as {
      creatorId?: string;
      creatorName?: string;
      actionType?: LiveContributionType;
      grossTokens?: number;
      idempotencyKey?: string;
      dropId?: string;
      matchId?: string;
    };

    if (!creatorId || !actionType || !idempotencyKey) {
      return NextResponse.json(
        { error: 'creatorId, actionType, and idempotencyKey are required.' },
        { status: 400 }
      );
    }

    if (!['gladiator_drop', 'creator_cheer', 'creator_sub'].includes(actionType)) {
      return NextResponse.json(
        { error: 'Invalid actionType. Expected gladiator_drop, creator_cheer, or creator_sub.' },
        { status: 400 }
      );
    }

    const parsedTokens = Number(grossTokens);
    if (!Number.isFinite(parsedTokens) || !Number.isInteger(parsedTokens) || parsedTokens <= 0) {
      return NextResponse.json(
        { error: 'grossTokens must be a positive integer.' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();
    const senderName =
      (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || 'Citizen';

    const result = await executeCreatorSplitTransaction({
      senderId: user.id,
      senderName,
      creatorId,
      creatorName: creatorName || 'Creator',
      actionType,
      grossTokens: parsedTokens,
      idempotencyKey,
      dropId,
      matchId,
      supabaseClient: serviceClient,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    const message = err?.message || 'Gladiator drop transaction failed.';
    const status = message.includes('Insufficient utility balance') || message.includes('themselves')
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
