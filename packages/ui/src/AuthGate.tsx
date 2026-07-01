'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@sunshade/supabase';

export const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTestLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: 'test@sunshade.local',
      password: 'password123',
    });
    
    if (error && error.message.includes('Invalid login credentials')) {
      // If login fails, try signing up
      await supabase.auth.signUp({
        email: 'test@sunshade.local',
        password: 'password123',
      });
    } else {
        setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111111', color: 'white', fontFamily: 'sans-serif' }}>
      <img src="/logo.png" alt="SunShade Systems" style={{ width: 300, height: 'auto', marginBottom: 20 }} />
      <div style={{ color: '#a1a1aa' }}>Initializing Secure Session...</div>
    </div>
  );

  if (!session) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111111', color: 'white', fontFamily: 'sans-serif' }}>
        <img src="/logo.png" alt="SunShade Systems" style={{ width: 300, height: 'auto', marginBottom: 30 }} />
        <button 
          onClick={handleTestLogin}
          style={{ padding: '14px 28px', cursor: 'pointer', background: '#ea580c', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, transition: 'background 0.2s' }}
        >
          Login as Test User
        </button>
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
};
