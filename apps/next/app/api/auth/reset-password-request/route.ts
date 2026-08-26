import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';
import { sendPasswordResetEmail } from '../../../../lib/email-service';
import { getHubBaseUrl, isTrustedRedirectHost } from '../../../../lib/env';

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function getSafeRedirectUrl(req: NextRequest, customRedirectUrl?: unknown): string {
  if (typeof customRedirectUrl === 'string') {
    const cleanUrl = customRedirectUrl.trim();
    if (cleanUrl.startsWith('/')) {
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
      const proto =
        req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      const baseUrl = host && !host.includes('localhost') ? `${proto}://${host}` : getHubBaseUrl(host);
      return `${baseUrl}${cleanUrl}`;
    }

    try {
      const parsed = new URL(cleanUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        if (isTrustedRedirectHost(parsed.hostname)) {
          return parsed.toString();
        }
      }
    } catch {
      // Ignore URL parse error and fall back
    }
  }

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto =
    req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');

  if (host && !host.includes('localhost')) {
    return `${proto}://${host}/dashboard`;
  }

  const baseUrl = getHubBaseUrl(host);
  return `${baseUrl}/dashboard`;
}

function getAppNameFromUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  try {
    if (url.startsWith('/')) return null;
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.endsWith('.sunshade.icu')) {
      const parts = host.split('.');
      const appSubdomain = parts[0].replace('-stag', '');
      if (appSubdomain === 'hub') return null;
      return appSubdomain.charAt(0).toUpperCase() + appSubdomain.slice(1);
    }

    if (host.endsWith('.vercel.app')) {
      const prefix = host.split('-')[0];
      if (prefix && prefix !== 'sunshade' && prefix !== 'hub') {
        return prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }
      return null;
    }
  } catch {
    // Ignore error
  }
  return null;
}

/**
 * Rewrites Supabase default action link to use links.sunshade.icu custom domain
 * and ensures the redirect_to query param matches the callback destination.
 */
function formatRecoveryActionLink(rawActionLink: string, callbackRedirectUrl: string): string {
  try {
    const url = new URL(rawActionLink);
    url.protocol = 'https:';
    url.host = 'links.sunshade.icu';
    url.searchParams.set('redirect_to', callbackRedirectUrl);
    return url.toString();
  } catch {
    return rawActionLink;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = body?.email;
    const rawRedirect =
      typeof body?.redirect_to === 'string'
        ? body.redirect_to
        : typeof body?.redirectTo === 'string'
        ? body.redirectTo
        : req.nextUrl.searchParams.get('redirect_to');

    if (!rawEmail || typeof rawEmail !== 'string' || !EMAIL_REGEX.test(rawEmail.trim())) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const cleanEmail = rawEmail.trim().toLowerCase();

    // Determine target host and callback redirect
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const proto =
      req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = host ? `${proto}://${host}` : getHubBaseUrl(host);

    // Only determine target app name if a real external redirect target was supplied
    const targetAppName = rawRedirect ? getAppNameFromUrl(rawRedirect) : null;

    const resetPageDestination = `/reset-password${
      rawRedirect ? `?redirect_to=${encodeURIComponent(rawRedirect)}` : ''
    }`;
    const callbackRedirectUrl = `${origin}/auth/callback?next=${encodeURIComponent(
      resetPageDestination
    )}`;

    const serviceClient = createServiceClient();

    // Generate secure recovery link using Supabase Admin Auth
    const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: {
        redirectTo: callbackRedirectUrl,
      },
    });

    if (linkError) {
      console.warn('[reset-password-request] generateLink notice:', linkError.message);
      // Return success to avoid email enumeration if user is not registered
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a recovery link has been sent.',
      });
    }

    const rawActionLink = linkData?.properties?.action_link;

    if (rawActionLink) {
      // Rewrite to links.sunshade.icu custom domain
      const finalActionLink = formatRecoveryActionLink(rawActionLink, callbackRedirectUrl);

      // Dispatch branded email via Resend SDK
      const emailResult = await sendPasswordResetEmail({
        to: cleanEmail,
        resetUrl: finalActionLink,
        targetAppName,
      });

      if (!emailResult.success) {
        console.error('[reset-password-request] Resend dispatch failed:', emailResult.error);
        return NextResponse.json(
          {
            success: false,
            error: emailResult.error || 'Failed to dispatch email via Resend.',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a recovery link has been sent.',
    });
  } catch (err: any) {
    console.error('[reset-password-request] Internal error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process password reset request.' },
      { status: 500 }
    );
  }
}
