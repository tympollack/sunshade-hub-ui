'use client';

import React from 'react';
import { Swords } from 'lucide-react';
import { Skeleton } from '@digitalcanopy/ui';

export function SkeletonTable() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} height={40} className="rounded" />
      ))}
    </div>
  );
}

export function GameLibraryCard({ game, onSelect }: { game: any; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className="group flex flex-col items-center gap-2 outline-none">
      <div className="w-full aspect-square bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700/50 overflow-hidden transition-all duration-200 group-hover:border-orange-500/50 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.1)] group-focus-visible:ring-2 group-focus-visible:ring-orange-500">
        {game.image_url ? (
          <img src={game.image_url} alt={game.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <Swords size={32} className="text-zinc-400 dark:text-zinc-500" />
        )}
      </div>
      <h3 className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 text-center leading-tight">{game.title}</h3>
    </button>
  );
}

export function MobileNavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-1.5 min-w-[50px] transition-colors ${active ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}>
      {icon}
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );
}

export function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <a href="#" onClick={(e) => { e.preventDefault(); onClick?.(); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${active ? 'bg-orange-50 dark:bg-orange-600/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border border-transparent'}`}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </a>
  );
}

export function MetricCard({ title, value, trend, icon }: { title: string; value: string; trend: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-4 sm:p-5 shadow-sm dark:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-colors">
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 leading-tight pr-2">{title}</p>
        <div className="p-1.5 sm:p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg transition-colors duration-200 shrink-0">{icon}</div>
      </div>
      <h4 className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white mb-1">{value}</h4>
      <p className="text-[10px] sm:text-xs text-zinc-500">{trend}</p>
    </div>
  );
}
