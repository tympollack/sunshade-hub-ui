'use client';

import React from 'react';
import type { AchievementBadge } from '../types';
import { SkeletonTable } from './DashboardUiPrimitives';

export interface DashboardAchievementsProps {
  isLoading: boolean;
  hubAchievements: AchievementBadge[];
  chessAchievements: AchievementBadge[];
  userHubUnlocks: Record<string, boolean>;
  userChessUnlocks: Record<string, boolean>;
  onToggleHubAchievement: (id: string, unlocked: boolean) => void;
  onToggleChessAchievement: (id: string, unlocked: boolean) => void;
}

export function DashboardAchievements({
  isLoading,
  hubAchievements,
  chessAchievements,
  userHubUnlocks,
  userChessUnlocks,
  onToggleHubAchievement,
  onToggleChessAchievement,
}: DashboardAchievementsProps) {
  return (
    <div className="space-y-6">
      {/* Hub Achievements table */}
      <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-6 shadow-sm dark:shadow-none transition-colors duration-200">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Global Hub Achievements</h3>
        {isLoading ? (
          <SkeletonTable />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="p-3 text-zinc-500 dark:text-zinc-400 font-medium">Status</th>
                  <th className="p-3 text-zinc-500 dark:text-zinc-400 font-medium">Name</th>
                  <th className="p-3 text-zinc-500 dark:text-zinc-400 font-medium">Description</th>
                  <th className="p-3 text-zinc-500 dark:text-zinc-400 font-medium">Reward (HT)</th>
                </tr>
              </thead>
              <tbody>
                {hubAchievements.map((ach) => (
                  <tr
                    key={ach.id}
                    className={`border-b border-zinc-100 dark:border-zinc-800/50 transition-all duration-200 ${
                      userHubUnlocks[ach.id] ? 'opacity-100' : 'opacity-60'
                    }`}
                  >
                    <td className="p-3">
                      <button
                        onClick={() => onToggleHubAchievement(ach.id, !!userHubUnlocks[ach.id])}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          userHubUnlocks[ach.id]
                            ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {userHubUnlocks[ach.id] ? 'Unlocked' : 'Locked'}
                      </button>
                    </td>
                    <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-200">{ach.name}</td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-400">{ach.description}</td>
                    <td className="p-3 text-orange-600 dark:text-orange-400 font-mono">+{ach.reward_tokens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chess Achievements table */}
      <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-6 shadow-sm dark:shadow-none transition-colors duration-200">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">SunShade Chess Achievements (Local)</h3>
        {isLoading ? (
          <SkeletonTable />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="p-3 text-zinc-500 dark:text-zinc-400 font-medium">Status</th>
                  <th className="p-3 text-zinc-500 dark:text-zinc-400 font-medium">Name</th>
                  <th className="p-3 text-zinc-500 dark:text-zinc-400 font-medium">Description</th>
                  <th className="p-3 text-zinc-500 dark:text-zinc-400 font-medium">Reward (CP)</th>
                </tr>
              </thead>
              <tbody>
                {chessAchievements.map((ach) => (
                  <tr
                    key={ach.id}
                    className={`border-b border-zinc-100 dark:border-zinc-800/50 transition-all duration-200 ${
                      userChessUnlocks[ach.id] ? 'opacity-100' : 'opacity-60'
                    }`}
                  >
                    <td className="p-3">
                      <button
                        onClick={() => onToggleChessAchievement(ach.id, !!userChessUnlocks[ach.id])}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          userChessUnlocks[ach.id]
                            ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {userChessUnlocks[ach.id] ? 'Unlocked' : 'Locked'}
                      </button>
                    </td>
                    <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-200">{ach.name}</td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-400">{ach.description}</td>
                    <td className="p-3 text-blue-600 dark:text-blue-400 font-mono">+{ach.reward_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
