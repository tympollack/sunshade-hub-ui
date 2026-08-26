'use client';

import React, { useEffect, useState } from 'react';
import { X, Play, Trophy, Crosshair, Star, ExternalLink, ShieldCheck, Sparkles, Gamepad2 } from 'lucide-react';

interface GameDetailsDrawerProps {
  game: any;
  isOpen: boolean;
  onClose: () => void;
  isGuest?: boolean;
}

export function GameDetailsDrawer({ game, isOpen, onClose, isGuest = false }: GameDetailsDrawerProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setShouldRender(false);
  };

  const handleLaunch = () => {
    if (typeof window !== 'undefined') {
      const fallbackUrl = game?.web_fallback_url || (game?.url_production ?? `https://${game?.slug}.sunshade.icu`);
      const launchUrl = game?.deep_link_scheme ? `${game.deep_link_scheme}://auth` : null;

      if (launchUrl) {
        window.location.href = launchUrl;
        setTimeout(() => {
          if (!document.hidden && fallbackUrl) {
            window.open(fallbackUrl, '_blank');
          }
        }, 600);
      } else if (fallbackUrl) {
        window.open(fallbackUrl, '_blank');
      }
    }
  };

  if (!shouldRender || !game) return null;

  // Tailored stats according to game slug
  const gameStats = getGameStats(game.slug, game.title);
  const gameBounties = getGameBounties(game.slug, game.title);

  return (
    <div
      className={`w-full bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl shadow-sm dark:shadow-none overflow-hidden flex flex-col transition-all duration-300 ease-out transform origin-right ${
        isOpen
          ? 'opacity-100 scale-100 translate-x-0'
          : 'opacity-0 scale-95 translate-x-4 absolute pointer-events-none'
      }`}
      onTransitionEnd={handleAnimationEnd}
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Action Header Bar */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/60 bg-white/95 dark:bg-[#161616]/95 backdrop-blur-md sticky top-0 z-20 flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full text-zinc-600 dark:text-zinc-400 transition-colors"
          >
            <X size={18} />
          </button>
          <button
            onClick={handleLaunch}
            disabled={isGuest}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm sm:text-base transition-all ${
              isGuest
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/25'
            }`}
          >
            {isGuest ? (
              'Invite Required'
            ) : (
              <>
                <Play size={18} className="fill-current" />
                Play Now
              </>
            )}
          </button>
        </div>

        {/* Hero Banner Section */}
        <div className="relative h-60 bg-zinc-900 w-full shrink-0 overflow-hidden">
          {game.img_url_hero || game.image_url ? (
            <img
              src={game.img_url_hero || game.image_url}
              alt={game.title}
              className="w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <Gamepad2 size={48} className="text-zinc-700" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#161616] via-[#161616]/50 to-transparent" />

          <div className="absolute bottom-4 left-5 right-5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                {game.tags?.[0] || 'Game'}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">v1.2.0-prod</span>
            </div>
            <h2 className="text-2xl font-black text-white">{game.title}</h2>
            <p className="text-zinc-300 text-xs line-clamp-2 mt-1">{game.long_desc || game.description}</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-6">
          {/* Player Career Stats */}
          <section>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-3">
              Your Career Stats
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {gameStats.map((stat, i) => (
                <div
                  key={i}
                  className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800/40 text-center transition-colors"
                >
                  <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-0.5">
                    {stat.label}
                  </p>
                  <p className="text-base font-bold text-zinc-800 dark:text-zinc-100">{stat.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Active Bounties */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Active Bounties
              </h3>
              <span className="text-[10px] font-semibold bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                Renews Daily
              </span>
            </div>

            <div className="space-y-2.5">
              {gameBounties.map((bounty) => (
                <div
                  key={bounty.id}
                  className="bg-white dark:bg-zinc-900/40 rounded-xl p-3.5 border border-zinc-200 dark:border-zinc-800/60 shadow-sm dark:shadow-none hover:border-orange-500/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg">
                        {bounty.icon}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{bounty.title}</p>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wide">{bounty.type} Quest</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 font-mono">
                      +{bounty.reward}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">{bounty.description}</p>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span className="text-zinc-500">Progress</span>
                      <span className="text-zinc-800 dark:text-zinc-200">
                        {bounty.progress} / {bounty.target}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(100, (bounty.progress / bounty.target) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Platform & Deep Link Info */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-xs space-y-1.5 text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center justify-between">
              <span>Platform Protocol</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {game.deep_link_scheme ? `${game.deep_link_scheme}://` : 'https://'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Single Sign-On</span>
              <span className="text-emerald-500 font-semibold flex items-center gap-1">
                <ShieldCheck size={12} /> SSO Token Auto-Handshake
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getGameStats(slug: string, title: string) {
  if (slug === 'chess' || title?.toLowerCase().includes('chess')) {
    return [
      { label: 'Standard Rating', value: '1,450' },
      { label: 'Chess960 ELO', value: '1,380' },
      { label: 'Win Rate', value: '54.2%' },
      { label: 'Matches', value: '28' },
    ];
  }
  if (slug === 'pukhuk' || title?.toLowerCase().includes('puk')) {
    return [
      { label: 'High Score', value: '89,450' },
      { label: 'Arcade Tier', value: 'Diamond' },
      { label: 'Global Rank', value: '#42' },
      { label: 'Runs Played', value: '112' },
    ];
  }
  if (slug === 'cozy' || title?.toLowerCase().includes('critterverse')) {
    return [
      { label: 'Critterverse ELO', value: '1,200' },
      { label: 'Village Level', value: '14' },
      { label: 'Residents', value: '8' },
      { label: 'Cozy Points', value: '3,420 CP' },
    ];
  }
  return [
    { label: 'Player Rating', value: '1,500' },
    { label: 'Total Sessions', value: '42' },
    { label: 'Achievements', value: '6/20' },
    { label: 'Status', value: 'Active' },
  ];
}

function getGameBounties(slug: string, title: string) {
  if (slug === 'chess' || title?.toLowerCase().includes('chess')) {
    return [
      { id: 1, title: 'Tactician', description: 'Win 3 ranked standard chess matches', progress: 2, target: 3, type: 'Daily', reward: '50 HT', icon: <Star size={14} /> },
      { id: 2, title: 'Fischer Novice', description: 'Play 5 Chess960 games', progress: 3, target: 5, type: 'Weekly', reward: '200 HT', icon: <Crosshair size={14} /> },
      { id: 3, title: 'Grandmaster', description: 'Reach 1600 Standard ELO', progress: 1450, target: 1600, type: 'Season', reward: '1,000 HT', icon: <Trophy size={14} /> },
    ];
  }
  return [
    { id: 1, title: 'Citizen Engagement', description: 'Complete a match or task today', progress: 1, target: 1, type: 'Daily', reward: '50 HT', icon: <Star size={14} /> },
    { id: 2, title: 'Skill Mastery', description: 'Achieve a top 100 standing in the weekly bracket', progress: 42, target: 100, type: 'Weekly', reward: '250 HT', icon: <Crosshair size={14} /> },
    { id: 3, title: 'Ecosystem Legend', description: 'Unlock 10 achievements across SunShade games', progress: 6, target: 10, type: 'Season', reward: '1,000 HT', icon: <Trophy size={14} /> },
  ];
}
