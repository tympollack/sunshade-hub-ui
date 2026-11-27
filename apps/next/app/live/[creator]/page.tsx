import Link from 'next/link';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { createSSRClient } from '../../../utils/supabase/server';
import { loadCreatorLiveContext } from '../../../lib/live/liveCreatorService';
import { isFeatureEnabled } from '../../../lib/services/featureFlagsService';
import { SunShadeLiveStage } from '../../../components/live/SunShadeLiveStage';

interface LiveCreatorPageProps {
  params: Promise<{ creator: string }>;
  searchParams?: Promise<{
    simulcast?: string;
    reelId?: string;
    t?: string;
    clipEnd?: string;
  }>;
}

export async function generateMetadata({
  params,
}: LiveCreatorPageProps): Promise<Metadata> {
  const { creator } = await params;
  return {
    title: `${decodeURIComponent(creator)} • SunShade Live`,
  };
}

export default async function CreatorLivePage({
  params,
  searchParams,
}: LiveCreatorPageProps) {
  const { creator } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const requestHost = (await headers()).get('host') ?? undefined;
  const supabase = await createSSRClient();

  const context = await loadCreatorLiveContext(supabase, creator, requestHost);
  const isLiveEnabled = isFeatureEnabled(context.featureFlags, 'sunshade_live', true);

  if (!isLiveEnabled) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center space-y-3">
          <h1 className="text-lg font-black text-white">SunShade Live Unavailable</h1>
          <p className="text-xs text-zinc-400">
            The sunshade_live feature flag is currently disabled for this Hub environment.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 rounded-xl bg-orange-600 text-xs font-bold text-white"
          >
            Return to Hub Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const parsedStartMs = resolvedSearch.t ? Math.max(0, Number(resolvedSearch.t)) : undefined;
  const parsedEndMs = resolvedSearch.clipEnd ? Math.max(0, Number(resolvedSearch.clipEnd)) : undefined;

  return (
    <SunShadeLiveStage
      context={context}
      initialSimulcastOverlay={resolvedSearch.simulcast === '1'}
      initialReelId={resolvedSearch.reelId}
      initialPlayheadMs={Number.isFinite(parsedStartMs) ? parsedStartMs : undefined}
      initialClipEndMs={Number.isFinite(parsedEndMs) ? parsedEndMs : undefined}
    />
  );
}
