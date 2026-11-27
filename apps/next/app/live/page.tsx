import Link from 'next/link';
import type { Metadata } from 'next';
import { Tv, ArrowLeft, Film, Radio, AlertTriangle } from 'lucide-react';
import { createSSRClient } from '../../utils/supabase/server';
import { isFeatureEnabled, normalizeFeatureFlags } from '../../lib/services/featureFlagsService';

export const metadata: Metadata = {
  title: 'SunShade Live',
};

export default async function SunShadeLiveDirectoryPage() {
  const supabase = await createSSRClient();
  let publicReels: Array<{
    id: string;
    user_id: string;
    title: string;
    peak_drama_index: number;
    final_score: number;
  }> = [];
  let queryError: string | null = null;
  let studioSlug = 'studio';
  let isLiveEnabled = true;

  try {
    const [{ data: flagRows }, { data: authData }] = await Promise.all([
      supabase.from('hub_feature_flags').select('key, enabled'),
      supabase.auth.getUser(),
    ]);
    const flags = normalizeFeatureFlags(flagRows);
    isLiveEnabled = isFeatureEnabled(flags, 'sunshade_live', true);

    if (authData?.user?.id) {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', authData.user.id)
        .maybeSingle();
      studioSlug = profileRow?.display_name || authData.user.id;
    }

    if (isLiveEnabled && typeof supabase?.schema === 'function') {
      const { data, error } = await supabase
        .schema('reels')
        .from('showdown_reels')
        .select('id, user_id, title, peak_drama_index, final_score')
        .eq('is_public', true)
        .order('peak_drama_index', { ascending: false })
        .limit(12);
      if (error) {
        queryError = error.message;
      } else {
        publicReels = (data ?? []) as typeof publicReels;
      }
    }
  } catch (err: any) {
    queryError = err?.message || 'Unable to load SunShade Live channels.';
  }

  return (
    <div
      data-testid="sunshade-live-directory"
      className="min-h-screen bg-zinc-950 text-zinc-100 p-6 lg:p-10"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Hub Dashboard</span>
            </Link>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Tv className="w-6 h-6 text-orange-500" />
              <span>SunShade Live Channels</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Watch creator WebGL telemetry broadcasts with synchronized PiP webcam reactions and Gladiator Drops.
            </p>
          </div>
          {isLiveEnabled && (
            <Link
              href={`/live/${encodeURIComponent(studioSlug)}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white transition-colors"
            >
              <Radio className="w-4 h-4" />
              <span>Open Creator Live Studio</span>
            </Link>
          )}
        </div>

        {!isLiveEnabled ? (
          <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 text-center space-y-2">
            <Tv className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-sm font-bold text-white">SunShade Live Is Currently Paused</p>
            <p className="text-xs text-zinc-400">
              The sunshade_live feature flag is disabled in Hub Settings.
            </p>
          </div>
        ) : queryError ? (
          <div
            data-testid="live-directory-error"
            className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-center gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{`Live channel query unavailable: ${queryError}`}</span>
          </div>
        ) : publicReels.length === 0 ? (
          <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 text-center space-y-2">
            <Film className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-sm font-bold text-white">No Public Channels Broadcasting Yet</p>
            <p className="text-xs text-zinc-400">
              Launch your Creator Live Studio or publish a 60-second Showdown Reel from the Arcade Deck to appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicReels.map((reel) => (
              <Link
                key={reel.id}
                href={`/live/${encodeURIComponent(reel.user_id)}?reelId=${encodeURIComponent(reel.id)}`}
                className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 hover:border-orange-500/60 transition-colors space-y-2"
              >
                <p className="text-sm font-bold text-white truncate">{reel.title}</p>
                <p className="text-xs font-mono text-zinc-400">
                  {`Peak Drama ${Number(reel.peak_drama_index ?? 0).toFixed(1)} • Score ${Number(reel.final_score ?? 0).toLocaleString()}`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
