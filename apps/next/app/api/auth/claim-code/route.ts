import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';

function getSafeRedirectUrl(req: NextRequest): string {
  const defaultBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://sunshade.icu';
  const origin = req.headers.get('origin');

  if (!origin) {
    return `${defaultBase}/dashboard`;
  }

  try {
    const originUrl = new URL(origin);
    const host = originUrl.hostname;

    // Allow sunshade.icu subdomains and local development
    if (host === 'sunshade.icu' || host.endsWith('.sunshade.icu') || host === 'localhost' || host === '127.0.0.1') {
      return `${originUrl.origin}/dashboard`;
    }
  } catch {
    // Fall back if URL parsing fails
  }

  return `${defaultBase}/dashboard`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode = body?.code;

    if (!rawCode || typeof rawCode !== 'string') {
      return NextResponse.json({ error: 'An 8-character auth code is required.' }, { status: 400 });
    }

    const cleanCode = rawCode.trim().toUpperCase();

    // 1. Strict 8-character hex format check
    if (!/^[A-F0-9]{8}$/.test(cleanCode)) {
      return NextResponse.json({ error: 'Invalid code format. Must be an 8-character alphanumeric code.' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // 2. Verify code via RPC
    const { data: claimData, error: claimError } = await serviceClient.rpc('claim_user_auth_code', {
      p_code: cleanCode,
    });

    if (claimError || !claimData || !claimData.user_id) {
      return NextResponse.json({ error: claimError?.message || 'Invalid or expired auth code' }, { status: 400 });
    }

    // 3. Mark code as used immediately to prevent replay attacks
    const { error: updateError } = await serviceClient
      .from('user_auth_codes')
      .update({ used_at: new Date().toISOString(), is_active: false })
      .eq('code', cleanCode);

    if (updateError) {
      console.error('[claim-code] Failed to invalidate code:', updateError);
    }

    // 4. Fetch email from auth.users
    const { data: userData, error: userError } = await serviceClient.auth.admin.getUserById(claimData.user_id);

    if (userError || !userData.user || !userData.user.email) {
      return NextResponse.json({ error: 'User associated with this code was not found.' }, { status: 404 });
    }

    // 5. Generate a magic login link with validated redirect origin
    const redirectUrl = getSafeRedirectUrl(req);
    const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json({ error: 'Failed to generate authentication link.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      email: userData.user.email,
      redirect_url: linkData.properties.action_link,
    });
  } catch (err: any) {
    console.error('[claim-code] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
