'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@sunshade/supabase';

export const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) setAuthError('Session init timed out. Check Supabase env vars.');
        return false;
      });
    }, 8000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout);
        setSession(session);
        setLoading(false);
      })
      .catch((err: unknown) => {
        clearTimeout(timeout);
        console.error('[AuthGate] getSession failed:', err);
        setAuthError(err instanceof Error ? err.message : 'Failed to initialize session');
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  if (authError) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111111', color: 'white', fontFamily: 'sans-serif' }}>
      <img src="/logo.png" alt="SunShade Systems" style={{ width: 300, height: 'auto', marginBottom: 20 }} />
      <div style={{ color: '#ef4444', marginBottom: 8, fontWeight: 600 }}>Auth Error</div>
      <div style={{ color: '#a1a1aa', fontSize: 13, maxWidth: 400, textAlign: 'center' }}>{authError}</div>
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111111', color: 'white', fontFamily: 'sans-serif' }}>
      <img src="/logo.png" alt="SunShade Systems" style={{ width: 300, height: 'auto', marginBottom: 20 }} />
      <div style={{ color: '#a1a1aa' }}>Initializing Secure Session...</div>
    </div>
  );

  if (!session) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111111', color: 'white', fontFamily: 'sans-serif' }}>
        <img src="/logo.png" alt="SunShade Systems" style={{ width: 300, height: 'auto', marginBottom: 20 }} />
        <div style={{ color: '#a1a1aa', fontSize: 13 }}>Access restricted. Please sign in through the app.</div>
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
};
