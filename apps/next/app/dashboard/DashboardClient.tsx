'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@sunshade/supabase';
import { AuthGate } from 'ui';
import { EventsCarousel } from 'ui/src/EventsCarousel';
import { useTheme } from 'next-themes';
import { OTAManager } from './OTAManager';
import {
  LayoutDashboard,
  Swords,
  Activity,
  Server,
  Settings,
  Bell,
  Hexagon,
  TrendingUp,
  History,
  Sun,
  Moon,
  Key,
  Copy,
  Check,
  User,
  ShieldCheck,
  Lock,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { GameDetailsDrawer } from './GameDetailsDrawer';
import { useHubPresence } from '../../hooks/useHubPresence';
import { ProfileView } from './views/ProfileView';
import { MedicalVaultView } from './views/MedicalVaultView';
import { EdgeNodesView } from './views/EdgeNodesView';
import type {
  DashboardProfile,
  EdgeNode,
  GameLibraryItem,
  PointsLedgerItem,
} from './types';

function getAppUrl(appId: string): string {
  if (typeof window === 'undefined') return '#';
  const hostname = window.location.hostname.toLowerCase();
  const isStaging = hostname.includes('-stag') || hostname.includes('staging') || hostname.endsWith('.vercel.app');
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocal) return `http://localhost:3000`;

  if (isStaging) {
    if (appId === 'chess') return 'https://chess-stag.sunshade.icu';
    if (appId === 'pukhuk') return 'https://pukhuk-stag.sunshade.icu';
    if (appId === 'cozy') return 'https://cozy-stag.sunshade.icu';
    return `https://${appId}-stag.sunshade.icu`;
  }

  return `https://${appId}.sunshade.icu`;
}

interface DashboardClientProps {
  profile: DashboardProfile | null;
  edgeNodes: EdgeNode[];
  gameLibrary: GameLibraryItem[];
  ledgerHistory?: PointsLedgerItem[];
  chessWidget: React.ReactNode;
  ecosystemWidget: React.ReactNode;
}

