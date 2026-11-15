'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@digitalcanopy/supabase';
import {
  AuthGate,
  EventsCarousel,
  GlassCard,
  AtmosphericBadge,
  TokenBalanceBadge,
  PrimaryButton, Skeleton,
} from '@digitalcanopy/ui';
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
  Shield,
  History,
  User,
  Sparkles,
} from 'lucide-react';
import { GameDetailsDrawer } from './GameDetailsDrawer';
import { useHubPresence } from '../../hooks/useHubPresence';
import { ProfileView } from './views/ProfileView';
import { MedicalVaultView } from './views/MedicalVaultView';
import { EdgeNodesView } from './views/EdgeNodesView';
import { SettingsView } from './views/SettingsView';
import { NotificationsModal } from './components/NotificationsModal';
import { ConnectedServicesGrid } from './components/ConnectedServicesGrid';
import { SecuritySettingsDrawer } from './components/SecuritySettingsDrawer';
import { BroadcastPreviewDrawer, type BroadcastPostData } from './components/BroadcastPreviewDrawer';
import { LaunchpadShowcase } from './components/LaunchpadShowcase';
import { DashboardAchievements } from './components/DashboardAchievements';
import { NodeStatusPill } from '../../components/header/NodeStatusPill';
import {
  SkeletonTable,
  GameLibraryCard,
  MobileNavItem,
  NavItem,
  MetricCard,
} from './components/DashboardUiPrimitives';
import type {
  DashboardProfile,
  EdgeNode,
  GameLibraryItem,
  PointsLedgerItem,
  GameStat,
  AchievementBadge,
  HubNotification,
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
  gameStats?: GameStat[];
  hubAchievements?: AchievementBadge[];
  chessAchievements?: AchievementBadge[];
  userHubUnlocks?: Record<string, boolean>;
  userChessUnlocks?: Record<string, boolean>;
  hubEvents?: any[];
  notifications?: HubNotification[];
  chessWidget: React.ReactNode;
  ecosystemWidget: React.ReactNode;
}

