import { createSSRClient } from '../../utils/supabase/server';
import type {
  DashboardProfile,
  EdgeNode,
  GameStat,
  MatchHistoryRow,
  EcosystemLog,
  DashboardData,
} from './types';

export async function getDashboardData(): Promise<DashboardData & { userId: string | null }> {
  const supabase = await createSSRClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, profile: null, edgeNodes: [], gameStats: null, matchHistory: [], ecosystemLogs: [] };
  }

  const [
    { data: profileRow },
    { data: edgeRows },
    { data: statsRow },
    { data: matchRows },
    { data: logRows },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, global_hub_tokens, critterverse_elo')
      .eq('id', user.id)
      .maybeSingle(),

    supabase
      .from('edge_nodes')
      .select('id, name, status')
      .eq('user_id', user.id),

    supabase
      .from('game_stats')
      .select('game_name, matches_played, wins, win_rate, local_currency, achievements_unlocked, achievements_total')
      .eq('user_id', user.id)
      .eq('game_name', 'SunShade Chess')
      .maybeSingle(),

    supabase
      .from('match_history')
      .select('id, game_name, opponent_name, result, match_type, moves, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('ecosystem_logs')
      .select('id, event_category, title, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const profile: DashboardProfile | null = profileRow
    ? {
        display_name: profileRow.display_name,
        email: user.email ?? '',
        global_hub_tokens: profileRow.global_hub_tokens ?? 0,
        critterverse_elo: profileRow.critterverse_elo ?? 1200,
      }
    : null;

  return {
    userId: user.id,
    profile,
    edgeNodes: (edgeRows ?? []) as EdgeNode[],
    gameStats: (statsRow ?? null) as GameStat | null,
    matchHistory: (matchRows ?? []) as MatchHistoryRow[],
    ecosystemLogs: (logRows ?? []) as EcosystemLog[],
  };
}
