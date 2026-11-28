'use client';

import React from 'react';
import { Award, Flame, ShieldAlert, Anchor, Crown, Compass, Sparkles } from 'lucide-react';
import { AtmosphericBadge } from '@digitalcanopy/ui';
import type { CastLedgerBadge, CastLedgerEntry } from '@digitalcanopy/reels-engine';

export interface CastLedgerBadgesProps {
  entries: CastLedgerEntry[];
  compact?: boolean;
}

const BADGE_CATALOG: Array<{
  badge: CastLedgerBadge;
  title: string;
  criteria: string;
  icon: React.ReactNode;
}> = [
  {
    badge: 'SNAKE_EYES',
    title: 'Snake Eyes Survivor',
    criteria: 'Recover from a double-1 misfire via blind skill check.',
    icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
  },
  {
    badge: 'GAME_MASTER',
    title: 'Game Master',
    criteria: 'Win with 3+ blind skill checks at ≥90% precision.',
    icon: <Crown className="w-4 h-4 text-amber-400" />,
  },
  {
    badge: 'SECOND_WIND',
    title: 'Second Wind',
    criteria: 'Win a match after dropping below 12% win probability.',
    icon: <Flame className="w-4 h-4 text-orange-400" />,
  },
  {
    badge: 'SMUGGLER_KING',
    title: 'Smuggler King',
    criteria: 'Win with 3+ contraband holds or a Miracle haul ≥1,000.',
    icon: <Compass className="w-4 h-4 text-cyan-400" />,
  },
  {
    badge: 'GHOST_SHIP',
    title: 'Ghost Ship',
    criteria: 'Survive or win at critical hull integrity (≤5%).',
    icon: <Anchor className="w-4 h-4 text-emerald-400" />,
  },
  {
    badge: 'AGAINST_ALL_ODDS',
    title: 'Against All Odds',
    criteria: 'Defy elimination from below 5% win probability.',
    icon: <Sparkles className="w-4 h-4 text-fuchsia-400" />,
  },
];

export function CastLedgerBadges({ entries, compact = false }: CastLedgerBadgesProps) {
  const byBadge = new Map<CastLedgerBadge, CastLedgerEntry>();
  for (const entry of entries) {
    if (!byBadge.has(entry.badge)) {
      byBadge.set(entry.badge, entry);
    }
  }

  return (
    <div data-testid="cast-ledger-badges" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
            Cast Ledger Prestige Badges
          </h4>
        </div>
        <AtmosphericBadge
          label={`${byBadge.size} / ${BADGE_CATALOG.length} Unlocked`}
          variant={byBadge.size > 0 ? 'cozy' : 'neutral'}
          size="sm"
        />
      </div>

      <div className={`grid gap-2.5 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {BADGE_CATALOG.map((meta) => {
          const unlocked = byBadge.get(meta.badge);
          return (
            <div
              key={meta.badge}
              data-testid={`cast-badge-${meta.badge}`}
              data-unlocked={unlocked ? 'true' : 'false'}
              className={`rounded-xl border p-3 transition-colors ${
                unlocked
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-zinc-900/40 border-zinc-800/70 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                    {meta.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-100">{meta.title}</p>
                    <p className="text-[10px] font-mono text-zinc-400">{meta.badge}</p>
                  </div>
                </div>
                <AtmosphericBadge
                  label={unlocked ? 'Earned' : 'Locked'}
                  variant={unlocked ? 'success' : 'neutral'}
                  size="sm"
                />
              </div>

              <p className="text-[11px] text-zinc-400 mt-2">
                {unlocked ? unlocked.summary : meta.criteria}
              </p>

              {unlocked?.miracleSeedHash && (
                <p className="text-[10px] font-mono text-amber-300/80 mt-1.5 truncate">
                  {`Roll #${unlocked.rollIndex} • Seed ${unlocked.miracleSeedHash.slice(0, 12)}…`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
