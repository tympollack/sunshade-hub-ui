import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'An 8-character auth code is required.' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // 1. Verify code via RPC
    const { data: claimData, error: claimError } = await serviceClient.rpc('claim_user_auth_code', {
      p_code: code.trim(),
    });

    if (claimError || !claimData?.user_id) {
      return NextResponse.json({ error: claimError?.message || 'Invalid or expired auth code' }, { status: 400 });
    }

    // 2. Fetch email from auth.users
    const { data: userData, error: userError } = await serviceClient.auth.admin.getUserById(claimData.user_id);

    if (userError || !userData.user || !userData.user.email) {
      return NextResponse.json({ error: 'User associated with this code was not found.' }, { status: 404 });
    }

    // 3. Generate a magic login link for instant Hub sign-in
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://sunshade.icu';
    const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
      options: {
        redirectTo: `${origin}/dashboard`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json({ error: 'Failed to generate authentication link.' }, { status: 500 });
    }

    // 4. Mark code as used
    await serviceClient
      .from('user_auth_codes')
      .update({ used_at: new Date().toISOString(), is_active: false })
      .eq('code', claimData.code);

    return NextResponse.json({
      success: true,
      email: userData.user.email,
      redirect_url: linkData.properties.action_link,
      hashed_token: linkData.properties.hashed_token,
    });
  } catch (err: any) {
    console.error('[claim-code] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
