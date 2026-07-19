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
    return { userId: null, profile: null, edgeNodes: [] };
  }

  const [
    { data: profileRow },
    { data: edgeRows },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, global_hub_tokens, critterverse_elo, status')
      .eq('id', user.id)
      .maybeSingle(),

    supabase
      .from('edge_nodes')
      .select('id, name, status')
      .eq('user_id', user.id),
  ]);

  const profile: DashboardProfile | null = profileRow
    ? {
        display_name: profileRow.display_name,
        email: user.email ?? '',
        global_hub_tokens: profileRow.global_hub_tokens ?? 0,
        critterverse_elo: profileRow.critterverse_elo ?? 1200,
        status: profileRow.status ?? 'pending_invite',
      }
    : null;

  return {
    userId: user.id,
    profile,
    edgeNodes: (edgeRows ?? []) as EdgeNode[],
  };
}