export default function DashboardClient({
  profile,
  edgeNodes,
  gameLibrary,
  ledgerHistory = [],
  gameStats = [],
  hubAchievements: initialHubAchievements = [],
  chessAchievements: initialChessAchievements = [],
  userHubUnlocks: initialUserHubUnlocks = {},
  userChessUnlocks: initialUserChessUnlocks = {},
  hubEvents: initialHubEvents = [],
  notifications: initialNotifications = [],
  chessWidget,
  ecosystemWidget,
}: DashboardClientProps) {
  const [currentProfile, setCurrentProfile] = useState<DashboardProfile | null>(profile);
  const [activeView, setActiveView] = useState('Overview');
  const [chessAchievements, setChessAchievements] = useState<AchievementBadge[]>(initialChessAchievements);
  const [hubAchievements, setHubAchievements] = useState<AchievementBadge[]>(initialHubAchievements);
  const [hubEvents, setHubEvents] = useState<any[]>(initialHubEvents);
  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [userChessUnlocks, setUserChessUnlocks] = useState<Record<string, boolean>>(initialUserChessUnlocks);
  const [userHubUnlocks, setUserHubUnlocks] = useState<Record<string, boolean>>(initialUserHubUnlocks);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isSecurityDrawerOpen, setIsSecurityDrawerOpen] = useState(false);
  const [isBroadcastDrawerOpen, setIsBroadcastDrawerOpen] = useState(false);
  const defaultBroadcastPost: BroadcastPostData = {
    id: 'hub-staging-preview',
    title: 'SunShade Network Deliberation Staging',
    body: 'Reviewing cross-channel broadcasts across Bluesky, LinkedIn, X, and Meta.',
    canonicalUrl: 'https://hub.sunshade.icu',
    targetPlatforms: ['bluesky', 'x', 'linkedin', 'meta'],
  };
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Notification Modal State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState<HubNotification[]>(initialNotifications);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('sunshade_read_notifs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (_) {
      return new Set();
    }
  });

  useEffect(() => {
    setCurrentProfile(profile);
  }, [profile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view') || params.get('tab');
      if (viewParam) {
        const views = ['Overview', 'Game Library', 'Medical Vault', 'Edge Nodes', 'Profile', 'Settings'];
        const matched = views.find((v) => v.toLowerCase() === viewParam.toLowerCase());
        if (matched) setActiveView(matched);
      }
      if (params.get('drawer') === 'security') {
        setIsSecurityDrawerOpen(true);
      }
      if (params.get('drawer') === 'broadcast' || params.get('drawer') === 'syndication') {
        setIsBroadcastDrawerOpen(true);
      }
    }
  }, []);

  const handleMarkAllNotificationsRead = () => {
    const allIds = new Set(notificationsList.map((n) => n.id));
    setReadNotificationIds(allIds);
    try {
      localStorage.setItem('sunshade_read_notifs', JSON.stringify(Array.from(allIds)));
    } catch (_) {}
  };

  const handleDismissNotification = (id: string) => {
    setNotificationsList((prev) => prev.filter((n) => n.id !== id));
    const nextRead = new Set(readNotificationIds);
    nextRead.add(id);
    setReadNotificationIds(nextRead);
    try {
      localStorage.setItem('sunshade_read_notifs', JSON.stringify(Array.from(nextRead)));
    } catch (_) {}
  };

  const unreadNotificationsCount = notificationsList.filter((n) => !readNotificationIds.has(n.id)).length;

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

    if (chessData) {
      setChessAchievements(
        chessData.map((a: any) => ({
          ...a,
          game: 'SunShade Chess',
          rarity: (a.reward_points ?? 0) >= 1000 ? 'Legendary' : 'Rare',
        }))
      );
    }
    if (hubData) {
      setHubAchievements(
        hubData.map((a: any) => ({
          ...a,
          game: 'SunShade Hub',
          rarity: (a.reward_tokens ?? 0) >= 1000 ? 'Legendary' : 'Epic',
        }))
      );
    }

    if (eventsData && eventsData.length > 0) {
      setHubEvents(eventsData);
    }

    const chessUnlocks: Record<string, boolean> = {};
    userChessData?.forEach((row: any) => { chessUnlocks[row.achievement_id] = true; });
    setUserChessUnlocks(chessUnlocks);

    const hubUnlocks: Record<string, boolean> = {};
    userHubData?.forEach((row: any) => { hubUnlocks[row.achievement_id] = true; });
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

  const hubTokens = currentProfile?.global_hub_tokens ?? 0;
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
            <div className="flex items-center gap-3 sm:gap-4">
              <NodeStatusPill />

              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hidden lg:block">
                Welcome back, {currentProfile?.display_name || currentProfile?.email || session?.user?.email || 'Citizen'}
              </span>

              {/* Working Notifications Trigger */}
              <button
                onClick={() => setIsNotificationsOpen(true)}
                className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors relative"
                title="System Notifications"
              >
                <Bell size={18} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white dark:border-[#161616] animate-pulse"></span>
                )}
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
                  className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700 dark:from-orange-600 dark:to-orange-800 flex items-center justify-center shadow-lg shadow-orange-500/20 border border-orange-400/30 hover:scale-105 transition-transform"
                  title="View Profile"
                >
                  {currentProfile?.avatar_url ? (
                    <img src={currentProfile.avatar_url} alt="Profile Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-sm text-white">
                      {(currentProfile?.display_name ?? session?.user?.email ?? 'C').charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </header>

          {/* Unified Smooth Scrolling Container for All Screens */}
          <div className="flex-1 p-4 sm:p-8 custom-scrollbar relative overflow-y-auto min-h-0">
            <div className="max-w-7xl w-full mx-auto space-y-6">

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
                  {/* Ecosystem Telemetry & Atmospheric Status Banner */}
                  <GlassCard variant="default" padding="md" className="mb-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <AtmosphericBadge label="SunShade Core: Online" variant="core" statusDot pulse size="sm" />
                        <AtmosphericBadge label="Cozy Ecosystem: Synchronized" variant="cozy" statusDot size="sm" />
                        <AtmosphericBadge label="Telemetry Feed: Active" variant="telemetry" size="sm" />
                      </div>
                      <div className="flex items-center gap-3">
                        <TokenBalanceBadge
                          balance={hubTokens}
                          symbol="HT"
                          label="Global Balance"
                          variant="default"
                          isLive={false}
                        />
                      </div>
                    </div>
                  </GlassCard>

                  {/* System-Level Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    <MetricCard
                      title="Global Hub Tokens"
                      value={`${hubTokens.toLocaleString()} HT`}
                      trend="Liquid ecosystem balance"
                      icon={<Hexagon className="text-orange-500 dark:text-orange-400" size={20} />}
                    />
                    <MetricCard
                      title="Citizen Standing"
                      value={`${currentProfile?.reputation_score ?? 100}/100`}
                      trend={currentProfile?.citizen_tier || 'Active Citizen'}
                      icon={<Shield className="text-emerald-500 dark:text-emerald-400" size={20} />}
                    />
                    <MetricCard
                      title="Active Edge Nodes"
                      value={`${onlineNodes} Online`}
                      trend={edgeNodes.length === 0 ? '0 registered nodes' : `${edgeNodes.length} cluster nodes`}
                      icon={<Server className="text-blue-500 dark:text-blue-400" size={20} />}
                    />
                  </div>

                  {/* Connected SunShade Services Directory */}
                  <ConnectedServicesGrid />

                  {/* SunShade Launchpad & Dynamic App Registry */}
                  <LaunchpadShowcase />

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      {chessWidget}
                    </div>
                    <div>
                      {ecosystemWidget}
                    </div>
                  </div>

                  {/* Achievements Tables */}
                  <DashboardAchievements
                    isLoading={isLoading}
                    hubAchievements={hubAchievements}
                    chessAchievements={chessAchievements}
                    userHubUnlocks={userHubUnlocks}
                    userChessUnlocks={userChessUnlocks}
                    onToggleHubAchievement={toggleHubAchievement}
                    onToggleChessAchievement={toggleChessAchievement}
                  />
                </>
              )}

              {/* GAME LIBRARY VIEW */}
              {activeView === 'Game Library' && (
                <div className="flex flex-col lg:flex-row gap-6 items-start pb-6">
                  {/* Left Column: Events */}
                  <div className="w-full lg:w-80 shrink-0">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Live Events</h2>
                    <EventsCarousel events={hubEvents} width="100%" />
                  </div>

                  {/* Middle Column: Games & Utilities Grid */}
                  <div className="flex-1 w-full space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">Game Library</h2>
                      {hubGames.length === 0 ? (
                        <p className="text-zinc-500">No games found.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                          {hubGames.map((game) => (
                            <GameLibraryCard key={game.id} game={game} onSelect={() => setSelectedGame(game)} />
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">Civic Utilities</h2>
                      {hubUtilities.length === 0 ? (
                        <p className="text-zinc-500">No utilities found.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                          {hubUtilities.map((utility) => (
                            <GameLibraryCard key={utility.id} game={utility} onSelect={() => setSelectedGame(utility)} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Game Details Drawer */}
                  {selectedGame && (
                    <div className="w-full lg:w-96 shrink-0 transition-all duration-300">
                      <GameDetailsDrawer
                        game={selectedGame}
                        isOpen={!!selectedGame}
                        onClose={() => setSelectedGame(null)}
                        isGuest={currentProfile?.status === 'pending_invite'}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* MEDICAL VAULT VIEW */}
              {activeView === 'Medical Vault' && (
                <MedicalVaultView session={session} />
              )}

              {/* EDGE NODES VIEW */}
              {activeView === 'Edge Nodes' && (
                <EdgeNodesView edgeNodes={edgeNodes} session={session} />
              )}

              {/* PROFILE VIEW */}
              {activeView === 'Profile' && (
                <ProfileView
                  profile={currentProfile}
                  session={session}
                  hubTokens={hubTokens}
                  hubAchievements={hubAchievements}
                  chessAchievements={chessAchievements}
                  userHubUnlocks={userHubUnlocks}
                  userChessUnlocks={userChessUnlocks}
                  gameStats={gameStats}
                  gameLibrary={gameLibrary}
                  ledgerHistory={ledgerHistory}
                  onNavigateTab={(tab) => setActiveView(tab)}
                  onProfileUpdate={(updated) => {
                    setCurrentProfile((prev) => (prev ? { ...prev, ...updated } : null));
                  }}
                />
              )}

              {/* SETTINGS VIEW */}
              {activeView === 'Settings' && (
                <SettingsView
                  session={session}
                  onOpenSecurityDrawer={() => setIsSecurityDrawerOpen(true)}
                  onOpenBroadcastDrawer={() => setIsBroadcastDrawerOpen(true)}
                />
              )}

            </div>
          </div>
        </main>

        {/* Notifications Modal */}
        <NotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          notifications={notificationsList}
          readIds={readNotificationIds}
          onMarkAllAsRead={handleMarkAllNotificationsRead}
          onDismissNotification={handleDismissNotification}
          onNavigateView={(v) => setActiveView(v)}
        />

        {/* Deliberation Security Architecture Drawer */}
        <SecuritySettingsDrawer
          isOpen={isSecurityDrawerOpen}
          onClose={() => setIsSecurityDrawerOpen(false)}
        />

        {/* Social Broadcast Preview & Override Drawer */}
        <BroadcastPreviewDrawer
          isOpen={isBroadcastDrawerOpen}
          onClose={() => setIsBroadcastDrawerOpen(false)}
          post={defaultBroadcastPost}
        />

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
