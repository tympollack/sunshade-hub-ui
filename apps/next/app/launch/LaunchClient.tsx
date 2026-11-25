'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@digitalcanopy/supabase';
import {
  getValidatedRedirectUrl,
  isVotaryTarget,
  buildVotarySsoRedirectUrl,
} from '../../lib/env';

export default function LaunchClient() {
  const searchParams = useSearchParams();

  useEffect(() => {
    let active = true;

    async function launch() {
      const rawTarget =
        searchParams.get('target') ||
        searchParams.get('redirect') ||
        searchParams.get('to');
      const validatedTarget = getValidatedRedirectUrl(rawTarget, '/dashboard');

      if (!active) return;

      if (validatedTarget.startsWith('/')) {
        window.location.replace(validatedTarget);
        return;
      }

      if (isVotaryTarget(validatedTarget)) {
        try {
          const { data } = await supabase.auth.getSession();
          if (!active) return;
          const destination = buildVotarySsoRedirectUrl(
            validatedTarget,
            data?.session
          );
          window.location.replace(destination);
          return;
        } catch {
          // Fall back to direct target URL
        }
      }

      window.location.replace(validatedTarget);
    }

    void launch();

    return () => {
      active = false;
    };
  }, [searchParams]);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 text-white font-sans"
      style={{
        background:
          'radial-gradient(ellipse at top, #1c140e 0%, #111111 50%, #0a0a0a 100%)',
      }}
    >
      <img
        src="/logo.png"
        alt="SunShade Systems"
        className="w-64 h-auto mb-6 object-contain"
      />
      <div className="flex items-center gap-2 text-xs font-mono text-orange-400 animate-pulse">
        <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
        <span>Establishing secure SSO handoff...</span>
      </div>
    </div>
  );
}
