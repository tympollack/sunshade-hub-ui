'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { supabase } from '@digitalcanopy/supabase';
import {
  Sun,
  Moon,
  Lock,
  ShieldCheck,
  Share2,
  Key,
  Check,
  LogOut,
} from 'lucide-react';

interface SettingsViewProps {
  session: any;
  onOpenSecurityDrawer: () => void;
  onOpenBroadcastDrawer: () => void;
}

export function SettingsView({
  session,
  onOpenSecurityDrawer,
  onOpenBroadcastDrawer,
}: SettingsViewProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // In-portal Password Update State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Auth Code State
  const [requestCodeSubmitted, setRequestCodeSubmitted] = useState(false);
  const [isGeneratingUserCode, setIsGeneratingUserCode] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 pb-12">
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
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium rounded-lg transition-colors flex items-center gap-2"
              >
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
            <div
              className={`p-3 rounded-lg text-xs font-semibold ${
                passwordStatus.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
              }`}
            >
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

        {/* Deliberation Security Architecture */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
                <ShieldCheck className="text-orange-500 w-5 h-5 shrink-0" />
                <span>How We Protect Deliberation</span>
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Learn how anti-bandwagoning lockboxes, zero-knowledge proofs, and sybil resistance preserve civic consensus.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenSecurityDrawer}
                className="px-4 py-2 bg-orange-600/10 hover:bg-orange-600/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-semibold rounded-lg transition-colors flex items-center gap-2 text-xs shrink-0"
              >
                <ShieldCheck size={14} />
                <span>View Deliberation Security</span>
              </button>
              <button
                type="button"
                onClick={onOpenBroadcastDrawer}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 text-xs shrink-0 shadow-sm shadow-orange-600/20"
                data-testid="btn-open-broadcast-drawer"
              >
                <Share2 size={14} />
                <span>Social Broadcast Preview</span>
              </button>
            </div>
          </div>
        </div>

        {/* User Auth Code */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">User Auth Code</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Request an 8-character auth code from admins to sign in on another device or grant Hub access.
          </p>

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
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
