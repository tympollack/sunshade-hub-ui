import React from 'react';
import { createSSRClient } from '../../../utils/supabase/server';
import { Swords } from 'lucide-react';
import { MatchHistoryRow, GameStat } from '../types';

export async function ChessWidget({ userId }: { userId: string | null }) {
  if (!userId) return null;
  const supabase = await createSSRClient();


  const [
    { data: statsRow },
    { data: matchRows },
  ] = await Promise.all([
    supabase
      .from('game_stats')
      .select('game_name, matches_played, wins, win_rate, local_currency, achievements_unlocked, achievements_total')
      .eq('user_id', userId)
      .eq('game_name', 'SunShade Chess')
      .maybeSingle(),

    supabase
      .from('match_history')
      .select('id, game_name, opponent_name, result, match_type, moves, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const chess = statsRow as GameStat | null;
  const recentMatches = (matchRows ?? []) as MatchHistoryRow[];

  const isStaging = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const gameUrl = isStaging ? 'https://chess-stag.sunshade.icu' : 'https://chess.sunshade.icu';

  return (
    <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-6 shadow-sm dark:shadow-none transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors duration-200">
            <Swords size={20} className="text-zinc-600 dark:text-zinc-300" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">SunShade Chess</h3>
        </div>
        <a href={gameUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:hover:text-orange-300 font-medium transition-colors duration-200">View Game</a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatBox label="Matches Played" value={chess ? String(chess.matches_played) : '—'} />
        <StatBox label="Win Rate" value={chess ? `${Math.round(chess.win_rate * 100)}%` : '—'} />
        <StatBox label="Local Currency" value={chess ? `${chess.local_currency.toLocaleString()} CP` : '—'} />
        <StatBox label="Achievements" value={chess ? `${chess.achievements_unlocked}/${chess.achievements_total}` : '—'} />
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Recent Matches</h4>
        {recentMatches.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No matches yet.</p>
        ) : (
          recentMatches.map((m) => (
            <MatchRow key={m.id} result={m.result as 'Victory' | 'Defeat' | 'Draw'} opponent={m.opponent_name} format={m.match_type} moves={m.moves} />
          ))
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800/40 transition-colors duration-200">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{value}</p>
    </div>
  );
}

function MatchRow({ result, opponent, format, moves }: { result: 'Victory' | 'Defeat' | 'Draw'; opponent: string; format: string; moves: number }) {
  const isWin = result === 'Victory';
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors duration-200 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${isWin ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{result} vs {opponent}</p>
          <p className="text-xs text-zinc-500">{format} • {moves} moves</p>
        </div>
      </div>
      <button className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-3 py-1.5 rounded bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Review</button>
    </div>
  );
}
