'use client';

import React, { useState } from 'react';
import { Rocket } from 'lucide-react';
import { supabase } from '@digitalcanopy/supabase';
import { buildTokenRedirectUrl, isValidRedirectUrl } from '../../../lib/env';

/**
 * One-click launch for Dart Up!. Hands the current Hub session to the game
 * subdomain via URL hash fragment (never sent to servers / referrers) so the
 * pilot lands already authenticated across *.sunshade.icu / *.madeintheshade.wtf.
 */
export function DartUpLaunchButton({ gameUrl }: { gameUrl: string }) {
  const [launching, setLaunching] = useState(false);

  async function handleLaunch() {
    if (launching) return;
    setLaunching(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('[DartUpLaunch] getSession failed:', error.message);
      const target = isValidRedirectUrl(gameUrl)
        ? buildTokenRedirectUrl(gameUrl, data?.session)
        : gameUrl;
      window.location.assign(target);
    } finally {
      setLaunching(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLaunch}
      disabled={launching}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white transition-colors duration-200"
    >
      <Rocket size={14} />
      {launching ? 'Launching…' : 'Launch Dart Up!'}
    </button>
  );
}
