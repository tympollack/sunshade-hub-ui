import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './utils/supabase/middleware';
import { verifyGuestToken, GUEST_COOKIE_NAME } from './lib/auth/guestTokens';

export async function middleware(request: NextRequest) {
  const guestCookie = request.cookies.get(GUEST_COOKIE_NAME);
  const guestSession = guestCookie ? verifyGuestToken(guestCookie.value) : null;

  // If user visits /login with an active valid guest session and no specific override, redirect to dashboard
  if (guestSession && request.nextUrl.pathname === '/login') {
    const returnTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard';
    return NextResponse.redirect(new URL(returnTo, request.url), 302);
  }

  // Sub-app routes bypass login prompts when guest session is active
  if (guestSession && request.nextUrl.pathname.startsWith('/games')) {
    const response = NextResponse.next({
      request: {
        headers: new Headers(request.headers),
      },
    });
    response.headers.set('x-guest-id', guestSession.sub);
    response.headers.set('x-guest-role', guestSession.role);
    response.headers.set('x-guest-balance', guestSession.starterBalance.toString());
    response.headers.set('x-mesh-node', guestSession.meshNodeId);
    return response;
  }

  const response = await updateSession(request);

  if (guestSession) {
    response.headers.set('x-guest-session', guestSession.sub);
    response.headers.set('x-guest-active', 'true');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
