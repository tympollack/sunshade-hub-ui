import { createServerClient } from '@supabase/ssr';
import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { getValidatedRedirectUrl, isVotaryTarget, buildTokenRedirectUrl } from '../../../lib/env';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const nextParam =
    requestUrl.searchParams.get('redirectTo') ||
    requestUrl.searchParams.get('redirect_to') ||
    requestUrl.searchParams.get('next');
  const errorDescription =
    requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error');

  if (errorDescription) {
    const errorUrl = new URL('/forgot-password', requestUrl.origin);
    errorUrl.searchParams.set('error', errorDescription);
    return NextResponse.redirect(errorUrl);
  }

  if (code || tokenHash) {
    const host = requestUrl.hostname.toLowerCase();
    const isSunShadeDomain = host === 'sunshade.icu' || host.endsWith('.sunshade.icu');
    const isHttps = requestUrl.protocol === 'https:';

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
                  secure: isHttps,
                  ...(isSunShadeDomain && { domain: '.sunshade.icu' }),
                },
              });
            });
          },
        },
      }
    );

    let authError = null;
    let authSession: { access_token?: string; refresh_token?: string } | null = null;

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      authError = error;
      authSession = data?.session || null;
    } else if (tokenHash) {
      const otpType = type || (nextParam?.includes('/reset-password') ? 'recovery' : 'email');
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });
      authError = error;
      authSession = data?.session || null;
    }

    if (!authError) {
      // Accurately determine if this is a password recovery flow
      const isExplicitRecoveryType = type === 'recovery';
      const isResetPasswordTarget = Boolean(
        nextParam && (nextParam.startsWith('/reset-password') || nextParam.includes('/reset-password'))
      );
      const isNonRecoveryOtp = Boolean(type && type !== 'recovery');

      const isRecoveryFlow =
        isExplicitRecoveryType || (!isNonRecoveryOtp && (isResetPasswordTarget || !nextParam));

      // Recovery flow strictly targets the internal password reset page to protect credentials
      const defaultTarget = isRecoveryFlow ? '/reset-password' : '/dashboard';
      const candidateTarget = nextParam || defaultTarget;
      const validatedTarget = getValidatedRedirectUrl(candidateTarget, defaultTarget);
      let finalTarget = validatedTarget;

      // Only allow cross-domain token handoff for standard authentication (never for password recovery)
      if (
        !isRecoveryFlow &&
        authSession?.access_token &&
        authSession?.refresh_token &&
        isVotaryTarget(validatedTarget)
      ) {
        finalTarget = buildTokenRedirectUrl(validatedTarget, authSession);
      } else if (isRecoveryFlow) {
        // Enforce internal /reset-password destination for password recovery to prevent credential theft
        if (!finalTarget.startsWith('/') || !finalTarget.startsWith('/reset-password')) {
          finalTarget = '/reset-password';
        }
      }

      const redirectUrl = finalTarget.startsWith('/')
        ? new URL(finalTarget, requestUrl.origin)
        : new URL(finalTarget);

      const response = NextResponse.redirect(redirectUrl);
      responseCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }

    console.error('[Auth Callback] Verification error:', authError.message);
    const errorUrl = new URL('/forgot-password', requestUrl.origin);
    errorUrl.searchParams.set('error', authError.message || 'Invalid or expired recovery link.');
    return NextResponse.redirect(errorUrl);
  }

  // Fallback if no code/tokenHash present - validate next URL to prevent open redirects
  const validatedFallback = getValidatedRedirectUrl(nextParam, '/dashboard');
  const fallbackUrl = validatedFallback.startsWith('/')
    ? new URL(validatedFallback, requestUrl.origin)
    : new URL(validatedFallback);

  return NextResponse.redirect(fallbackUrl);
}
