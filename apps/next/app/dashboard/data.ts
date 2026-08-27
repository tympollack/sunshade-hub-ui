import { createSSRClient } from '../../utils/supabase/server';
import type {
  DashboardProfile,
  EdgeNode,
  DashboardData,
} from './types';

export async function getDashboardData(): Promise<DashboardData & { userId: string | null }> {
  const supabase = await createSSRClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, profile: null, edgeNodes: [], gameLibrary: [], ledgerHistory: [] };
  }

  const [
    { data: profileRow },
    { data: edgeRows },
    { data: gameLibraryRows },
    { data: ledgerRows },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, global_hub_tokens, critterverse_elo, status, wallet_address, reputation_score, created_at')
      .eq('id', user.id)
      .maybeSingle(),

    supabase
      .from('edge_nodes')
      .select('id, name, status')
      .eq('user_id', user.id),

    supabase
      .from('game_library')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    supabase
      .from('points_ledger')
      .select('id, user_id, amount, reason, reference_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
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
        citizen_tier: (profileRow.global_hub_tokens ?? 0) >= 5000 ? 'Founder Citizen' : (profileRow.global_hub_tokens ?? 0) >= 1000 ? 'Core Citizen' : 'Active Citizen',
        avatar_url: user.user_metadata?.avatar_url ?? null,
      }
    : null;

  return {
    userId: user.id,
    profile,
    edgeNodes: (edgeRows ?? []) as EdgeNode[],
    gameLibrary: (gameLibraryRows ?? []) as any[],
    ledgerHistory: (ledgerRows ?? []) as any[],
  };
}
