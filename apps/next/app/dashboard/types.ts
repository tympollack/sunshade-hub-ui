export interface DashboardProfile {
  id?: string;
  global_hub_tokens: number;
  critterverse_elo: number;
  display_name: string;
  email: string;
  status: string;
  wallet_address?: string | null;
  reputation_score?: number;
  created_at?: string;
  citizen_tier?: string;
  gamer_tag?: string;
  avatar_url?: string | null;
}

export interface EdgeNode {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
  ip_address?: string;
  region?: string;
  latency_ms?: number;
  cpu_usage_pct?: number;
  memory_usage_pct?: number;
  uptime?: string;
  version?: string;
}

export interface PointsLedgerItem {
  id: string;
  user_id: string;
  amount: number;
  reason: 'match_win' | 'achievement' | 'daily_login' | 'purchase' | 'governance_reward' | 'quest_complete' | string;
  reference_id?: string | null;
  created_at: string;
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  reward_tokens?: number;
  reward_points?: number;
  game?: string;
  unlocked?: boolean;
  unlocked_at?: string;
  icon?: string;
  rarity?: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

export interface MedicalRecord {
  id: string;
  record_type: string;
  title: string;
  facility: string;
  date: string;
  status: 'verified' | 'pending' | 'archived';
  encryption_standard: string;
  hash: string;
}

export interface BioTelemetryDevice {
  id: string;
  device_name: string;
  type: string;
  battery_pct: number;
  status: 'streaming' | 'standby' | 'disconnected';
  last_sync: string;
}

export interface GameStat {
  id?: string;
  game_name: string;
  matches_played: number;
  wins: number;
  win_rate: number;
  local_currency: number;
  achievements_unlocked: number;
  achievements_total: number;
  elo_rating?: number;
  rank_title?: string;
  high_score?: number;
  updated_at?: string;
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
  version?: string;
  developer?: string;
}

export interface HubNotification {
  id: string;
  category: 'announcement' | 'reward' | 'node' | 'security' | 'general';
  title: string;
  message: string;
  created_at: string;
  is_read?: boolean;
  link?: string;
  action_label?: string;
}

export interface DashboardData {
  profile: DashboardProfile | null;
  edgeNodes: EdgeNode[];
  gameLibrary: GameLibraryItem[];
  ledgerHistory: PointsLedgerItem[];
  gameStats: GameStat[];
  hubAchievements: AchievementBadge[];
  chessAchievements: AchievementBadge[];
  userHubUnlocks: Record<string, boolean>;
  userChessUnlocks: Record<string, boolean>;
  hubEvents: any[];
  notifications: HubNotification[];
}
