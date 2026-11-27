import type {
  DirectorTimelinePlan,
  TelemetryFrame,
} from '@digitalcanopy/dramacast';
import type { CastLedgerEntry, MiracleSeedSnapshot } from '@digitalcanopy/reels-engine';
import { isStagingEnvironment } from '../env';

export interface LiveCreatorProfile {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  citizenTier: string;
  reputationScore: number;
}

export interface CreatorShowdownVod {
  id: string;
  matchId: string;
  cartridgeId: string;
  title: string;
  durationMs: number;
  peakDramaIndex: number;
  finalScore: number;
  didWin: boolean;
  timelinePlan: DirectorTimelinePlan;
  telemetryFrames: TelemetryFrame[];
  miracleSnapshot: MiracleSeedSnapshot | null;
  createdAt: string;
}

export interface LiveCreatorContext {
  creatorSlug: string;
  canonicalUrl: string;
  profile: LiveCreatorProfile | null;
  viewerUserId: string | null;
  viewerUtilityBalance: number;
  vodReels: CreatorShowdownVod[];
  castBadges: CastLedgerEntry[];
  featureFlags: Record<string, boolean>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeCreatorSlug(raw: string): string {
  const decoded = decodeURIComponent(raw || '').trim();
  const cleaned = decoded.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  return cleaned.replace(/^-|-$/g, '') || 'creator';
}

export function resolveLiveCreatorUrl(creatorSlug: string, host?: string): string {
  const safeSlug = sanitizeCreatorSlug(creatorSlug);
  if (isStagingEnvironment(host)) {
    return `https://hub-stag.sunshade.icu/live/${encodeURIComponent(safeSlug)}`;
  }
  return `https://hub.sunshade.network/live/${encodeURIComponent(safeSlug)}`;
}

export async function loadCreatorLiveContext(
  supabase: any,
  rawCreatorSlug: string,
  host?: string
): Promise<LiveCreatorContext> {
  const creatorSlug = sanitizeCreatorSlug(rawCreatorSlug);
  const canonicalUrl = resolveLiveCreatorUrl(creatorSlug, host);

  if (!supabase || typeof supabase.from !== 'function') {
    return {
      creatorSlug,
      canonicalUrl,
      profile: null,
      viewerUserId: null,
      viewerUtilityBalance: 0,
      vodReels: [],
      castBadges: [],
      featureFlags: {},
    };
  }

  let viewerUserId: string | null = null;
  let viewerUtilityBalance = 0;

  try {
    const authRes = await supabase.auth?.getUser?.();
    viewerUserId = authRes?.data?.user?.id ?? null;
  } catch {
    viewerUserId = null;
  }

  if (viewerUserId) {
    try {
      const { data: walletRow } = await supabase
        .from('user_token_wallets')
        .select('utility_balance')
        .eq('user_id', viewerUserId)
        .maybeSingle();
      viewerUtilityBalance = Number(walletRow?.utility_balance ?? 0);
    } catch {
      viewerUtilityBalance = 0;
    }
  }

  let profileRow: any = null;
  try {
    const query = supabase
      .from('profiles')
      .select('id, display_name, reputation_score, citizen_tier');

    const { data } = UUID_REGEX.test(creatorSlug)
      ? await query.eq('id', creatorSlug).maybeSingle()
      : await query.ilike('display_name', creatorSlug).limit(1).maybeSingle();
    profileRow = data ?? null;
  } catch {
    profileRow = null;
  }

  const profile: LiveCreatorProfile | null = profileRow
    ? {
        id: String(profileRow.id),
        slug: creatorSlug,
        displayName: String(profileRow.display_name || creatorSlug),
        avatarUrl: null,
        citizenTier: String(profileRow.citizen_tier || 'Active Citizen'),
        reputationScore: Number(profileRow.reputation_score ?? 100),
      }
    : null;

  let vodReels: CreatorShowdownVod[] = [];
  let castBadges: CastLedgerEntry[] = [];

  if (profile && typeof supabase.schema === 'function') {
    try {
      const reelsSchema = supabase.schema('reels');
      const [reelsRes, badgesRes] = await Promise.all([
        reelsSchema
          .from('showdown_reels')
          .select(
            'id, match_id, cartridge_id, title, duration_ms, peak_drama_index, final_score, did_win, timeline_plan, telemetry_frames, miracle_snapshot, created_at'
          )
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10),
        reelsSchema
          .from('cast_ledger_entries')
          .select(
            'entry_id, match_id, cartridge_id, user_id, badge, roll_index, miracle_seed_hash, summary, awarded_at'
          )
          .eq('user_id', profile.id)
          .order('awarded_at', { ascending: false })
          .limit(12),
      ]);

      vodReels = (reelsRes?.data ?? []).map((row: any) => ({
        id: String(row.id),
        matchId: String(row.match_id),
        cartridgeId: String(row.cartridge_id),
        title: String(row.title || '60s Showdown Reel'),
        durationMs: Number(row.duration_ms ?? 60_000),
        peakDramaIndex: Number(row.peak_drama_index ?? 0),
        finalScore: Number(row.final_score ?? 0),
        didWin: Boolean(row.did_win),
        timelinePlan: row.timeline_plan as DirectorTimelinePlan,
        telemetryFrames: Array.isArray(row.telemetry_frames) ? row.telemetry_frames : [],
        miracleSnapshot: (row.miracle_snapshot as MiracleSeedSnapshot | null) ?? null,
        createdAt: String(row.created_at || ''),
      }));

      castBadges = (badgesRes?.data ?? []).map((row: any) => ({
        entryId: String(row.entry_id),
        matchId: String(row.match_id),
        cartridgeId: String(row.cartridge_id),
        playerId: String(row.user_id),
        badge: row.badge,
        awardedAt: String(row.awarded_at),
        rollIndex: Number(row.roll_index ?? 0),
        miracleSeedHash: row.miracle_seed_hash ?? undefined,
        summary: String(row.summary ?? ''),
      }));
    } catch {
      vodReels = [];
      castBadges = [];
    }
  }

  return {
    creatorSlug,
    canonicalUrl,
    profile,
    viewerUserId,
    viewerUtilityBalance,
    vodReels,
    castBadges,
    featureFlags: {},
  };
}
