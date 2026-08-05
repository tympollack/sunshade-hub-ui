'use client';

import { useHubPresence } from '../../hooks/useHubPresence';
import { Activity } from 'lucide-react';

export default function TelemetryLive() {
  const { onlineCount } = useHubPresence(undefined); // Admin doesn't need to broadcast their own status if we don't pass an ID, or we can just pass 'admin'

  // In a fully featured implementation, presence state would include the active app 
  // (e.g. { app: 'pukhuk' }) which we could group by. 
  // For now, we mock the segmentation based on the total online count.
  const idleCount = Math.floor(onlineCount * 0.4);
  const pukHukCount = Math.floor(onlineCount * 0.35);
  const secondWindCount = onlineCount - idleCount - pukHukCount;

  return (
    <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 opacity-10">
        <Activity size={64} />
      </div>
      <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-6">Live Network Traffic</h3>
      
      <div className="flex items-end gap-3 mb-8">
        <span className="text-4xl font-bold text-white">{onlineCount}</span>
        <span className="text-sm text-emerald-400 mb-1 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Active Connections
        </span>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold text-zinc-400">
            <span>Idle in Hub</span>
            <span>{idleCount}</span>
          </div>
          <div className="w-full bg-[#0a0a0a] rounded-full h-1.5">
            <div className="bg-zinc-600 h-1.5 rounded-full" style={{ width: `${(idleCount / Math.max(onlineCount, 1)) * 100}%` }}></div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold text-zinc-400">
            <span>Puk Huk</span>
            <span>{pukHukCount}</span>
          </div>
          <div className="w-full bg-[#0a0a0a] rounded-full h-1.5">
            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(pukHukCount / Math.max(onlineCount, 1)) * 100}%` }}></div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold text-zinc-400">
            <span>Second Wind</span>
            <span>{secondWindCount}</span>
          </div>
          <div className="w-full bg-[#0a0a0a] rounded-full h-1.5">
            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(secondWindCount / Math.max(onlineCount, 1)) * 100}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
