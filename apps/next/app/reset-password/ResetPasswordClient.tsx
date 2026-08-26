'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@sunshade/supabase';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass,
  Key,
} from 'lucide-react';
import Link from 'next/link';
import { getValidatedRedirectUrl } from '../../lib/env';

function getAppNameFromUrl(url: string): string | null {
  try {
    if (url.startsWith('/')) return null;
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.endsWith('.sunshade.icu')) {
      const parts = host.split('.');
      const appSubdomain = parts[0].replace('-stag', '');
      if (appSubdomain === 'hub') return null;
      return appSubdomain.charAt(0).toUpperCase() + appSubdomain.slice(1);
    }

    if (host.endsWith('.vercel.app')) {
      const prefix = host.split('-')[0];
      if (prefix && prefix !== 'sunshade' && prefix !== 'hub') {
        return prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }
      return null;
    }
  } catch {
    // Ignore error
  }
  return null;
}

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Inspect SSO handshake redirect params
  const rawTargetUrl =
    searchParams.get('redirect_to') ||
    searchParams.get('redirect') ||
    searchParams.get('returnTo') ||
    searchParams.get('return_to') ||
    searchParams.get('next') ||
    searchParams.get('callbackUrl') ||
    searchParams.get('callback') ||
    searchParams.get('app_url') ||
    searchParams.get('url');

  const handshakeTargetUrl = useMemo(
    () => getValidatedRedirectUrl(rawTargetUrl, '/dashboard'),
    [rawTargetUrl]
  );
  const targetAppName = useMemo(
    () => getAppNameFromUrl(handshakeTargetUrl),
    [handshakeTargetUrl]
  );

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectCount, setRedirectCount] = useState(3);

  // Keep refs for countdown timer to avoid restarting on session update events
  const sessionDataRef = useRef<any>(null);
  sessionDataRef.current = sessionData;

  const handshakeTargetUrlRef = useRef<string>(handshakeTargetUrl);
  handshakeTargetUrlRef.current = handshakeTargetUrl;

  // Check auth recovery session on mount
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        if (session) {
          setHasSession(true);
          setSessionData(session);
        } else {
          setHasSession(false);
        }
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        if (session) {
          setHasSession(true);
          setSessionData(session);
        } else if (event === 'SIGNED_OUT') {
          setHasSession(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const performRedirect = (target: string, session?: any) => {
    if (target.startsWith('/')) {
      router.replace(target);
      return;
    }

    try {
      const parsed = new URL(target);
      const host = parsed.hostname.toLowerCase();

      // If on sunshade.icu, shared cookie works natively
      if (host === 'sunshade.icu' || host.endsWith('.sunshade.icu')) {
        window.location.href = parsed.toString();
        return;
      }

      // For cross-domain preview environments, pass tokens via URL hash fragment
      // to keep tokens out of server request URLs, access logs, and referer headers
      if (session?.access_token && session?.refresh_token) {
        const callbackUrl = new URL('/auth/callback', parsed.origin);
        const hashParams = new URLSearchParams();
        hashParams.set('access_token', session.access_token);
        hashParams.set('refresh_token', session.refresh_token);
        const nextPath = parsed.pathname + parsed.search;
        if (nextPath && nextPath !== '/') {
          hashParams.set('next', nextPath);
        }
        callbackUrl.hash = hashParams.toString();
        window.location.href = callbackUrl.toString();
        return;
      }
    } catch {
      // ignore
    }

    window.location.href = target;
  };

  // Handle automatic redirect on successful password update
  useEffect(() => {
    if (!isSuccess) return;

    const timer = setInterval(() => {
      setRedirectCount((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          performRedirect(handshakeTargetUrlRef.current, sessionDataRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSuccess]);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-zinc-700' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 33, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score: 66, label: 'Medium', color: 'bg-amber-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your entries.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      if (data?.user) {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Your reset link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const forgotPasswordLink = `/forgot-password${
    handshakeTargetUrl !== '/dashboard'
      ? `?redirect_to=${encodeURIComponent(handshakeTargetUrl)}`
      : ''
  }`;

  // Initial loading state while checking session
  if (hasSession === null) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center p-4 text-white font-sans"
        style={{
          background: 'radial-gradient(ellipse at top, #1c140e 0%, #111111 50%, #0a0a0a 100%)',
        }}
      >
        <img src="/logo.png" alt="SunShade Systems" className="w-64 h-auto mb-6 object-contain" />
        <div className="flex items-center gap-2 text-xs font-mono text-orange-400 animate-pulse">
          <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
          <span>Validating recovery session...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-orange-500/30 selection:text-white relative overflow-hidden my-auto"
      style={{
        background: 'radial-gradient(ellipse at top, #1c140e 0%, #111111 50%, #0a0a0a 100%)',
      }}
    >
      {/* Ambient Backdrop Glows */}
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none -top-20 -left-20 opacity-35"
        style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.3) 0%, transparent 70%)' }}
      />
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20 opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-md p-6 sm:p-8 rounded-3xl bg-zinc-900/90 backdrop-blur-xl border border-orange-500/30 shadow-2xl shadow-orange-950/20 space-y-6 animate-in fade-in zoom-in-95 duration-300 mx-auto">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-1">
            <img src="/logo.png" alt="SunShade Systems" className="h-9 object-contain" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-wider text-orange-400 bg-orange-950/40 border border-orange-500/30 uppercase">
              <Sparkles className="w-3 h-3 text-orange-400" />
              <span>
                {targetAppName ? `SSO Handshake: ${targetAppName}` : 'Account Security'}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight mt-1.5">
              Set New Password
            </h1>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
              {hasSession
                ? 'Choose a strong, secure password for your SunShade account.'
                : 'Session expired or recovery link is invalid.'}
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-700 text-rose-200 text-xs font-medium flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-white font-bold text-xs"
              type="button"
            >
              ✕
            </button>
          </div>
        )}

        {/* No Session State (Link Expired or Direct Access) */}
        {!hasSession ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-center">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <div className="text-sm font-bold text-zinc-200">No Recovery Session Active</div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Your password reset link may have expired or was already used. Please request a new
                link to continue.
              </p>
            </div>

            <Link
              href={forgotPasswordLink}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-95 border border-orange-500/40 text-center"
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                boxShadow: '0 4px 16px rgba(234,88,12,0.35)',
              }}
            >
              <Key className="w-4 h-4" />
              <span>Request New Reset Link</span>
            </Link>
          </div>
        ) : isSuccess ? (
          /* Success Screen */
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-600 flex items-center justify-center text-emerald-400 shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-zinc-100">Password Updated!</h2>
              <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                Your password has been changed successfully. You are now logged in.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
              <p className="text-xs text-zinc-400">
                {targetAppName
                  ? `Redirecting back to ${targetAppName} in`
                  : 'Redirecting to Dashboard in'}
              </p>
              <div className="font-mono text-2xl font-extrabold text-orange-400">
                {redirectCount}s
              </div>
            </div>

            <button
              onClick={() => performRedirect(handshakeTargetUrl, sessionData)}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-95 border border-orange-500/40"
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                boxShadow: '0 4px 16px rgba(234,88,12,0.35)',
              }}
            >
              <span>{targetAppName ? `Return to ${targetAppName}` : 'Go to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Set New Password Form */
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 h-6">
                <Lock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>New Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoFocus
                  className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl pl-3.5 pr-10 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {password && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>Password Strength:</span>
                    <span className="font-bold">{strength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 h-6">
                <Lock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Confirm New Password</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={8}
                  className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl pl-3.5 pr-10 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-95 border border-orange-500/40 disabled:opacity-50 mt-2"
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                boxShadow: '0 4px 16px rgba(234,88,12,0.35)',
              }}
            >
              <span>{isSubmitting ? 'Updating Password...' : 'Save & Update Password'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Brand Footer */}
        <div className="pt-2 text-center border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-zinc-500 pt-1">
            <Compass className="w-3.5 h-3.5 text-zinc-500" />
            <span>SunShade Ecosystem • Central SSO Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
}
