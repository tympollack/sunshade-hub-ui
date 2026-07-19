'use client';

import { toggleTaskStatus } from './actions';

type Task = {
  id: string;
  title: string;
  description: string;
  cadence: string;
  reward_amount: number;
  target_app: string;
  is_active: boolean;
};

export default function TaskRow({ task }: { task: Task }) {
  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${task.is_active ? 'bg-[#111] border-zinc-800' : 'bg-[#0a0a0a] border-zinc-900 opacity-60'}`}>
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h3 className={`font-semibold ${task.is_active ? 'text-white' : 'text-zinc-500 line-through'}`}>{task.title}</h3>
          <span className="text-[10px] uppercase tracking-wider bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
            {task.cadence}
          </span>
          <span className="text-[10px] uppercase tracking-wider bg-indigo-900/30 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">
            {task.target_app}
          </span>
        </div>
        <p className="text-sm text-zinc-500">{task.description}</p>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase">Reward</p>
          <p className="text-sm font-mono text-orange-400">+{task.reward_amount} HT</p>
        </div>
        
        <button 
          onClick={() => toggleTaskStatus(task.id, !task.is_active)}
          className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
            task.is_active 
              ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' 
              : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
          }`}
        >
          {task.is_active ? 'Disable' : 'Enable'}
        </button>
      </div>
    </div>
  );
}
