import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationsModal } from '../app/dashboard/components/NotificationsModal';
import { ProfileView } from '../app/dashboard/views/ProfileView';
import type { HubNotification, DashboardProfile, GameStat, AchievementBadge, PointsLedgerItem } from '../app/dashboard/types';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe('NotificationsModal Component', () => {
  const mockNotifications: HubNotification[] = [
    {
      id: 'notif-1',
      category: 'announcement',
      title: 'Genesis Alpha Launch',
      message: 'Welcome to the SunShade Network Genesis Alpha!',
      created_at: new Date().toISOString(),
      action_label: 'Explore Games',
    },
    {
      id: 'notif-2',
      category: 'reward',
      title: '+500 HT Reward Claimed',
      message: 'Received 500 HT for Week Warrior achievement.',
      created_at: new Date().toISOString(),
      action_label: 'View Wallet',
    },
    {
      id: 'notif-3',
      category: 'node',
      title: 'Cluster Node Active',
      message: 'Node Sentinel-1 is online and operational.',
      created_at: new Date().toISOString(),
    },
  ];

  it('renders modal with notifications and unread badge count', () => {
    const handleClose = vi.fn();
    const handleMarkRead = vi.fn();
    const handleDismiss = vi.fn();

    render(
      <NotificationsModal
        isOpen={true}
        onClose={handleClose}
        notifications={mockNotifications}
        readIds={new Set(['notif-1'])}
        onMarkAllAsRead={handleMarkRead}
        onDismissNotification={handleDismiss}
      />
    );

    expect(screen.getByText('System Notifications')).toBeInTheDocument();
    expect(screen.getByText('2 New')).toBeInTheDocument();
    expect(screen.getByText('Genesis Alpha Launch')).toBeInTheDocument();
    expect(screen.getByText('+500 HT Reward Claimed')).toBeInTheDocument();
    expect(screen.getByText('Cluster Node Active')).toBeInTheDocument();
  });

  it('filters notifications by category tab', () => {
    render(
      <NotificationsModal
        isOpen={true}
        onClose={vi.fn()}
        notifications={mockNotifications}
        readIds={new Set()}
        onMarkAllAsRead={vi.fn()}
        onDismissNotification={vi.fn()}
      />
    );

    // Switch to Rewards & HT tab
    const rewardTab = screen.getByRole('button', { name: /Rewards & HT/i });
    fireEvent.click(rewardTab);

    expect(screen.getByText('+500 HT Reward Claimed')).toBeInTheDocument();
    expect(screen.queryByText('Genesis Alpha Launch')).not.toBeInTheDocument();
    expect(screen.queryByText('Cluster Node Active')).not.toBeInTheDocument();
  });

  it('triggers mark all as read and dismiss callbacks', () => {
    const handleMarkRead = vi.fn();
    const handleDismiss = vi.fn();

    render(
      <NotificationsModal
        isOpen={true}
        onClose={vi.fn()}
        notifications={mockNotifications}
        readIds={new Set()}
        onMarkAllAsRead={handleMarkRead}
        onDismissNotification={handleDismiss}
      />
    );

    const markReadBtn = screen.getByRole('button', { name: /mark read/i });
    fireEvent.click(markReadBtn);
    expect(handleMarkRead).toHaveBeenCalledTimes(1);

    const dismissBtns = screen.getAllByTitle('Dismiss notification');
    fireEvent.click(dismissBtns[0]);
    expect(handleDismiss).toHaveBeenCalledWith('notif-1');
  });

  it('closes when close button is clicked', () => {
    const handleClose = vi.fn();

    render(
      <NotificationsModal
        isOpen={true}
        onClose={handleClose}
        notifications={mockNotifications}
        readIds={new Set()}
        onMarkAllAsRead={vi.fn()}
        onDismissNotification={vi.fn()}
      />
    );

    const closeBtn = screen.getByTitle('Close notifications');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('ProfileView System Metrics & Dynamic Matrix', () => {
  const mockProfile: DashboardProfile = {
    id: 'user-12345',
    display_name: 'CipherKnight',
    email: 'knight@sunshade.icu',
    global_hub_tokens: 3500,
    critterverse_elo: 1420,
    reputation_score: 98,
    citizen_tier: 'Core Citizen',
    status: 'active',
    wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
    created_at: '2026-07-01T00:00:00Z',
    avatar_url: null,
  };

  const mockBadges: AchievementBadge[] = [
    {
      id: 'EARLY_ADOPTER',
      name: 'Early Adopter',
      description: 'Genesis citizen',
      reward_tokens: 2000,
      game: 'SunShade Hub',
      unlocked: true,
      rarity: 'Legendary',
    },
    {
      id: 'FIRST_BLOOD',
      name: 'First Blood',
      description: 'Captured piece early',
      reward_points: 50,
      game: 'SunShade Chess',
      unlocked: true,
      rarity: 'Common',
    },
    {
      id: 'FISCHER_MASTER',
      name: 'Fischer Master',
      description: '10 Chess960 wins',
      reward_points: 1000,
      game: 'SunShade Chess',
      unlocked: false,
      rarity: 'Legendary',
    },
  ];

  const mockGameStats: GameStat[] = [
    {
      game_name: 'sunshade chess',
      matches_played: 18,
      wins: 11,
      win_rate: 0.61,
      local_currency: 850,
      achievements_unlocked: 2,
      achievements_total: 4,
    },
  ];

  it('renders top system-level stats correctly', () => {
    render(
      <ProfileView
        profile={mockProfile}
        session={{ user: { id: mockProfile.id, email: mockProfile.email } }}
        hubTokens={mockProfile.global_hub_tokens}
        hubAchievements={mockBadges.slice(0, 1)}
        chessAchievements={mockBadges.slice(1)}
        gameStats={mockGameStats}
      />
    );

    // Profile Hero Information
    expect(screen.getByText('CipherKnight')).toBeInTheDocument();
    expect(screen.getByText('knight@sunshade.icu')).toBeInTheDocument();

    // 4 Key System Metrics
    expect(screen.getByText('3,500')).toBeInTheDocument();
    expect(screen.getByText('98')).toBeInTheDocument();
    expect(screen.getByText('/ 100')).toBeInTheDocument();
    expect(screen.getAllByText('Core Citizen').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('switches between Ecosystem Game Matrix, Trophy Cabinet, and Token Ledger tabs', () => {
    const mockLedger: PointsLedgerItem[] = [
      {
        id: 'tx-100',
        user_id: 'user-12345',
        amount: 2000,
        reason: 'genesis_reward',
        reference_id: 'ALPHA_REWARD',
        created_at: new Date().toISOString(),
      },
    ];

    render(
      <ProfileView
        profile={mockProfile}
        session={{ user: { id: mockProfile.id, email: mockProfile.email } }}
        hubTokens={mockProfile.global_hub_tokens}
        hubAchievements={mockBadges.slice(0, 1)}
        chessAchievements={mockBadges.slice(1)}
        gameStats={mockGameStats}
        ledgerHistory={mockLedger}
      />
    );

    // Initial tab: Ecosystem Game Matrix
    expect(screen.getByText('SunShade Chess')).toBeInTheDocument();
    expect(screen.getByText('18 Matches')).toBeInTheDocument();
    expect(screen.getByText('61%')).toBeInTheDocument();

    // Switch to Trophy Cabinet
    const trophyTab = screen.getByRole('button', { name: /Trophy Cabinet/i });
    fireEvent.click(trophyTab);
    expect(screen.getByText('Early Adopter')).toBeInTheDocument();
    expect(screen.getByText('Fischer Master')).toBeInTheDocument();

    // Switch to Token Ledger
    const ledgerTab = screen.getByRole('button', { name: /Token Ledger/i });
    fireEvent.click(ledgerTab);
    expect(screen.getByText('genesis reward')).toBeInTheDocument();
    expect(screen.getByText('+2000 HT')).toBeInTheDocument();
  });
});
