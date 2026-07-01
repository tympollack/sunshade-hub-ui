import React, { useEffect, useState } from 'react';
import { X, Play, Trophy, Crosshair, Star } from 'lucide-react';

interface GameDetailsDrawerProps {
  game: any;
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_STATS = [
  { label: 'Total Matches', value: '1,420' },
  { label: 'Win Rate', value: '54.2%' },
  { label: 'ELO Rating', value: '1,850' },
  { label: 'Achievements', value: '12/50' },
];

const MOCK_BOUNTIES = [
  { id: 1, title: 'Fast Learner', description: 'Win a match in under 15 moves', progress: 0, target: 1, type: 'Daily', reward: '50 CP', icon: <Star size={16} /> },
  { id: 2, title: 'Tactician', description: 'Play 10 ranked matches', progress: 7, target: 10, type: 'Weekly', reward: '200 CP', icon: <Crosshair size={16} /> },
  { id: 3, title: 'Grandmaster', description: 'Reach 2000 ELO', progress: 1850, target: 2000, type: 'Season', reward: '1,000 CP', icon: <Trophy size={16} /> },
];

export function GameDetailsDrawer({ game, isOpen, onClose }: GameDetailsDrawerProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setShouldRender(false);
  };

  const handleLaunch = () => {
    if (typeof window !== 'undefined' && game?.deep_link_scheme) {
      const launchUrl = `${game.deep_link_scheme}://auth`;
      const fallbackUrl = game.web_fallback_url;
      
      window.location.href = launchUrl;
      
      setTimeout(() => {
        if (!document.hidden && fallbackUrl) {
          window.open(fallbackUrl, '_blank');
        }
      }, 500);
    }
  };

  if (!shouldRender || !game) return null;

  return (
    <div 
      className={`w-full bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl shadow-sm dark:shadow-none overflow-hidden flex flex-col transition-all duration-300 ease-out transform origin-right ${isOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 translate-x-4 absolute pointer-events-none'}`}
      onTransitionEnd={handleAnimationEnd}
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Action Bar */}
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-[#161616] sticky top-0 z-20 flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full text-zinc-600 dark:text-zinc-400 transition-colors"
            >
              <X size={20} />
            </button>
            <button 
              onClick={handleLaunch}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-3 rounded-xl font-bold text-lg transition-all shadow-lg shadow-orange-600/20"
            >
              <Play size={20} className="fill-current" />
              Play Now
            </button>
          </div>
          
          {/* Hero Section */}
          <div className="relative h-64 bg-zinc-900 w-full shrink-0">
            {game.image_url ? (
              <img src={game.image_url} alt={game.title} className="w-full h-full object-cover opacity-80" />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                <span className="text-zinc-500">No Image</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#161616] via-[#161616]/40 to-transparent dark:from-[#161616]" />

            <div className="absolute bottom-6 left-6 right-6">
              <h2 className="text-3xl font-bold text-white mb-2">{game.title}</h2>
              <p className="text-zinc-300 text-sm line-clamp-2">{game.description}</p>
            </div>
          </div>



          {/* Content Body */}
          <div className="p-6 space-y-8">
            
            {/* Player Stats */}
            <section>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Your Career Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                {MOCK_STATS.map((stat, i) => (
                  <div key={i} className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800/40 text-center transition-colors">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{stat.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Bounties */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Active Bounties</h3>
                <span className="text-xs font-medium bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full">Renews in 14h</span>
              </div>
              
              <div className="space-y-3">
                {MOCK_BOUNTIES.map(bounty => (
                  <div key={bounty.id} className="bg-white dark:bg-zinc-900/30 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800/60 shadow-sm dark:shadow-none hover:border-orange-500/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg">
                          {bounty.icon}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{bounty.title}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{bounty.type} Bounty</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400 font-mono">+{bounty.reward}</span>
                    </div>
                    
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{bounty.description}</p>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-zinc-500">Progress</span>
                        <span className="text-zinc-800 dark:text-zinc-200">{bounty.progress} / {bounty.target}</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${Math.min(100, (bounty.progress / bounty.target) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            
          </div>
        </div>
    </div>
  );
}
