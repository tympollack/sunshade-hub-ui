'use client';

import React, { useState } from 'react';
import { supabase } from '@sunshade/supabase';
import { Edit, Eye, EyeOff } from 'lucide-react';
import type { GameLibraryItem } from '../../dashboard/types';

export default function LibraryClient({ initialGames }: { initialGames: GameLibraryItem[] }) {
  const [games, setGames] = useState<GameLibraryItem[]>(initialGames);
  const [isSaving, setIsSaving] = useState(false);

  const toggleActive = async (id: string, currentStatus: boolean) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('game_library')
        .update({ is_active: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      setGames(games.map(g => g.id === id ? { ...g, is_active: !currentStatus } : g));
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#111] border border-zinc-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-[#161616]">
              <th className="p-4 font-semibold text-zinc-400">App Name</th>
              <th className="p-4 font-semibold text-zinc-400">Slug</th>
              <th className="p-4 font-semibold text-zinc-400">Category</th>
              <th className="p-4 font-semibold text-zinc-400">Order</th>
              <th className="p-4 font-semibold text-zinc-400 text-center">Status</th>
              <th className="p-4 font-semibold text-zinc-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {games.map(game => (
              <tr key={game.id} className="border-b border-zinc-800/50 hover:bg-[#161616] transition-colors">
                <td className="p-4 font-medium text-white">{game.name}</td>
                <td className="p-4 text-zinc-500 font-mono">{game.slug}</td>
                <td className="p-4 text-zinc-400">{game.tags?.join(', ') || 'none'}</td>
                <td className="p-4 text-zinc-400">{game.sort_order}</td>
                <td className="p-4 text-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${game.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    {game.is_active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    disabled={isSaving}
                    onClick={() => toggleActive(game.id, game.is_active)}
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors disabled:opacity-50 inline-flex"
                    title={game.is_active ? "Hide Game" : "Publish Game"}
                  >
                    {game.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button 
                    disabled={isSaving}
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-orange-400 transition-colors disabled:opacity-50 inline-flex ml-1 cursor-not-allowed"
                    title="Edit (Coming Soon)"
                  >
                    <Edit size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
