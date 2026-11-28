import React from 'react';
import { Crosshair } from 'lucide-react';
import { headers } from 'next/headers';
import { createSSRClient } from '../../../utils/supabase/server';
import { isStagingEnvironment } from '../../../lib/env';
import { DartUpLaunchButton } from './DartUpLaunchButton';

interface EraRow {
  era_seed: string;
  pve_threat_multiplier: number;
}

interface PilotRow {
  callsign: string;
  elo_rating: number;
}

/**
 * Async Server Component. Query failures are THROWN (not swallowed) so the
 * surrounding <WidgetErrorBoundary> renders its localized Retry fallback
 * without affecting sibling Hub widgets.
 */
export async function DartUpWidget({
  userId,
  guestLaunchEnabled = true,
}: {
  userId: string | null;
  guestLaunchEnabled?: boolean;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const isOfflinePlaceholder = supabaseUrl.includes('placeholder.supabase.co');

  let era: EraRow | null = null;
  let pilot: PilotRow | null = null;
  let rank: number | null = null;

  if (!isOfflinePlaceholder) {
    const supabase = await createSSRClient();

    const [eraRes, pilotRes] = await Promise.all([
      supabase
        .schema('dart_up')
        .from('eras')
        .select('era_seed, pve_threat_multiplier')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      userId
        ? supabase
            .schema('dart_up')
            .from('pilots')
            .select('callsign, elo_rating')
            .eq('user_id', userId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (eraRes.error) throw new Error(`Dart Up! era lookup failed: ${eraRes.error.message}`);
    if (pilotRes.error) throw new Error(`Dart Up! pilot lookup failed: ${pilotRes.error.message}`);

    era = eraRes.data as EraRow | null;
    pilot = pilotRes.data as PilotRow | null;

    if (pilot) {
      const { count, error } = await supabase
        .schema('dart_up')
        .from('pilots')
        .select('user_id', { count: 'exact', head: true })
        .gt('elo_rating', pilot.elo_rating);
      if (error) throw new Error(`Dart Up! rank lookup failed: ${error.message}`);
      rank = (count ?? 0) + 1;
    }
  }

  const requestHost = (await headers()).get('host') ?? undefined;
  const gameUrl = isStagingEnvironment(requestHost)
    ? 'https://dartup-stag.sunshade.icu'
    : 'https://dartup.sunshade.icu';

  return (
    <div
      data-testid="dartup-widget"
      className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-6 shadow-sm dark:shadow-none transition-colors duration-200"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <Crosshair size={20} className="text-zinc-600 dark:text-zinc-300" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Dart Up!</h3>
        </div>
        <DartUpLaunchButton gameUrl={gameUrl} guestLaunchEnabled={guestLaunchEnabled} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Active Era" value={era ? era.era_seed : '—'} />
        <Stat label="PvE Threat" value={era ? `${Number(era.pve_threat_multiplier).toFixed(1)}×` : '—'} />
        <Stat
          label={pilot ? `Rank · ${pilot.callsign}` : 'Rank'}
          value={rank !== null && pilot ? `#${rank} (${pilot.elo_rating} ELO)` : 'Unranked'}
        />
      </div>
      {!pilot && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-4">
          {userId
            ? 'No pilot profile yet — launch Dart Up! to register your callsign.'
            : 'Guest mode — launch Dart Up! to play or authenticate to register your callsign.'}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800/40">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{value}</p>
    </div>
  );
}
