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

    // 1. Full 8-character alphanumeric check (A-Z, 0-9)
    if (!/^[A-Z0-9]{8}$/.test(cleanCode)) {
      return NextResponse.json({ error: 'Invalid code format. Must be an 8-character alphanumeric code.' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // 2. Verify code via RPC
    const { data: claimData, error: claimError } = await serviceClient.rpc('claim_user_auth_code', {
      p_code: cleanCode,
    });

    if (claimError || !claimData || (!claimData.user_id && !claimData.email && !claimData.success)) {
      return NextResponse.json({ error: claimError?.message || 'Invalid or expired auth code' }, { status: 400 });
    }

    // 3. Determine user email
    let targetEmail = claimData.email;

    if (!targetEmail && claimData.user_id) {
      const { data: userData } = await serviceClient.auth.admin.getUserById(claimData.user_id);
      targetEmail = userData?.user?.email;
    }

    if (!targetEmail) {
      return NextResponse.json({ error: 'User email associated with this code was not found.' }, { status: 404 });
    }

    // 4. Generate a magic login link with validated redirect origin
    const redirectUrl = getSafeRedirectUrl(req);
    const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: targetEmail,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json({ error: 'Failed to generate authentication link.' }, { status: 500 });
    }

    // 5. Invalidate code AFTER successful link generation to avoid burning code on link failure
    const { error: updateError } = await serviceClient
      .from('user_auth_codes')
      .update({ used_at: new Date().toISOString(), is_active: false })
      .eq('code', cleanCode);

    if (updateError) {
      console.error('[claim-code] Failed to invalidate code:', updateError);
    }

    return NextResponse.json({
      success: true,
      email: targetEmail,
      redirect_url: linkData.properties.action_link,
    });
  } catch (err: any) {
    console.error('[claim-code] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
