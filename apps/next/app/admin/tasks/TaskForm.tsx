'use client';

import { useState, useRef } from 'react';
import { upsertTask } from './actions';
import { Plus, X } from 'lucide-react';

export default function TaskForm() {
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    await upsertTask(formData);
    setIsOpen(false);
    formRef.current?.reset();
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
      >
        <Plus size={16} />
        New Task
      </button>
    );
  }

  return (
    <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl mb-8 relative">
      <button 
        onClick={() => setIsOpen(false)}
        className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
      >
        <X size={20} />
      </button>
      <h2 className="text-lg font-bold text-white mb-6">Configure New Task</h2>
      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase">Title</label>
            <input name="title" required className="w-full bg-[#0a0a0a] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase">Target App</label>
            <input name="target_app" required placeholder="e.g. pukhuk, second_wind" className="w-full bg-[#0a0a0a] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-400 uppercase">Description</label>
          <textarea name="description" className="w-full bg-[#0a0a0a] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 min-h-[80px]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase">Cadence</label>
            <select name="cadence" className="w-full bg-[#0a0a0a] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase">Reward Amount (Tokens)</label>
            <input name="reward_amount" type="number" defaultValue="100" required className="w-full bg-[#0a0a0a] border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <input type="hidden" name="is_active" value="true" />
        <div className="pt-4 flex justify-end">
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors">
            Save Task
          </button>
        </div>
      </form>
    </div>
  );
}
