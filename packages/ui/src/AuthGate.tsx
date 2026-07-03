'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@sunshade/supabase';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setSubmitting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111111', color: 'white', fontFamily: 'sans-serif' }}>
      <img src="/logo.png" alt="SunShade Systems" style={{ width: 260, height: 'auto', marginBottom: 32 }} />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 300 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #333', background: '#1a1a1a', color: 'white', fontSize: 14, outline: 'none' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #333', background: '#1a1a1a', color: 'white', fontSize: 14, outline: 'none' }}
        />
        {error && <div style={{ color: '#ef4444', fontSize: 12 }}>{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          style={{ padding: '11px 0', borderRadius: 6, border: 'none', background: submitting ? '#7c3010' : '#ea580c', color: 'white', fontSize: 15, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};

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
    return <LoginForm />;
  }

  return (
    <>
      {children}
    </>
  );
};
