'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@digitalcanopy/supabase';
import { LoginForm } from '@digitalcanopy/ui';
import { Sparkles, Compass, Key, ExternalLink, ShieldCheck } from 'lucide-react';
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
      return appSubdomain.charAt(0).toUpperCase() + appSubdomain.slice(1);
    }

    if (host.endsWith('.vercel.app')) {
      // e.g. cozy-git-feature-graphics-remodel-sunshade-systems.vercel.app -> Cozy
      const prefix = host.split('-')[0];
      if (prefix && prefix !== 'sunshade') {
        return prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }
      return 'SunShade App';
    }
  } catch {
    // Ignore error
  }
  return null;
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Inspect all common SSO handshake query parameter names
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

  const handshakeTargetUrl = useMemo(() => getValidatedRedirectUrl(rawTargetUrl, '/dashboard'), [rawTargetUrl]);
  const targetAppName = useMemo(() => getAppNameFromUrl(handshakeTargetUrl), [handshakeTargetUrl]);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const performHandshakeRedirect = (target: string, session?: any) => {
    setRedirecting(true);
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

      // For cross-domain preview environments (e.g. *.vercel.app, localhost),
      // pass tokens to the target app's /auth/callback to establish cookies on that origin!
      if (session?.access_token && session?.refresh_token) {
        const callbackUrl = new URL('/auth/callback', parsed.origin);
        callbackUrl.searchParams.set('access_token', session.access_token);
        callbackUrl.searchParams.set('refresh_token', session.refresh_token);
        const nextPath = parsed.pathname + parsed.search;
        if (nextPath && nextPath !== '/') {
          callbackUrl.searchParams.set('next', nextPath);
        }
        window.location.href = callbackUrl.toString();
        return;
      }
    } catch {
      // ignore
    }

    window.location.href = target;
  };

  useEffect(() => {
    let isMounted = true;

    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && isMounted) {
        performHandshakeRedirect(handshakeTargetUrl, session);
      } else if (isMounted) {
        setCheckingAuth(false);
      }
    };

    checkExistingSession();

    // Listen for auth state changes (e.g. password login, magic link, code claim)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && isMounted) {
        performHandshakeRedirect(handshakeTargetUrl, session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [handshakeTargetUrl, router]);

  if (checkingAuth || redirecting) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center p-4 selection:bg-orange-500/30 text-white font-sans"
        style={{
          background: 'radial-gradient(ellipse at top, #1c140e 0%, #111111 50%, #0a0a0a 100%)',
        }}
      >
        <img src="/logo.png" alt="SunShade Systems" className="w-64 h-auto mb-6 object-contain" />
        <div className="flex items-center gap-2 text-xs font-mono text-orange-400 animate-pulse">
          <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
          <span>
            {redirecting
              ? `Completing SSO Handshake${targetAppName ? ` for ${targetAppName}` : ''}...`
              : 'Initializing SunShade Auth Portal...'}
          </span>
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
        
        {/* Header Branding & Handshake Context */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-1">
            <img src="/logo.png" alt="SunShade Systems" className="h-9 object-contain" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-wider text-orange-400 bg-orange-950/40 border border-orange-500/30 uppercase">
              <Sparkles className="w-3 h-3 text-orange-400" />
              <span>
                {targetAppName ? `SSO Handshake: ${targetAppName}` : 'Central SSO Gateway'}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight mt-1.5">
              Sign In to SunShade Hub
            </h1>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
              {targetAppName ? (
                <span className="flex items-center justify-center gap-1">
                  <span>Authenticating to return to</span>
                  <strong className="text-orange-400">{targetAppName}</strong>
                  <ExternalLink className="w-3 h-3 text-orange-400 inline" />
                </span>
              ) : (
                'Access your ecosystem profile, edge nodes, and game library applications.'
              )}
            </p>
          </div>
        </div>

        {/* Auth Form Box */}
        <div className="flex justify-center">
          <LoginForm />
        </div>

        {/* Helper Links: Forgot Password & Claim Code CTA */}
        <div className="pt-2 text-center border-t border-zinc-800/80 space-y-2.5">
          <div className="flex items-center justify-center gap-1.5">
            <Link
              href={`/forgot-password${handshakeTargetUrl !== '/dashboard' ? `?redirect_to=${encodeURIComponent(handshakeTargetUrl)}` : ''}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-orange-400 transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-orange-500" />
              <span>Forgot your password? Reset it here →</span>
            </Link>
          </div>

          <div>
            <Link
              href={`/claim${handshakeTargetUrl !== '/dashboard' ? `?redirect_to=${encodeURIComponent(handshakeTargetUrl)}` : ''}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Have an 8-character activation code? Claim code here →</span>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-zinc-500 pt-1">
            <Compass className="w-3.5 h-3.5 text-zinc-500" />
            <span>SunShade Ecosystem • Central SSO Gateway</span>
          </div>
        </div>

      </div>
    </div>
  );
}