export default function DashboardClient({
  profile,
  edgeNodes,
  gameLibrary,
  ledgerHistory = [],
  chessWidget,
  ecosystemWidget,
}: DashboardClientProps) {
  const [currentProfile, setCurrentProfile] = useState<DashboardProfile | null>(profile);
  const [activeView, setActiveView] = useState('Overview');
  const [chessAchievements, setChessAchievements] = useState<any[]>([]);
  const [hubAchievements, setHubAchievements] = useState<any[]>([]);
  const [hubEvents, setHubEvents] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [userChessUnlocks, setUserChessUnlocks] = useState<Record<string, boolean>>({});
  const [userHubUnlocks, setUserHubUnlocks] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Auth Code State
  const [requestCodeSubmitted, setRequestCodeSubmitted] = useState(false);
  const [isGeneratingUserCode, setIsGeneratingUserCode] = useState(false);

  // In-portal Password Update State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    setCurrentProfile(profile);
  }, [profile]);

  const handleRequestUserCode = async () => {
    const userEmail = session?.user?.email;
    if (!userEmail) {
      alert('Your account email could not be found. Please sign in again.');
      return;
    }

    setIsGeneratingUserCode(true);
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, note: 'Requested from Dashboard Settings' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to submit code request');
      }
      setRequestCodeSubmitted(true);
    } catch (err: any) {
      alert(err.message || 'Error submitting code request');
    } finally {
      setIsGeneratingUserCode(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordStatus({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordStatus(null), 5000);
    } catch (err: any) {
      setPasswordStatus({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const { onlineCount } = useHubPresence(session?.user?.id);

  const handleClaimInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingInvite(true);
    setInviteError(null);
    try {
      const { error } = await supabase.rpc('claim_invite', { invite_code: inviteCode.toUpperCase() });
      if (error) throw error;
      window.location.reload();
    } catch (err: any) {
      setInviteError(err.message || 'Invalid code');
    } finally {
      setSubmittingInvite(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const loadData = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    const [
      { data: chessData },
      { data: hubData },
      { data: userChessData },
      { data: userHubData },
      { data: eventsData },
    ] = await Promise.all([
      supabase.schema('chess').from('achievements').select('*'),
      supabase.from('hub_achievements').select('*'),
      supabase.schema('chess').from('user_achievements').select('achievement_id').eq('user_id', session.user.id),
      supabase.from('user_hub_achievements').select('achievement_id').eq('user_id', session.user.id),
      supabase.from('hub_events').select('*').eq('is_active', true),
    ]);

    if (chessData) setChessAchievements(chessData);
    if (hubData) setHubAchievements(hubData);

    if (eventsData && eventsData.length > 0) {
      setHubEvents(eventsData);
    } else {
      setHubEvents([
        {
          id: 'fallback-1',
          title: 'Puk Huk: Season 2',
          description: 'The arcade is back and brighter than ever! Compete for the top score in this fast-paced neon shooter.',
          image_url: '/puk_huk_ad.jpg',
          call_to_action_url: getAppUrl('pukhuk'),
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
        },
        {
          id: 'fallback-2',
          title: 'Welcome to the Critterverse',
          description: 'Build your cozy village, farm, and relax with friends in this peaceful world.',
          image_url: '/critterverse_ad.jpg',
          call_to_action_url: getAppUrl('cozy'),
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
        },
      ]);
    }

    const chessUnlocks: Record<string, boolean> = {};
    userChessData?.forEach((row) => { chessUnlocks[row.achievement_id] = true; });
    setUserChessUnlocks(chessUnlocks);

    const hubUnlocks: Record<string, boolean> = {};
    userHubData?.forEach((row) => { hubUnlocks[row.achievement_id] = true; });
    setUserHubUnlocks(hubUnlocks);

    setIsLoading(false);
  };

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  const toggleChessAchievement = async (achievementId: string, isUnlocked: boolean) => {
    if (!session?.user?.id) return;
    if (isUnlocked) {
      await supabase.schema('chess').from('user_achievements').delete().eq('user_id', session.user.id).eq('achievement_id', achievementId);
      setUserChessUnlocks((prev) => ({ ...prev, [achievementId]: false }));
    } else {
      await supabase.schema('chess').from('user_achievements').insert({ user_id: session.user.id, achievement_id: achievementId });
      setUserChessUnlocks((prev) => ({ ...prev, [achievementId]: true }));
    }
  };

  const toggleHubAchievement = async (achievementId: string, isUnlocked: boolean) => {
    if (!session?.user?.id) return;
    if (isUnlocked) {
      await supabase.from('user_hub_achievements').delete().eq('user_id', session.user.id).eq('achievement_id', achievementId);
      setUserHubUnlocks((prev) => ({ ...prev, [achievementId]: false }));
    } else {
      await supabase.from('user_hub_achievements').insert({ user_id: session.user.id, achievement_id: achievementId });
      setUserHubUnlocks((prev) => ({ ...prev, [achievementId]: true }));
    }
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .custom-scrollbar::-webkit-scrollbar { width: 8px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #a1a1aa; border-radius: 4px; }
      .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #71717a; }
      .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const hubTokens = currentProfile?.global_hub_tokens ?? 0;
  const crittverseElo = currentProfile?.critterverse_elo ?? 1200;
  const onlineNodes = edgeNodes.filter((n) => n.status === 'online').length;

  const isStaging = typeof window !== 'undefined' && (
    window.location.hostname.includes('-stag') ||
    window.location.hostname.includes('staging') ||
    window.location.hostname.endsWith('.vercel.app')
  );

  const hubGames = gameLibrary.filter(g => g.tags?.includes('game')).map(g => ({
    ...g,
    title: g.name,
    description: g.short_desc,
    image_url: g.img_url_logo,
    deep_link_scheme: g.slug,
    web_fallback_url: isStaging ? (g.url_staging || g.url_production) : g.url_production
  }));

  const hubUtilities = gameLibrary.filter(g => g.tags?.includes('utility')).map(g => ({
    ...g,
    title: g.name,
    description: g.short_desc,
    image_url: g.img_url_logo,
    deep_link_scheme: g.slug,
    web_fallback_url: isStaging ? (g.url_staging || g.url_production) : g.url_production
  }));

  return (
    <AuthGate>
      <div className="w-full h-screen bg-zinc-50 dark:bg-[#111111] text-zinc-900 dark:text-zinc-200 font-sans flex flex-col md:flex-row overflow-hidden selection:bg-orange-500/30 transition-colors duration-200">

        {/* Sidebar */}
        <aside className="hidden md:flex w-64 overflow-hidden shrink-0 border-r border-zinc-200 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/30 flex-col backdrop-blur-xl relative z-20">
          <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800/60 transition-colors duration-200">
            <div className="flex items-center">
              <img src="/logo-icon.png" alt="Icon" className="w-8 h-8 object-contain mr-3" />
              <img src="/logo.png" alt="SunShade Systems" className="h-5 object-contain mt-1" />
            </div>
          </div>
          <nav className="flex-1 py-6 px-3 space-y-1 min-w-[256px]">
            <NavItem
              icon={<LayoutDashboard size={18} />}
              label="Overview"
              active={activeView === 'Overview'}
              onClick={() => setActiveView('Overview')}
            />
            <NavItem
              icon={<Swords size={18} />}
              label="Game Library"
              active={activeView === 'Game Library'}
              onClick={() => setActiveView('Game Library')}
            />
            <NavItem
              icon={<Activity size={18} />}
              label="Medical Vault"
              active={activeView === 'Medical Vault'}
              onClick={() => setActiveView('Medical Vault')}
            />
            <NavItem
              icon={<Server size={18} />}
              label="Edge Nodes"
              active={activeView === 'Edge Nodes'}
              onClick={() => setActiveView('Edge Nodes')}
            />

            <div className="pt-6 pb-2 px-3">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Account</p>
            </div>
            <NavItem
              icon={<User size={18} />}
              label="Profile"
              active={activeView === 'Profile'}
              onClick={() => setActiveView('Profile')}
            />
            <NavItem
              icon={<Settings size={18} />}
              label="Settings"
              active={activeView === 'Settings'}
              onClick={() => setActiveView('Settings')}
            />
          </nav>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <header className="h-16 border-b border-zinc-200 dark:border-zinc-800/60 bg-white/80 dark:bg-[#161616]/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 shrink-0 transition-colors duration-200">
            <div className="flex items-center gap-3">
              <img src="/logo-icon.png" alt="Icon" className="w-8 h-8 object-contain md:hidden" />
              <img src="/logo.png" alt="SunShade Systems" className="h-5 object-contain mt-1 hidden sm:block md:hidden" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hidden lg:block">
                Welcome back, {currentProfile?.display_name || currentProfile?.email || session?.user?.email || 'Citizen'}
              </span>
              <button
                onClick={() => setActiveView('Overview')}
                className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors relative"
                title="System Notifications"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white dark:border-[#161616]"></span>
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Active Citizens</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                    {onlineCount} Online
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('Profile')}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 dark:from-orange-600 dark:to-orange-800 flex items-center justify-center shadow-lg shadow-orange-500/20 border border-orange-400/30 hover:scale-105 transition-transform"
                  title="View Profile"
                >
                  <span className="font-bold text-sm text-white">
                    {(currentProfile?.display_name ?? session?.user?.email ?? 'C').charAt(0).toUpperCase()}
                  </span>
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 sm:p-8 custom-scrollbar relative overflow-y-auto lg:overflow-hidden flex flex-col">
            <div className={`max-w-7xl w-full mx-auto flex-1 flex flex-col ${activeView === 'Overview' ? 'space-y-6 lg:overflow-y-auto' : ''}`}>

              {currentProfile?.status === 'pending_invite' && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 mb-2 shrink-0">
                  <div className="w-full md:w-auto">
                    <h3 className="font-bold text-orange-600 dark:text-orange-400 text-lg">Guest Mode Active</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">You are browsing in preview mode. To unlock games, nodes, and ecosystem features, redeem an invite code.</p>
                    {inviteError && <p className="text-xs text-red-500 mt-1 font-medium">{inviteError}</p>}
                  </div>
                  <form className="flex gap-2 w-full md:w-auto shrink-0" onSubmit={handleClaimInvite}>
                    <input
                      type="text"
                      placeholder="Invite Code"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      required
                      className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm w-full md:w-48 outline-none focus:border-orange-500 transition-colors uppercase"
                    />
                    <button
                      type="submit"
                      disabled={submittingInvite}
                      className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-500 text-white font-medium rounded-lg text-sm whitespace-nowrap transition-colors"
                    >
                      {submittingInvite ? 'Verifying...' : 'Redeem'}
                    </button>
                  </form>
                </div>
              )}

              {/* OVERVIEW VIEW */}
              {activeView === 'Overview' && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <MetricCard
                      title="Global Hub Tokens"
                      value={hubTokens.toLocaleString()}
                      trend="Hub balance"
                      icon={<Hexagon className="text-orange-500 dark:text-orange-400" size={20} />}
                    />
                    <MetricCard
                      title="Critterverse ELO"
                      value={crittverseElo.toLocaleString()}
                      trend="Cross-game ranking"
                      icon={<TrendingUp className="text-blue-500 dark:text-blue-400" size={20} />}
                    />
                    <MetricCard
                      title="Active Edge Nodes"
                      value={`${onlineNodes} Online`}
                      trend={edgeNodes.length === 0 ? '3 cluster nodes' : `${edgeNodes.length} total`}
                      icon={<Server className="text-orange-500 dark:text-orange-400" size={20} />}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      {chessWidget}
                    </div>
                    <div>
                      {ecosystemWidget}
                    </div>
                  </div>

                  {/* Hub Achievements table */}
                  <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-6 shadow-sm dark:shadow-none mt-6 transition-colors duration-200">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Global Hub Achievements</h3>
                    {isLoading ? <SkeletonTable /> : (
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
                              <tr key={ach.id} className={`border-b border-zinc-100 dark:border-zinc-800/50 transition-all duration-200 ${userHubUnlocks[ach.id] ? 'opacity-100' : 'opacity-60'}`}>
                                <td className="p-3">
                                  <button onClick={() => toggleHubAchievement(ach.id, !!userHubUnlocks[ach.id])} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${userHubUnlocks[ach.id] ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
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
                  <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-6 shadow-sm dark:shadow-none mt-6 transition-colors duration-200">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">SunShade Chess Achievements (Local)</h3>
                    {isLoading ? <SkeletonTable /> : (
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
                              <tr key={ach.id} className={`border-b border-zinc-100 dark:border-zinc-800/50 transition-all duration-200 ${userChessUnlocks[ach.id] ? 'opacity-100' : 'opacity-60'}`}>
                                <td className="p-3">
                                  <button onClick={() => toggleChessAchievement(ach.id, !!userChessUnlocks[ach.id])} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${userChessUnlocks[ach.id] ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
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
                </>
              )}

              {/* GAME LIBRARY VIEW */}
              {activeView === 'Game Library' && (
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch flex-1 md:overflow-hidden md:h-full pb-4">
                  <div className="w-full md:w-64 lg:w-80 shrink-0 md:h-full md:overflow-y-auto custom-scrollbar md:pr-2">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 md:mb-6">Live Events</h2>
                    <EventsCarousel events={hubEvents} width="100%" />
                  </div>
                  <div className="flex-1 w-full flex flex-col md:h-full md:overflow-hidden">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4 md:mb-6 shrink-0 mt-6 md:mt-0">Game Library</h2>
                    <div className="flex-1 md:overflow-y-auto custom-scrollbar md:pr-2">
                      <div className="mb-8">
                        {hubGames.length === 0 ? (
                          <p className="text-zinc-500">No games found.</p>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {hubGames.map((game) => (
                              <GameLibraryCard key={game.id} game={game} onSelect={() => setSelectedGame(game)} />
                            ))}
                          </div>
                        )}
                      </div>

                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4 md:mb-6 shrink-0">Civic Utilities</h2>
                      <div className="mb-8">
                        {hubUtilities.length === 0 ? (
                          <p className="text-zinc-500">No utilities found.</p>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {hubUtilities.map((utility) => (
                              <GameLibraryCard key={utility.id} game={utility} onSelect={() => setSelectedGame(utility)} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`shrink-0 md:h-full md:overflow-y-auto custom-scrollbar transition-all duration-300 ease-out ${selectedGame ? 'w-full md:w-[320px] lg:w-[360px] xl:w-[400px] opacity-100 mt-6 md:mt-0 ml-0 md:ml-4 lg:ml-6' : 'w-0 h-0 md:h-full opacity-0 m-0 overflow-hidden'}`}>
                    <GameDetailsDrawer game={selectedGame} isOpen={!!selectedGame} onClose={() => setSelectedGame(null)} isGuest={currentProfile?.status === 'pending_invite'} />
                  </div>
                </div>
              )}

              {/* MEDICAL VAULT VIEW */}
              {activeView === 'Medical Vault' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                  <MedicalVaultView session={session} />
                </div>
              )}

              {/* EDGE NODES VIEW */}
              {activeView === 'Edge Nodes' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                  <EdgeNodesView edgeNodes={edgeNodes} session={session} />
                </div>
              )}

              {/* PROFILE VIEW */}
              {activeView === 'Profile' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                  <ProfileView
                    profile={currentProfile}
                    session={session}
                    hubTokens={hubTokens}
                    crittverseElo={crittverseElo}
                    userHubUnlocks={userHubUnlocks}
                    userChessUnlocks={userChessUnlocks}
                    ledgerHistory={ledgerHistory}
                    onNavigateTab={(tab) => setActiveView(tab)}
                    onProfileUpdate={(updated) => {
                      setCurrentProfile((prev) => (prev ? { ...prev, ...updated } : null));
                    }}
                  />
                </div>
              )}

              {/* SETTINGS VIEW */}
              {activeView === 'Settings' && (
                <div className="max-w-2xl mx-auto w-full mt-4 space-y-6 pb-12 overflow-y-auto custom-scrollbar">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Account Settings & Security</h2>

                  <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl overflow-hidden shadow-sm dark:shadow-none divide-y divide-zinc-200 dark:divide-zinc-800/60">
                    {/* Appearance */}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Appearance</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-zinc-800 dark:text-zinc-200">Theme</p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">Toggle light or dark mode</p>
                        </div>
                        {mounted && (
                          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium rounded-lg transition-colors flex items-center gap-2">
                            {theme === 'dark' ? <><Sun size={16} /> Light Mode</> : <><Moon size={16} /> Dark Mode</>}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Change Password in Settings */}
                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">Security & Password</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Update your citizen account password securely.</p>
                      </div>

                      {passwordStatus && (
                        <div className={`p-3 rounded-lg text-xs font-semibold ${passwordStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                          {passwordStatus.text}
                        </div>
                      )}

                      <form onSubmit={handleUpdatePassword} className="space-y-3 max-w-md">
                        <input
                          type="password"
                          placeholder="New Password (min 8 chars)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 transition-colors"
                        />
                        <input
                          type="password"
                          placeholder="Confirm New Password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:border-orange-500 text-zinc-900 dark:text-zinc-100 transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={updatingPassword}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Lock size={14} />
                          {updatingPassword ? 'Updating Password...' : 'Update Password'}
                        </button>
                      </form>
                    </div>

                    {/* User Auth Code */}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">User Auth Code</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Request an 8-character auth code from admins to sign in on another device or grant Hub access.</p>

                      {requestCodeSubmitted ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-4 flex items-center gap-3">
                          <Check className="text-emerald-400 shrink-0" size={20} />
                          <div>
                            <span className="text-sm font-semibold text-emerald-400 block">Request Submitted</span>
                            <span className="text-xs text-zinc-400 block">An admin will review your request and issue an 8-character auth code.</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={handleRequestUserCode}
                          disabled={isGeneratingUserCode}
                          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                          <Key size={16} />
                          {isGeneratingUserCode ? 'Submitting Request...' : 'Request User Code'}
                        </button>
                      )}
                    </div>

                    {/* Account Actions */}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Account Actions</h3>
                      <button onClick={() => supabase.auth.signOut()} className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium rounded-lg transition-colors flex items-center gap-2 text-sm">
                        <LogOut size={16} /> Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>

        {/* Bottom Nav Mobile */}
        <nav className="md:hidden flex items-center justify-between bg-white dark:bg-[#161616] border-t border-zinc-200 dark:border-zinc-800/60 pb-[env(safe-area-inset-bottom)] px-2 pt-2 z-30">
          <MobileNavItem
            icon={<LayoutDashboard size={20} />}
            label="Overview"
            active={activeView === 'Overview'}
            onClick={() => setActiveView('Overview')}
          />
          <MobileNavItem
            icon={<Swords size={20} />}
            label="Library"
            active={activeView === 'Game Library'}
            onClick={() => setActiveView('Game Library')}
          />
          <MobileNavItem
            icon={<Activity size={20} />}
            label="Vault"
            active={activeView === 'Medical Vault'}
            onClick={() => setActiveView('Medical Vault')}
          />
          <MobileNavItem
            icon={<Server size={20} />}
            label="Nodes"
            active={activeView === 'Edge Nodes'}
            onClick={() => setActiveView('Edge Nodes')}
          />
          <MobileNavItem
            icon={<User size={20} />}
            label="Profile"
            active={activeView === 'Profile'}
            onClick={() => setActiveView('Profile')}
          />
          <MobileNavItem
            icon={<Settings size={20} />}
            label="Settings"
            active={activeView === 'Settings'}
            onClick={() => setActiveView('Settings')}
          />
        </nav>

        <OTAManager />
      </div>
    </AuthGate>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded" />
      ))}
    </div>
  );
}

function GameLibraryCard({ game, onSelect }: { game: any; onSelect: () => void }) {
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

function MobileNavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-1.5 min-w-[50px] transition-colors ${active ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}>
      {icon}
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <a href="#" onClick={(e) => { e.preventDefault(); onClick?.(); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${active ? 'bg-orange-50 dark:bg-orange-600/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border border-transparent'}`}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </a>
  );
}

function MetricCard({ title, value, trend, icon }: { title: string; value: string; trend: string; icon: React.ReactNode }) {
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
