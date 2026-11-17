'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@digitalcanopy/supabase';
import {
  ToggleLeft,
  ToggleRight,
  Layers,
  Sparkles,
  LayoutDashboard,
  Cpu,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import type { HubFeatureFlag, FeatureFlagCategory } from '../../../lib/services/featureFlagsService';

interface FlagsClientProps {
  initialFlags: HubFeatureFlag[];
}

export default function FlagsClient({ initialFlags }: FlagsClientProps) {
  const router = useRouter();
  const [flags, setFlags] = useState<HubFeatureFlag[]>(initialFlags);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggle = async (flag: HubFeatureFlag) => {
    const nextEnabled = !flag.enabled;
    setSavingKey(flag.key);

    // Optimistic update
    setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, enabled: nextEnabled } : f)));

    try {
      const { error } = await supabase.from('hub_feature_flags').upsert(
        {
          key: flag.key,
          name: flag.name,
          description: flag.description,
          category: flag.category,
          enabled: nextEnabled,
          metadata: flag.metadata || {},
        },
        { onConflict: 'key' }
      );

      if (error) throw error;
      showNotification(`Updated "${flag.name}" → ${nextEnabled ? 'Enabled' : 'Disabled'}`);
      router.refresh();
    } catch (err: any) {
      console.error('[FlagsClient] Upsert failed:', err);
      // Rollback optimistic update
      setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, enabled: flag.enabled } : f)));
      showNotification(`Failed to update ${flag.key}: ${err.message || 'Database error'}`, 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const filteredFlags = flags.filter((f) => {
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const cardCount = flags.filter((f) => f.category === 'card' && f.enabled).length;
  const widgetCount = flags.filter((f) => f.category === 'widget' && f.enabled).length;
  const totalEnabled = flags.filter((f) => f.enabled).length;

  return (
    <div className="space-y-6">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111] border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase font-semibold">Active Cards</p>
            <p className="text-2xl font-bold font-mono text-white mt-1">{cardCount}</p>
          </div>
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Sparkles size={20} />
          </div>
        </div>

        <div className="bg-[#111] border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase font-semibold">Active Widgets</p>
            <p className="text-2xl font-bold font-mono text-white mt-1">{widgetCount}</p>
          </div>
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <LayoutDashboard size={20} />
          </div>
        </div>

        <div className="bg-[#111] border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase font-semibold">Total Enabled</p>
            <p className="text-2xl font-bold font-mono text-white mt-1">
              {totalEnabled} / {flags.length}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Cpu size={20} />
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/60 border-red-500/30 text-red-300'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1 bg-[#111] p-1 rounded-lg border border-zinc-800">
          {[
            { id: 'all', label: 'All Flags' },
            { id: 'card', label: 'Launchpad Cards' },
            { id: 'widget', label: 'Widgets' },
            { id: 'system', label: 'System' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search flags or keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-8 pr-3 py-1.5 bg-[#111] border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 outline-none focus:border-zinc-700 transition-colors"
          />
        </div>
      </div>

      {/* Flags Table */}
      <div className="bg-[#111] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-[#161616]">
                <th className="p-4 font-semibold text-zinc-400">Parameter / Flag</th>
                <th className="p-4 font-semibold text-zinc-400">Key</th>
                <th className="p-4 font-semibold text-zinc-400">Category</th>
                <th className="p-4 font-semibold text-zinc-400">Description</th>
                <th className="p-4 font-semibold text-zinc-400 text-right">Status / Visibility</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlags.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500 text-xs">
                    No feature flags match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFlags.map((flag) => {
                  const isBusy = savingKey === flag.key;
                  return (
                    <tr
                      key={flag.key}
                      className="border-b border-zinc-800/50 hover:bg-[#161616] transition-colors"
                    >
                      <td className="p-4">
                        <span className="font-semibold text-white block">{flag.name}</span>
                      </td>
                      <td className="p-4 font-mono text-xs text-zinc-500">{flag.key}</td>
                      <td className="p-4">
                        <CategoryBadge category={flag.category} />
                      </td>
                      <td className="p-4 text-xs text-zinc-400 max-w-xs">{flag.description || '—'}</td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggle(flag)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            flag.enabled
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                              : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800 border border-zinc-700/50'
                          } disabled:opacity-50`}
                          title={`Click to ${flag.enabled ? 'disable' : 'enable'}`}
                        >
                          {flag.enabled ? (
                            <>
                              <ToggleRight size={16} className="text-emerald-400" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft size={16} className="text-zinc-500" />
                              <span>Hidden</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: FeatureFlagCategory }) {
  switch (category) {
    case 'card':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          Card
        </span>
      );
    case 'widget':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          Widget
        </span>
      );
    case 'system':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          System
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
          General
        </span>
      );
  }
}
