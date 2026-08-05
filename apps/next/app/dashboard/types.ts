export interface DashboardProfile {
  global_hub_tokens: number;
  critterverse_elo: number;
  display_name: string;
  email: string;
  status: string;
}

export interface EdgeNode {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
}

export interface GameStat {
  game_name: string;
  matches_played: number;
  wins: number;
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

export interface GameLibraryItem {
  id: string;
  name: string;
  slug: string;
  short_desc: string;
  long_desc: string | null;
  img_url_logo: string | null;
  img_url_hero: string | null;
  url_production: string | null;
  url_staging: string | null;
  is_active: boolean;
  sort_order: number;
  tags: string[] | null;
}

export interface DashboardData {
  profile: DashboardProfile | null;
  edgeNodes: EdgeNode[];
  gameLibrary: GameLibraryItem[];
}
