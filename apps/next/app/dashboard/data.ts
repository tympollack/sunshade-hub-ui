import { createSSRClient } from '../../utils/supabase/server';
import type {
  DashboardProfile,
  EdgeNode,
  DashboardData,
  GameStat,
  AchievementBadge,
  PointsLedgerItem,
  HubNotification,
} from './types';

export async function getDashboardData(): Promise<DashboardData & { userId: string | null }> {
  const supabase = await createSSRClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      profile: null,
      edgeNodes: [],
      gameLibrary: [],
      ledgerHistory: [],
      gameStats: [],
      hubAchievements: [],
      chessAchievements: [],
      userHubUnlocks: {},
      userChessUnlocks: {},
      hubEvents: [],
      notifications: [],
    };
  }

  const [
    { data: profileRow },
    { data: edgeRows },
    { data: gameLibraryRows },
    { data: hubLedgerRows },
    { data: gameStatsRows },
    { data: hubAchRows },
    { data: userHubAchRows },
    { data: chessAchRows },
    { data: userChessAchRows },
    { data: eventsRows },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, global_hub_tokens, critterverse_elo, status, wallet_address, reputation_score, created_at, role')
      .eq('id', user.id)
      .maybeSingle(),

    supabase
      .from('edge_nodes')
      .select('id, name, status, ip_address, region, latency_ms, cpu_usage_pct, memory_usage_pct, uptime, version')
      .eq('user_id', user.id),

    supabase
      .from('game_library')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    supabase
      .from('hub_tokens_ledger')
      .select('id, user_id, amount, reason, reference_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('game_stats')
      .select('*')
      .eq('user_id', user.id),

    supabase
      .from('hub_achievements')
      .select('*'),

    supabase
      .from('user_hub_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', user.id),

    supabase
      .schema('chess')
      .from('achievements')
      .select('*'),

    supabase
      .schema('chess')
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', user.id),

    supabase
      .from('hub_events')
      .select('*')
      .eq('is_active', true)
      .order('start_time', { ascending: false }),
  ]);

  const profile: DashboardProfile | null = profileRow
    ? {
        id: user.id,
        display_name: profileRow.display_name,
        email: user.email ?? '',
        global_hub_tokens: profileRow.global_hub_tokens ?? 0,
        critterverse_elo: profileRow.critterverse_elo ?? 1200,
        status: profileRow.status ?? 'pending_invite',
        wallet_address: profileRow.wallet_address ?? null,
        reputation_score: profileRow.reputation_score ?? 100,
        created_at: profileRow.created_at ?? new Date().toISOString(),
        citizen_tier:
          (profileRow.global_hub_tokens ?? 0) >= 5000
            ? 'Founder Citizen'
            : (profileRow.global_hub_tokens ?? 0) >= 1000
            ? 'Core Citizen'
            : 'Active Citizen',
        avatar_url: user.user_metadata?.avatar_url ?? null,
      }
    : null;

  const userHubUnlocks: Record<string, boolean> = {};
  userHubAchRows?.forEach((r) => {
    userHubUnlocks[r.achievement_id] = true;
  });

  const userChessUnlocks: Record<string, boolean> = {};
  userChessAchRows?.forEach((r) => {
    userChessUnlocks[r.achievement_id] = true;
  });

  const hubAchievements: AchievementBadge[] = (hubAchRows ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    reward_tokens: a.reward_tokens,
    game: 'SunShade Hub',
    unlocked: !!userHubUnlocks[a.id],
    rarity: (a.reward_tokens ?? 0) >= 1000 ? 'Legendary' : (a.reward_tokens ?? 0) >= 500 ? 'Epic' : 'Rare',
  }));

  const chessAchievements: AchievementBadge[] = (chessAchRows ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    reward_points: a.reward_points,
    game: 'SunShade Chess',
    unlocked: !!userChessUnlocks[a.id],
    rarity: (a.reward_points ?? 0) >= 1000 ? 'Legendary' : (a.reward_points ?? 0) >= 500 ? 'Epic' : (a.reward_points ?? 0) >= 100 ? 'Rare' : 'Common',
  }));

  const ledgerHistory: PointsLedgerItem[] = (hubLedgerRows ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    amount: r.amount,
    reason: r.reason || 'reward',
    reference_id: r.reference_id,
    created_at: r.created_at,
  }));

  const gameStats: GameStat[] = (gameStatsRows ?? []).map((s) => ({
    id: s.id,
    game_name: s.game_name,
    matches_played: s.matches_played ?? 0,
    wins: s.wins ?? 0,
    win_rate: s.win_rate ?? 0,
    local_currency: s.local_currency ?? 0,
    achievements_unlocked: s.achievements_unlocked ?? 0,
    achievements_total: s.achievements_total ?? 0,
    updated_at: s.updated_at,
  }));

  // Build dynamic notifications from ledger, nodes, and system events
  const notifications: HubNotification[] = [];

  // 1. Welcome announcement
  notifications.push({
    id: 'notif-welcome',
    category: 'announcement',
    title: 'Welcome to SunShade Hub Alpha',
    message: 'Welcome to the SunShade Network Genesis Hub. Connect edge nodes, explore multiplayer titles, and claim cross-app ecosystem rewards.',
    created_at: profileRow?.created_at || new Date().toISOString(),
    link: '#',
    action_label: 'Explore Games',
  });

  // 2. Token reward notifications from recent ledger items
  ledgerHistory.slice(0, 3).forEach((item) => {
    notifications.push({
      id: `notif-reward-${item.id}`,
      category: 'reward',
      title: `+${item.amount} HT Reward Claimed`,
      message: `You received ${item.amount} Hub Tokens for ${item.reason.replace(/_/g, ' ')} (Ref: ${item.reference_id || 'REWARD'}).`,
      created_at: item.created_at,
    });
  });

  // 3. Edge node cluster health notifications
  const onlineCount = (edgeRows ?? []).filter((n) => n.status === 'online').length;
  if (edgeRows && edgeRows.length > 0) {
    notifications.push({
      id: 'notif-nodes',
      category: 'node',
      title: 'Edge Compute Cluster Status',
      message: `${onlineCount} of ${edgeRows.length} registered edge nodes are active and syncing telemetry.`,
      created_at: new Date().toISOString(),
    });
  }

  // 4. Security notifications
  if (profileRow?.wallet_address) {
    notifications.push({
      id: 'notif-wallet-linked',
      category: 'security',
      title: 'Web3 Identity Wallet Linked',
      message: `Your citizen account is verified with wallet ${profileRow.wallet_address.substring(0, 6)}...${profileRow.wallet_address.substring(profileRow.wallet_address.length - 4)}.`,
      created_at: profileRow.created_at || new Date().toISOString(),
    });
  }

  return {
    userId: user.id,
    profile,
    edgeNodes: (edgeRows ?? []) as EdgeNode[],
    gameLibrary: (gameLibraryRows ?? []) as any[],
    ledgerHistory,
    gameStats,
    hubAchievements,
    chessAchievements,
    userHubUnlocks,
    userChessUnlocks,
    hubEvents: (eventsRows ?? []) as any[],
    notifications,
  };
}
