export interface DashboardProfile {
  global_hub_tokens: number;
  critterverse_elo: number;
  display_name: string;
  email: string;
}

export interface EdgeNode {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
}

export interface GameStat {
  game_name: string;
  matches_played: number;
  win_rate: number;
  local_currency: number;
  achievements_unlocked: number;
  achievements_total: number;
}

export interface MatchHistoryRow {
  id: string;
  game_name: string;
  opponent_name: string;
  result: 'Victory' | 'Defeat' | 'Draw';
  match_type: string;
  moves: number;
  created_at: string;
}

export interface EcosystemLog {
  id: string;
  event_category: string;
  title: string;
  description: string;
  created_at: string;
}

export interface DashboardData {
  profile: DashboardProfile | null;
  edgeNodes: EdgeNode[];
  gameStats: GameStat | null;
  matchHistory: MatchHistoryRow[];
  ecosystemLogs: EcosystemLog[];
}
