import React from 'react';
import { createSSRClient } from '../../../utils/supabase/server';
import { History } from 'lucide-react';
import { EcosystemLog } from '../types';

export async function EcosystemLogWidget({ userId }: { userId: string | null }) {
  if (!userId) return null;
  const supabase = await createSSRClient();



  const { data: logRows } = await supabase
    .from('ecosystem_logs')
    .select('id, event_category, title, description, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  const logs = (logRows ?? []) as EcosystemLog[];

  return (
    <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-6 shadow-sm dark:shadow-none transition-colors duration-200">
      <div className="flex items-center gap-2 mb-6">
        <History size={18} className="text-zinc-500 dark:text-zinc-400" />
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Ecosystem Log</h3>
      </div>
      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 dark:before:via-zinc-800 before:to-transparent">
        {logs.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 pl-4">No activity yet.</p>
        ) : (
          logs.map((log) => (
            <ActivityItem
              key={log.id}
              title={log.title}
              desc={log.description}
              time={new Date(log.created_at).toLocaleDateString()}
              color={categoryColor(log.event_category)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function categoryColor(category: string): string {
  switch (category) {
    case 'achievement': return 'bg-orange-500';
    case 'tokens':      return 'bg-blue-500';
    case 'node':        return 'bg-emerald-500';
    default:            return 'bg-zinc-500';
  }
}

function ActivityItem({ title, desc, time, color }: { title: string; desc: string; time: string; color: string }) {
  return (
    <div className="relative flex items-center gap-4 pl-4 md:pl-0">
      <div className="hidden md:flex flex-col items-end w-24 shrink-0">
        <span className="text-xs text-zinc-500">{time}</span>
      </div>
      <div className={`w-2 h-2 rounded-full ${color} z-10 shadow-lg ring-4 ring-white dark:ring-[#161616] transition-colors duration-200`} />
      <div className="flex-1 bg-white dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/40 shadow-sm dark:shadow-none transition-colors duration-200">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{desc}</p>
        <span className="text-[10px] text-zinc-500 mt-2 block md:hidden">{time}</span>
      </div>
    </div>
  );
}
