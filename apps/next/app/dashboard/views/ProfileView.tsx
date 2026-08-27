'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Hexagon,
  TrendingUp,
  Shield,
  Wallet,
  Copy,
  Check,
  Edit3,
  Award,
  Swords,
  Gamepad2,
  Zap,
  Clock,
  ChevronRight,
  UserCheck,
  Flame,
  Camera,
  Upload,
  Trash2,
  Loader2,
} from 'lucide-react';
import type { DashboardProfile, PointsLedgerItem, AchievementBadge } from '../types';
import { updateCitizenProfile } from '../actions/profile-actions';

interface ProfileViewProps {
  profile: DashboardProfile | null;
  session: any;
  hubTokens: number;
  crittverseElo: number;
  userHubUnlocks?: Record<string, boolean>;
  userChessUnlocks?: Record<string, boolean>;
  ledgerHistory?: PointsLedgerItem[];
  onNavigateTab?: (tab: string) => void;
  onProfileUpdate?: (updated: Partial<DashboardProfile>) => void;
}

export function ProfileView({
  profile,
  session,
  hubTokens,
  crittverseElo,
  userHubUnlocks = {},
  userChessUnlocks = {},
  ledgerHistory = [],
  onNavigateTab,
  onProfileUpdate,
}: ProfileViewProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [walletAddress, setWalletAddress] = useState(profile?.wallet_address || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'trophies' | 'ledger'>('stats');

  const citizenId = profile?.id || session?.user?.id || '00000000-0000-0000-0000-000000000000';
  const email = profile?.email || session?.user?.email || 'citizen@sunshade.icu';
  const initialLetter = (displayName || email || 'C').charAt(0).toUpperCase();

  const memberSinceDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Jul 2026';

  const handleCopyId = () => {
    navigator.clipboard.writeText(citizenId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyWallet = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  const handleAvatarFileSelected = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveMessage({ type: 'error', text: 'Please select a valid image file (PNG, JPEG, WebP, GIF).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage({ type: 'error', text: 'Image file size must be less than 5MB.' });
      return;
    }

    setIsUploadingAvatar(true);
    setSaveMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to upload profile image.');
      }

      const newAvatarUrl = data.avatarUrl;
      setAvatarUrl(newAvatarUrl);
      setSaveMessage({ type: 'success', text: 'Profile image updated successfully!' });

      onProfileUpdate?.({
        avatar_url: newAvatarUrl,
      });
      router.refresh();
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to upload image.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    setSaveMessage(null);

    try {
      const res = await updateCitizenProfile({
        avatarUrl: null,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to remove avatar.');
      }

      setAvatarUrl(null);
      setSaveMessage({ type: 'success', text: 'Profile avatar removed.' });

      onProfileUpdate?.({
        avatar_url: null,
      });
      router.refresh();
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Error removing avatar.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await updateCitizenProfile({
        displayName: displayName,
        walletAddress: walletAddress,
        avatarUrl: avatarUrl,
      });

      if (!res.success) {
        setSaveMessage({ type: 'error', text: res.error || 'Failed to save changes.' });
      } else {
        setSaveMessage({ type: 'success', text: 'Citizen identity updated successfully!' });
        setIsEditing(false);
        onProfileUpdate?.({
          display_name: displayName.trim(),
          wallet_address: walletAddress.trim() || null,
          avatar_url: avatarUrl,
        });
        router.refresh();
        setTimeout(() => setSaveMessage(null), 4000);
      }
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Error saving profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const badges: AchievementBadge[] = [
    {
      id: 'EARLY_ADOPTER',
      name: 'Early Adopter',
      description: 'Joined the SunShade Hub during the Genesis Alpha phase.',
      reward_tokens: 2000,
      game: 'SunShade Hub',
      unlocked: true,
      rarity: 'Legendary',
    },
    {
      id: '7_DAY_STREAK',
      name: 'Week Warrior',
      description: 'Logged into the SunShade Hub for 7 consecutive days.',
      reward_tokens: 500,
      game: 'SunShade Hub',
      unlocked: !!userHubUnlocks['7_DAY_STREAK'],
      rarity: 'Epic',
    },
    {
      id: 'GOVERNANCE_VOTER',
      name: 'Civic Duty',
      description: 'Participated and voted in a verified Community Poll.',
      reward_tokens: 100,
      game: 'Governance',
      unlocked: !!userHubUnlocks['GOVERNANCE_VOTER'],
      rarity: 'Rare',
    },
    {
      id: 'FIRST_BLOOD',
      name: 'First Blood',
      description: 'Captured an opponent piece within the first 5 moves in SunShade Chess.',
      reward_points: 50,
      game: 'SunShade Chess',
      unlocked: !!userChessUnlocks['FIRST_BLOOD'] || true,
      rarity: 'Common',
    },
    {
      id: 'CASTLE_CRASHER',
      name: 'Castle Crasher',
      description: 'Delivered checkmate while your king is castled.',
      reward_points: 100,
      game: 'SunShade Chess',
      unlocked: !!userChessUnlocks['CASTLE_CRASHER'],
      rarity: 'Rare',
    },
    {
      id: 'FISCHER_MASTER',
      name: 'Fischer 960 Grandmaster',
      description: 'Achieved 10 consecutive victories in Chess960 format.',
      reward_points: 1000,
      game: 'SunShade Chess',
      unlocked: !!userChessUnlocks['FISCHER_MASTER'],
      rarity: 'Legendary',
    },
  ];

  const transactions = ledgerHistory.length > 0 ? ledgerHistory : [
    {
      id: 'tx-1',
      user_id: citizenId,
      amount: 2000,
      reason: 'achievement',
      reference_id: 'EARLY_ADOPTER',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'tx-2',
      user_id: citizenId,
      amount: 100,
      reason: 'daily_login',
      reference_id: 'DAILY_BONUS',
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'tx-3',
      user_id: citizenId,
      amount: 50,
      reason: 'match_win',
      reference_id: 'CHESS_WIN_RANKED',
      created_at: new Date().toISOString(),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 pb-12">
      {saveMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            saveMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {saveMessage.type === 'success' ? <Check size={18} /> : <Shield size={18} />}
            <span className="text-sm font-semibold">{saveMessage.text}</span>
          </div>
          <button
            onClick={() => setSaveMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Profile Hero Card */}
      <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-none relative overflow-hidden transition-colors duration-200">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          {/* Avatar with image upload trigger */}
          <div className="relative group shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarFileSelected(file);
                e.target.value = '';
              }}
            />

            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 dark:from-orange-600 dark:to-orange-800 flex items-center justify-center shadow-xl shadow-orange-500/25 border-2 border-orange-400/40 relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName || 'Citizen Avatar'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <span className="font-extrabold text-4xl sm:text-5xl text-white tracking-tight drop-shadow-md">
                  {initialLetter}
                </span>
              )}

              {/* Hover upload button overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                title="Upload Profile Image"
              >
                {isUploadingAvatar ? (
                  <Loader2 size={24} className="animate-spin text-orange-400" />
                ) : (
                  <>
                    <Camera size={22} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                  </>
                )}
              </button>
            </div>

            <div
              className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white dark:border-[#161616] shadow-md"
              title="Verified Citizen"
            >
              <UserCheck size={14} />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  {displayName || 'Citizen'}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {profile?.citizen_tier || 'Active Citizen'}
                </span>
              </div>

              <div className="flex items-center gap-2 self-center sm:self-auto">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 transition-colors"
                >
                  <Camera size={14} />
                  {isUploadingAvatar ? 'Uploading...' : 'Upload Image'}
                </button>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
                >
                  <Edit3 size={14} />
                  {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                </button>
              </div>
            </div>

            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{email}</p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700/50">
                <span className="text-zinc-400 font-mono">ID:</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {citizenId.substring(0, 8)}...{citizenId.substring(citizenId.length - 4)}
                </span>
                <button
                  onClick={handleCopyId}
                  className="hover:text-orange-500 dark:hover:text-orange-400 p-0.5 transition-colors"
                  title="Copy Citizen UUID"
                >
                  {copiedId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700/50">
                <Clock size={12} className="text-zinc-400" />
                <span>Member since {memberSinceDate}</span>
              </div>

              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700/50">
                <Shield size={12} className="text-orange-500" />
                <span>Reputation: {profile?.reputation_score ?? 100}/100</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center md:justify-start gap-2">
              <div className="inline-flex items-center gap-2 text-xs bg-zinc-50 dark:bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <Wallet size={14} className="text-orange-500 shrink-0" />
                {walletAddress ? (
                  <>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">
                      {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                    </span>
                    <button
                      onClick={handleCopyWallet}
                      className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                      title="Copy Wallet Address"
                    >
                      {copiedWallet ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </>
                ) : (
                  <span className="text-zinc-400 italic">No Web3 wallet linked</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800/80 space-y-4 animate-in fade-in duration-200"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Citizen Display Alias
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. NeoCow, CipherKnight"
                  maxLength={32}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:border-orange-500 dark:focus:border-orange-500 text-zinc-900 dark:text-zinc-100 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Linked Web3 / Identity Wallet
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x... (Ethereum) or Solana address"
                  className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:border-orange-500 dark:focus:border-orange-500 text-zinc-900 dark:text-zinc-100 font-mono transition-colors"
                />
              </div>
            </div>

            {/* Profile Avatar Upload Control in Edit Form */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Profile Avatar Picture
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-300 dark:border-zinc-700">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-xl text-zinc-500">{initialLetter}</span>
                  )}
                </div>

                <div className="flex-1 flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    ref={editFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarFileSelected(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isUploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {isUploadingAvatar ? 'Uploading Image...' : 'Upload Image (PNG, JPG, WebP)'}
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="px-3 py-2 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || isUploadingAvatar}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white shadow-md shadow-orange-600/20 transition-colors flex items-center gap-1.5"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {isSaving ? 'Saving Updates...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Primary Key Stats Grid (4 Metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-4 sm:p-5 shadow-sm dark:shadow-none hover:border-orange-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Global Hub Tokens</span>
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
              <Hexagon size={18} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {hubTokens.toLocaleString()} <span className="text-xs text-orange-500 font-semibold">HT</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Cross-game currency</p>
        </div>

        <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-4 sm:p-5 shadow-sm dark:shadow-none hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Critterverse ELO</span>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {crittverseElo.toLocaleString()}
          </div>
          <p className="text-[11px] text-blue-500 font-medium mt-1">Tier: Gold Champion</p>
        </div>

        <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-4 sm:p-5 shadow-sm dark:shadow-none hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Chess Standard ELO</span>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <Swords size={18} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            1,450 <span className="text-xs text-amber-500 font-semibold">Fischer: 1,380</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">12 Wins • 54% Winrate</p>
        </div>

        <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-4 sm:p-5 shadow-sm dark:shadow-none hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Badges Unlocked</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <Award size={18} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {badges.filter((b) => b.unlocked).length} / {badges.length}
          </div>
          <p className="text-[11px] text-emerald-500 font-medium mt-1">3 Legendary Unlocked</p>
        </div>
      </div>

      {/* Tabs Switcher for Profile Sections */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'stats'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Ecosystem Game Matrix
        </button>
        <button
          onClick={() => setActiveTab('trophies')}
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'trophies'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Award size={16} />
          Trophy Cabinet ({badges.filter((b) => b.unlocked).length})
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'ledger'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Hexagon size={16} />
          Token Ledger
        </button>
      </div>

      {/* TAB 1: Game Stats Breakdown Matrix */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-5 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <Gamepad2 size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white">Critterverse (Cozy)</h4>
                  <p className="text-xs text-zinc-500">Cozy Farming & Village Builder</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                Season 1
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/60 text-center">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Rank Rating</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{crittverseElo}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Farm Level</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Lvl 14</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Cozy Points</span>
                <span className="text-sm font-bold text-blue-500">3,420 CP</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              <span>Status: Active In Staging</span>
              <button
                onClick={() => onNavigateTab?.('Game Library')}
                className="text-orange-500 hover:text-orange-400 font-medium flex items-center gap-1"
              >
                Launch Game <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-5 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                  <Swords size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white">SunShade Chess</h4>
                  <p className="text-xs text-zinc-500">Ranked Standard & Chess960</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                Online
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/60 text-center">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Standard</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">1,450 ELO</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Chess960</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">1,380 ELO</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Win Streak</span>
                <span className="text-sm font-bold text-orange-500">4 Wins 🔥</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              <span>Status: Live Multiplayer</span>
              <button
                onClick={() => onNavigateTab?.('Game Library')}
                className="text-orange-500 hover:text-orange-400 font-medium flex items-center gap-1"
              >
                Match Lobby <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-5 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                  <Zap size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white">Puk Huk Arcade</h4>
                  <p className="text-xs text-zinc-500">Fast-Paced Neon Arena Shooter</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                Season 2
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/60 text-center">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">High Score</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">89,450</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Arcade Tier</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Diamond</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Global Rank</span>
                <span className="text-sm font-bold text-purple-500">#42</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              <span>Status: Tournaments Live</span>
              <button
                onClick={() => onNavigateTab?.('Game Library')}
                className="text-orange-500 hover:text-orange-400 font-medium flex items-center gap-1"
              >
                Enter Arena <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-5 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Flame size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white">Second Wind: War</h4>
                  <p className="text-xs text-zinc-500">Tactical Collectible Card War</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Alpha
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/60 text-center">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Card Rating</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">1,620</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Deck Slots</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">6 / 8</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Battle Tokens</span>
                <span className="text-sm font-bold text-emerald-500">850 WP</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              <span>Status: Alpha Deckbuilder</span>
              <button
                onClick={() => onNavigateTab?.('Game Library')}
                className="text-orange-500 hover:text-orange-400 font-medium flex items-center gap-1"
              >
                View Decks <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Trophy Cabinet */}
      {activeTab === 'trophies' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`p-5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                badge.unlocked
                  ? 'bg-white dark:bg-[#161616] border-zinc-200 dark:border-zinc-800/80 shadow-sm hover:border-orange-500/40'
                  : 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200/60 dark:border-zinc-800/30 opacity-50'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      badge.unlocked
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-500'
                        : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <Award size={22} />
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      badge.rarity === 'Legendary'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                        : badge.rarity === 'Epic'
                        ? 'bg-purple-500/10 text-purple-500 border border-purple-500/30'
                        : badge.rarity === 'Rare'
                        ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
                        : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/30'
                    }`}
                  >
                    {badge.rarity}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white text-base">{badge.name}</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs">
                <span className="text-zinc-500">{badge.game}</span>
                <span className="font-bold font-mono text-orange-600 dark:text-orange-400">
                  +{badge.reward_tokens || badge.reward_points} {badge.reward_tokens ? 'HT' : 'CP'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Points Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">Citizen Points Ledger</h3>
              <p className="text-xs text-zinc-500">Immutable ledger recording cross-game token rewards</p>
            </div>
            <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-3 py-1 rounded-full">
              Total: {hubTokens.toLocaleString()} HT
            </span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 shrink-0">
                    <Hexagon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 capitalize">
                      {tx.reason.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-zinc-500 font-mono">
                      Ref: {tx.reference_id || 'SYSTEM_REWARD'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
                    +{tx.amount} HT
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
