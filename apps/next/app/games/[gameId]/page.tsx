import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyGuestToken, GUEST_COOKIE_NAME, getGuestLedger } from '../../../lib/auth/guestTokens';
import { createSSRClient } from '../../../utils/supabase/server';

interface GameRouteParams {
  params: Promise<{ gameId: string }>;
}

export default async function SubAppGamePage({ params }: GameRouteParams) {
  const { gameId } = await params;
  const cookieStore = await cookies();
  const guestCookie = cookieStore.get(GUEST_COOKIE_NAME);
  const guestSession = guestCookie ? await verifyGuestToken(guestCookie.value) : null;

  const supabase = await createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If unauthenticated (no user and no guest session), seamlessly route through zero-WAN guest onboarding
  if (!user && !guestSession) {
    redirect(`/claim/guest?redirectTo=/games/${gameId}`);
  }

  const ledger = guestSession ? getGuestLedger(guestSession.sub) : null;

  return (
    <div
      data-testid="sub-app-game-container"
      className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6"
    >
      <div className="max-w-md w-full p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
          <span>{gameId.toUpperCase()}</span>
          <span>•</span>
          <span>{guestSession ? 'GUEST PASS ACTIVE' : 'AUTHENTICATED'}</span>
        </div>

        <h1 className="text-2xl font-black capitalize tracking-tight">
          {gameId === 'pukhuk' ? 'Puk Huk Mesh Arena' : `${gameId} Launchpad`}
        </h1>

        <p className="text-sm text-zinc-400">
          Zero-WAN direct mesh access initialized.
        </p>

        {guestSession && (
          <div
            data-testid="guest-session-info"
            className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-left text-xs font-mono space-y-1.5"
          >
            <div className="flex justify-between">
              <span className="text-zinc-500">Session ID:</span>
              <span className="text-zinc-300 font-bold truncate max-w-[180px]">{guestSession.sub}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Starter Balance:</span>
              <span className="text-emerald-400 font-bold" data-testid="guest-starter-balance">
                ${guestSession.starterBalance.toFixed(2)} USD ({guestSession.starterTokens} HT)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Mesh Flypack:</span>
              <span className="text-zinc-300">{guestSession.meshNodeId}</span>
            </div>
          </div>
        )}

        <div className="pt-2">
          <a
            href="/dashboard"
            className="inline-block w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors"
          >
            Return to Hub Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
