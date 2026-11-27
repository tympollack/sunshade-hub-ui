import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { createSSRClient } from '../../../utils/supabase/server';
import { loadCreatorLiveContext } from '../../../lib/live/liveCreatorService';
import { SunShadeLiveStage } from '../../../components/live/SunShadeLiveStage';

interface LiveCreatorPageProps {
  params: Promise<{ creator: string }>;
  searchParams?: Promise<{ simulcast?: string }>;
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

  return (
    <SunShadeLiveStage
      context={context}
      initialSimulcastOverlay={resolvedSearch.simulcast === '1'}
    />
  );
}
