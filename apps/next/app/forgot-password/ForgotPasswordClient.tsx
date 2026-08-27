'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@sunshade/supabase';
import {
  Mail,
  Key,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Compass,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { getValidatedRedirectUrl } from '../../lib/env';

export default function ForgotPasswordClient() {
  const searchParams = useSearchParams();

  // Inspect common SSO handshake query parameter names
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

  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Error passed in URL query param (e.g. from callback failure)
  useEffect(() => {
    const queryError = searchParams.get('error');
    if (queryError) {
      setError(decodeURIComponent(queryError));
    }
  }, [searchParams]);

  // Handle resend countdown cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleSendRecoveryEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const redirectParam =
        handshakeTargetUrl !== '/dashboard' ? handshakeTargetUrl : undefined;

      // 1. Try custom transactional recovery email via Resend API route
      const res = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          redirect_to: redirectParam,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // 2. Client-side fallback to Supabase Auth resetPasswordForEmail
        const resetPath = `/reset-password${
          redirectParam ? `?redirect_to=${encodeURIComponent(redirectParam)}` : ''
        }`;
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(resetPath)}`;

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo,
        });

        if (resetError) {
          throw resetError;
        }
      }

      setSubmittedEmail(cleanEmail);
      setCooldownSeconds(60);
    } catch (err: any) {
      setError(err.message || 'Failed to send recovery email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginLink = `/login${
    handshakeTargetUrl !== '/dashboard'
      ? `?redirect_to=${encodeURIComponent(handshakeTargetUrl)}`
      : ''
  }`;

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
        {/* Header Branding & Badge */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-1">
            <img src="/logo.png" alt="SunShade Systems" className="h-9 object-contain" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-wider text-orange-400 bg-orange-950/40 border border-orange-500/30 uppercase">
              <Key className="w-3 h-3 text-orange-400" />
              <span>Password Recovery</span>
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight mt-1.5">
              Reset Your Password
            </h1>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
              Enter your account email and we'll send you a secure link to choose a new password.
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

        {/* Success Confirmation State */}
        {submittedEmail ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-950/90 border border-emerald-500/30 space-y-3 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-600 flex items-center justify-center text-emerald-400 shadow-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-100">Recovery Email Sent</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  We've sent a password reset link to{' '}
                  <strong className="text-orange-400">{submittedEmail}</strong>. Click the link in
                  your email to set a new password.
                </p>
              </div>
              <p className="text-[11px] text-zinc-500 leading-normal pt-1 border-t border-zinc-800/80">
                Didn't receive the email? Be sure to check your spam folder or request another link.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSendRecoveryEmail}
                disabled={isSubmitting || cooldownSeconds > 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-300 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                <span>
                  {cooldownSeconds > 0
                    ? `Resend available in ${cooldownSeconds}s`
                    : isSubmitting
                    ? 'Resending...'
                    : 'Resend Recovery Email'}
                </span>
              </button>

              <Link
                href={loginLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-95 border border-orange-500/40 text-center"
                style={{
                  background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                  boxShadow: '0 4px 16px rgba(234,88,12,0.35)',
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Request Form */
          <form onSubmit={handleSendRecoveryEmail} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 h-6">
                <Mail className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Account Email</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@domain.com"
                required
                autoFocus
                className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl px-4 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <span className="text-[10px] text-zinc-500 block">
                The email address associated with your SunShade account.
              </span>
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
              <span>{isSubmitting ? 'Sending Recovery Link...' : 'Send Recovery Link'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Back to Login & Brand Footer */}
        <div className="pt-2 text-center border-t border-zinc-800/80 space-y-2">
          {!submittedEmail && (
            <Link
              href={loginLink}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Remember your password? Back to Sign In</span>
            </Link>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-zinc-500 pt-1">
            <Compass className="w-3.5 h-3.5 text-zinc-500" />
            <span>SunShade Ecosystem • Central SSO Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
}
