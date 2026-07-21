import { createSSRClient } from '../../../utils/supabase/server';
import LibraryClient from './LibraryClient';

export const metadata = {
  title: 'Game Library | Admin Console',
};

export default async function AdminLibraryPage() {
  const supabase = await createSSRClient();
  const { data: games } = await supabase.from('game_library').select('*').order('sort_order', { ascending: true });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Game Library Management</h1>
        <p className="text-sm text-zinc-400">Configure catalog, set active status, and audit library updates.</p>
      </div>

      <LibraryClient initialGames={games || []} />
    </div>
  );
}
