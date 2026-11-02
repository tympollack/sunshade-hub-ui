import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '../../../../../lib/supabase-server';
import { verifyRedemptionEligibility } from '../../../../../lib/services/complianceGateService';

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
    const requestedUsdCents = Number(body.requestedUsdCents);

    if (!requestedUsdCents || requestedUsdCents <= 0 || !Number.isInteger(requestedUsdCents)) {
      return NextResponse.json(
        { error: 'Invalid redemption amount. Must be a positive integer in cents.' },
        { status: 400 }
      );
    }

    // Verify tax and FinCEN compliance circuit-breaker
    const eligibility = await verifyRedemptionEligibility(user.id, requestedUsdCents);

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: eligibility.message,
          code: eligibility.status,
          redirectUrl: eligibility.redirectUrl,
          ytdFiatRedeemedCents: eligibility.ytdFiatRedeemedCents,
          projectedTotalCents: eligibility.projectedTotalCents,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      eligibility,
      message: 'Redemption request passed IRS compliance gate and is queued for epoch settlement.',
    });
  } catch (error: any) {
    console.error('[wallet:redeem] Internal redemption error:', error);
    return NextResponse.json(
      { error: 'Internal server error while processing redemption eligibility.' },
      { status: 500 }
    );
  }
}
