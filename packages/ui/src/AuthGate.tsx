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

const InviteForm = ({ onClaimed }: { onClaimed: () => void }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('claim_invite', { invite_code: code });
      
      if (error) {
        throw error;
      }
      
      onClaimed();
    } catch (err: any) {
      setError(err.message || 'Failed to claim invite code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111111', color: 'white', fontFamily: 'sans-serif' }}>
      <img src="/logo.png" alt="SunShade Systems" style={{ width: 260, height: 'auto', marginBottom: 24 }} />
      <div style={{ marginBottom: 32, textAlign: 'center', maxWidth: 320 }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 20 }}>Invite Required</h2>
        <p style={{ margin: 0, color: '#a1a1aa', fontSize: 14 }}>Enter your invitation code to access the SunShade Hub.</p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 300 }}>
        <input
          type="text"
          placeholder="Invite Code (e.g., SUN-...)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
          style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #333', background: '#1a1a1a', color: 'white', fontSize: 14, outline: 'none', textTransform: 'uppercase' }}
        />
        {error && <div style={{ color: '#ef4444', fontSize: 12 }}>{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          style={{ padding: '11px 0', borderRadius: 6, border: 'none', background: submitting ? '#7c3010' : '#ea580c', color: 'white', fontSize: 15, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}
        >
          {submitting ? 'Verifying...' : 'Redeem Code'}
        </button>
      </form>
    </div>
  );
};

export const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      setProfile(data);
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    } finally {
      setLoading(false);
    }
  };

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
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        clearTimeout(timeout);
        console.error('[AuthGate] getSession failed:', err);
        setAuthError(err instanceof Error ? err.message : 'Failed to initialize session');
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setLoading(true);
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
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

  // Allow 'pending_invite' users to view the dashboard (guest mode)
  return (
    <>
      {children}
    </>
  );
};
