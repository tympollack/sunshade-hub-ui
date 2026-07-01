import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';

function currentIsoWeekKey(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * GET /api/leaderboard/:scope
 * Returns the top entries for a scope (game_id or 'hub').
 * Auth: public — leaderboards have a public RLS read policy.
 *
 * Query params:
 *   period_type  weekly | monthly | alltime  (default: weekly)
 *   period_key   e.g. '2026-W26', '2026-06', 'alltime'  (omit for current period)
 *   limit        1–100 (default: 50)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scope: string }> }
) {
  const { scope } = await params;
  const { searchParams } = req.nextUrl;

  const periodType = searchParams.get('period_type') ?? 'weekly';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  let periodKey = searchParams.get('period_key');
  if (!periodKey) {
    const now = new Date();
    if (periodType === 'alltime') {
      periodKey = 'alltime';
    } else if (periodType === 'monthly') {
      periodKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    } else {
      periodKey = currentIsoWeekKey(now);
    }
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('profile_id, score, updated_at')
    .eq('period_type', periodType)
    .eq('period_key', periodKey)
    .eq('scope', scope)
    .order('score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('GET /api/leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }

  return NextResponse.json({ scope, period_type: periodType, period_key: periodKey, entries: data });
}
