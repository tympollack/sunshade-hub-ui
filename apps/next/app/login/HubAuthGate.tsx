'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@digitalcanopy/supabase';
import { HubLoginForm } from './HubLoginForm';

export function HubAuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (!supabaseUrl || supabaseUrl.includes('placeholder.supabase.co')) {
      setLoading(false);
      return;
    }

    const timeout = setTimeout(() => {
      if (active) setLoading(false);
    }, 5000);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        clearTimeout(timeout);
        setSession(data?.session ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        clearTimeout(timeout);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#111111] text-stone-100 font-sans">
        <img src="/logo.png" alt="SunShade Systems" className="w-64 h-auto mb-6 object-contain" />
        <p className="text-xs font-mono text-zinc-300">Initializing Secure Session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 text-stone-100 font-sans overflow-x-hidden"
        style={{
          background: 'radial-gradient(ellipse at top, #1c140e 0%, #111111 50%, #0a0a0a 100%)',
        }}
      >
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-zinc-900/90 backdrop-blur-xl border border-orange-500/30 shadow-2xl space-y-5">
          <div className="flex justify-center">
            <img src="/logo.png" alt="SunShade Systems" className="h-9 object-contain" />
          </div>
          <h1 className="text-xl font-extrabold text-center text-stone-100">
            Sign In to SunShade Hub
          </h1>
          <HubLoginForm />
          <p className="text-center text-[11px] font-mono text-zinc-400 pt-2 border-t border-zinc-800">
            SunShade Systems • Central SSO Gateway
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
