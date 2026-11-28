'use client';

import React, { useState } from 'react';
import { supabase } from '@digitalcanopy/supabase';

function isTrustedRedirectHost(rawHost: string): boolean {
  if (!rawHost || typeof rawHost !== 'string') return false;
  const host = rawHost.toLowerCase().trim();

  if (host === 'sunshade.icu' || host.endsWith('.sunshade.icu')) {
    return true;
  }
  if (host === 'localhost' || host === '127.0.0.1') {
    return true;
  }
  if (
    host.endsWith('-sunshade-systems.vercel.app') ||
    host.endsWith('.sunshade-systems.vercel.app') ||
    host === 'sunshade-systems.vercel.app'
  ) {
    return true;
  }
  if (
    /^(cozy|chess|pukhuk|critterverse|sunshade)-[a-z0-9-]+\.vercel\.app$/.test(host) ||
    /^(cozy|chess|pukhuk|critterverse|sunshade)\.vercel\.app$/.test(host)
  ) {
    return true;
  }
  return false;
}

function getSafeRedirectUrlFromSearch(session?: any): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const rawRedirect =
      searchParams.get('redirect_to') ||
      searchParams.get('redirect') ||
      searchParams.get('returnTo') ||
      searchParams.get('return_to') ||
      searchParams.get('next') ||
      searchParams.get('callbackUrl');

    if (!rawRedirect || typeof rawRedirect !== 'string') return null;
    const clean = rawRedirect.trim();
    if (clean.startsWith('/')) return clean;

    const parsed = new URL(clean);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    if (isTrustedRedirectHost(parsed.hostname)) {
      const host = parsed.hostname.toLowerCase();
      if (host === 'sunshade.icu' || host.endsWith('.sunshade.icu')) {
        return parsed.toString();
      }

      if (session?.access_token && session?.refresh_token) {
        const callbackUrl = new URL('/auth/callback', parsed.origin);
        callbackUrl.searchParams.set('access_token', session.access_token);
        callbackUrl.searchParams.set('refresh_token', session.refresh_token);
        const nextPath = parsed.pathname + parsed.search;
        if (nextPath && nextPath !== '/') {
          callbackUrl.searchParams.set('next', nextPath);
        }
        return callbackUrl.toString();
      }

      return parsed.toString();
    }
  } catch {
    // Ignore parse error
  }
  return null;
}

export function HubLoginForm() {
  const [authMode, setAuthMode] = useState<'password' | 'code' | 'request'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestResponseMessage, setRequestResponseMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      setError(signInErr.message);
      setSubmitting(false);
      return;
    }

    const targetRedirect = getSafeRedirectUrlFromSearch(authData?.session);
    if (targetRedirect) {
      window.location.href = targetRedirect;
      return;
    }

    setSubmitting(false);
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const targetRedirect = getSafeRedirectUrlFromSearch();

    try {
      const res = await fetch('/api/auth/claim-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode, redirect_to: targetRedirect }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to authenticate with user code.');
      }

      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired auth code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: requestEmail, note: requestNote }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit code request.');
      }

      setRequestResponseMessage(
        data.message ||
          'Your request has been logged. An admin will review it and issue your 8-character auth code.'
      );
      setRequestSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Mode Switcher Tabs */}
      <div
        role="tablist"
        aria-label="Sign in method"
        className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800"
      >
        <button
          type="button"
          role="tab"
          aria-selected={authMode === 'password'}
          onClick={() => {
            setAuthMode('password');
            setError(null);
          }}
          className={`min-h-[36px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            authMode === 'password'
              ? 'bg-orange-700 text-white'
              : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={authMode === 'code'}
          onClick={() => {
            setAuthMode('code');
            setError(null);
          }}
          className={`min-h-[36px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            authMode === 'code'
              ? 'bg-orange-700 text-white'
              : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
          }`}
        >
          Join Code
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={authMode === 'request'}
          onClick={() => {
            setAuthMode('request');
            setError(null);
            setRequestSubmitted(false);
          }}
          className={`min-h-[36px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            authMode === 'request'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
          }`}
        >
          Request Code
        </button>
      </div>

      {authMode === 'password' && (
        <form onSubmit={handleSubmitPassword} className="space-y-3">
          <input
            type="email"
            aria-label="Email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-400 text-sm outline-none focus:border-orange-500"
          />
          <input
            type="password"
            aria-label="Password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-400 text-sm outline-none focus:border-orange-500"
          />
          {error && <div className="text-rose-400 text-xs">{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      )}

      {authMode === 'code' && (
        <form onSubmit={handleSubmitCode} className="space-y-3">
          <p className="text-center text-zinc-300 text-xs">
            Enter your 8-character user code to join the Hub.
          </p>
          <input
            type="text"
            aria-label="8-Character Code"
            placeholder="8-Character Code (e.g. ASDF1234)"
            value={authCode}
            onChange={(e) => setAuthCode(e.target.value.toUpperCase().trim())}
            maxLength={8}
            required
            className="w-full h-12 px-3.5 rounded-xl border border-orange-500/50 bg-zinc-950 text-white text-base font-bold tracking-widest text-center uppercase placeholder:text-zinc-400 outline-none focus:border-orange-400"
          />
          {error && <div className="text-rose-400 text-xs text-center">{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {submitting ? 'Verifying Code...' : 'Join Hub with Code'}
          </button>
        </form>
      )}

      {authMode === 'request' && (
        <div>
          {requestSubmitted ? (
            <div className="bg-zinc-950 border border-emerald-500/40 rounded-xl p-4 text-center space-y-2">
              <div className="text-emerald-400 font-bold text-sm">
                {requestResponseMessage?.toLowerCase().includes('already')
                  ? 'Request Already Logged!'
                  : 'Request Submitted!'}
              </div>
              <p className="text-zinc-300 text-xs leading-relaxed">
                {requestResponseMessage ||
                  'Your request has been logged. An admin will review it and issue your 8-character auth code.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleRequestCode} className="space-y-3">
              <p className="text-center text-zinc-300 text-xs">
                Request an 8-character auth code from the admins to join the Hub.
              </p>
              <input
                type="email"
                aria-label="Your Email"
                placeholder="Your Email"
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-400 text-sm outline-none focus:border-orange-500"
              />
              <textarea
                aria-label="Reason or Note"
                placeholder="Reason or Note (Optional)"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-400 text-xs outline-none focus:border-orange-500 resize-none"
              />
              {error && <div className="text-rose-400 text-xs">{error}</div>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors border border-zinc-700"
              >
                {submitting ? 'Submitting Request...' : 'Submit Request'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
