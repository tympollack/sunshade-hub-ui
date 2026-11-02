import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '../../../../../lib/supabase-server';
import {
  quoteUtilitySinkConversion,
  DEV_MERCH_CATALOG,
  UtilitySinkType,
} from '../../../../../lib/services/tokenSinksService';

export async function GET() {
  return NextResponse.json({
    sinks: [
      {
        type: 'COMPUTE_CREDITS',
        name: 'LLM & AI Compute Credits',
        description: 'Convert tokens to internal AI inference credits with a 1.25x value bonus (+25%).',
        bonusMultiplier: 1.25,
      },
      {
        type: 'PRIORITY_CI_MINUTES',
        name: 'Priority CI Runner Minutes',
        description: 'Acquire dedicated high-concurrency GitHub / CI action runner minutes (100 tokens = 1 min).',
        conversionRate: '100 tokens / min',
      },
      {
        type: 'COMMUNITY_SCHOLARSHIP',
        name: 'Community Scholarship & Bounty Pool',
        description: 'Donate tokens to support open bounties for student and emerging developers.',
      },
      {
        type: 'DEV_MERCHANDISE',
        name: 'Developer Gear Store',
        description: 'Redeem physical hardware keys, keycaps, and custom hoodies.',
        catalog: DEV_MERCH_CATALOG,
      },
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authentication token.' },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid authentication session.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { sinkType, tokens, merchItemId } = body;

    if (!sinkType || !tokens || typeof tokens !== 'number' || tokens <= 0) {
      return NextResponse.json(
        { error: 'Invalid parameters: sinkType and positive tokens amount required.' },
        { status: 400 }
      );
    }

    const quote = quoteUtilitySinkConversion({
      sinkType: sinkType as UtilitySinkType,
      tokens,
      merchItemId,
    });

    return NextResponse.json({
      success: true,
      conversion: quote,
      message: `Successfully converted ${quote.tokensSpent.toLocaleString()} tokens into ${quote.utilityYieldLabel}.`,
    });
  } catch (error: any) {
    console.error('[wallet:sinks] Error executing utility conversion:', error);
    return NextResponse.json(
      { error: error.message || 'Internal error processing utility sink redemption.' },
      { status: 400 }
    );
  }
}
