import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { getValidatedRedirectUrl } from '../../../lib/env';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/reset-password';
  const errorDescription =
    requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error');

  if (errorDescription) {
    const errorUrl = new URL('/forgot-password', requestUrl.origin);
    errorUrl.searchParams.set('error', errorDescription);
    return NextResponse.redirect(errorUrl);
  }

  if (code) {
    const host = requestUrl.hostname.toLowerCase();
    const isSunShadeDomain = host === 'sunshade.icu' || host.endsWith('.sunshade.icu');

    const responseCookies: { name: string; value: string; options?: any }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              responseCookies.push({
                name,
                value,
                options: {
                  ...options,
                  path: '/',
                  sameSite: 'lax' as const,
                  secure: true,
                  ...(isSunShadeDomain && { domain: '.sunshade.icu' }),
                },
              });
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const validatedTarget = getValidatedRedirectUrl(next, '/reset-password');
      const redirectUrl = validatedTarget.startsWith('/')
        ? new URL(validatedTarget, requestUrl.origin)
        : new URL(validatedTarget);

      const response = NextResponse.redirect(redirectUrl);
      responseCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }

    console.error('[Auth Callback] Code exchange error:', error.message);
    const errorUrl = new URL('/forgot-password', requestUrl.origin);
    errorUrl.searchParams.set('error', error.message || 'Invalid or expired recovery link.');
    return NextResponse.redirect(errorUrl);
  }

  // Fallback if no code present
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
