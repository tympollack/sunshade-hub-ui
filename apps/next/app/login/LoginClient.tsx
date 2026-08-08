'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@sunshade/supabase';
import { LoginForm } from 'ui';
import { Sparkles, Shield, Compass, Key } from 'lucide-react';
import Link from 'next/link';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect_to') || '/dashboard';

  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace(redirectTo);
      } else {
        setCheckingAuth(false);
      }
    };
    checkSession();
  }, [router, redirectTo]);

  if (checkingAuth) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center p-4 selection:bg-orange-500/30 text-white font-sans"
        style={{
          background: 'radial-gradient(ellipse at top, #1c140e 0%, #111111 50%, #0a0a0a 100%)',
        }}
      >
        <img src="/logo.png" alt="SunShade Systems" className="w-64 h-auto mb-6 object-contain" />
        <div className="text-xs font-mono text-zinc-400 animate-pulse">Initializing SunShade Auth Portal...</div>
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
              <span>Central Authentication</span>
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight mt-1.5">
              Sign In to SunShade Hub
            </h1>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
              Access your ecosystem profile, edge nodes, and game library applications.
            </p>
          </div>
        </div>

        {/* Auth Form Box */}
        <div className="flex justify-center">
          <LoginForm />
        </div>

        {/* Claim Code CTA Link */}
        <div className="pt-2 text-center border-t border-zinc-800/80 space-y-2">
          <Link
            href="/claim"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Have an 8-character activation code? Claim code here →</span>
          </Link>

          <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-zinc-500 pt-1">
            <Compass className="w-3.5 h-3.5 text-zinc-500" />
            <span>SunShade Ecosystem • SSO Gateway</span>
          </div>
        </div>

      </div>
    </div>
  );
}
