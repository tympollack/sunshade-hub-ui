import { NextResponse, type NextRequest } from 'next/server';
import {
  createGuestToken,
  getGuestCookieOptions,
  GUEST_COOKIE_NAME,
} from '../../../lib/auth/guestTokens';
import { getValidatedRedirectUrl } from '../../../lib/env';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Extract redirect target; defaults to /dashboard or /
  const rawTarget =
    searchParams.get('redirectTo') ||
    searchParams.get('redirect_to') ||
    searchParams.get('next') ||
    searchParams.get('returnTo') ||
    '/dashboard';

  const validatedTarget = getValidatedRedirectUrl(rawTarget, '/dashboard');
  const meshNodeId = searchParams.get('mesh_node') || request.headers.get('x-mesh-node') || undefined;

  // 1. Generate Instant Cryptographic Guest Token & Session
  const { token, session } = await createGuestToken({
    meshNodeId,
    starterBalance: 0.10, // $0.10 starter balance for instant Puk Huk & Cozy participation
    starterTokens: 10,
  });

  // 2. Build redirect response
  // If redirect target is relative, build full URL with request origin
  const redirectUrl = validatedTarget.startsWith('/')
    ? new URL(validatedTarget, request.url)
    : new URL(validatedTarget);

  const response = NextResponse.redirect(redirectUrl, {
    status: 302,
  });

  // 3. Set HTTP-Only, Secure, SameSite=Lax Cookie scoped to .sunshade.icu (or current domain)
  const cookieOptions = getGuestCookieOptions(request.headers.get('host') || undefined);
  response.cookies.set(GUEST_COOKIE_NAME, token, cookieOptions);

  // Set response headers for performance and telemetry
  response.headers.set('X-Guest-Session-Id', session.sub);
  response.headers.set('X-Mesh-Node', session.meshNodeId);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  return response;
}
