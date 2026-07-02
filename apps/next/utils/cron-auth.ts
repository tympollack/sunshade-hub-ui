import { NextRequest, NextResponse } from 'next/server';

/**
 * Verifies the incoming request carries a valid CRON_SECRET Bearer token.
 * Returns null if auth passes, or a NextResponse to return immediately if it fails.
 *
 * Usage in any cron route:
 *   const authError = verifyCronAuth(req);
 *   if (authError) return authError;
 */
export function verifyCronAuth(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET env var is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
