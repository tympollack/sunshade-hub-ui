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
    const rawEmail = body?.email;
    const fullName = body?.fullName?.trim() || '';
    const username = body?.username?.trim() || '';
    const password = body?.password || '';

    if (!rawCode || typeof rawCode !== 'string') {
      return NextResponse.json({ error: 'An 8-character auth code is required.' }, { status: 400 });
    }

    const cleanCode = rawCode.trim().toUpperCase();

    // 1. Full 8-character alphanumeric check (A-Z, 0-9)
    if (!/^[A-Z0-9]{8}$/.test(cleanCode)) {
      return NextResponse.json({ error: 'Invalid code format. Must be an 8-character alphanumeric code.' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // 2. Verify code via PostgreSQL stored procedure claim_user_auth_code
    const { data: claimData, error: claimError } = await serviceClient.rpc('claim_user_auth_code', {
      p_code: cleanCode,
    });

    if (claimError || !claimData || (!claimData.user_id && !claimData.email && !claimData.success)) {
      return NextResponse.json({ error: claimError?.message || 'Invalid or expired auth code.' }, { status: 400 });
    }

    // 3. Determine user email
    let targetEmail = (rawEmail && typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '') || claimData.email;

    if (!targetEmail && claimData.user_id) {
      const { data: userData } = await serviceClient.auth.admin.getUserById(claimData.user_id);
      targetEmail = userData?.user?.email;
    }

    if (!targetEmail) {
      return NextResponse.json({ error: 'User email associated with this code was not found.' }, { status: 404 });
    }

    // 4. Provision or update user in Supabase Auth & public.profiles table
    let authUserId = claimData.user_id;

    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
      }

      // Check if Auth user exists
      const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());

      if (existingUser) {
        authUserId = existingUser.id;
        const { error: updateAuthErr } = await serviceClient.auth.admin.updateUserById(authUserId, {
          password,
          user_metadata: {
            full_name: fullName || existingUser.user_metadata?.full_name || '',
            username: username || existingUser.user_metadata?.username || '',
          },
        });
        if (updateAuthErr) {
          console.error('[claim-code] Failed to update Auth user password:', updateAuthErr);
        }
      } else {
        const { data: newAuthData, error: createAuthErr } = await serviceClient.auth.admin.createUser({
          email: targetEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            username,
          },
        });

        if (createAuthErr || !newAuthData.user) {
          return NextResponse.json(
            { error: `Account creation failed: ${createAuthErr?.message || 'Failed to create user credential.'}` },
            { status: 400 }
          );
        }

        authUserId = newAuthData.user.id;
      }
    }

    // Upsert profile in public.profiles table
    if (authUserId) {
      const displayName = fullName || username || targetEmail.split('@')[0];
      await serviceClient.from('profiles').upsert({
        id: authUserId,
        email: targetEmail,
        display_name: displayName,
        status: 'active',
        updated_at: new Date().toISOString(),
      });
    }

    // 5. Generate magic login link with validated redirect origin
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

    // 6. Invalidate code AFTER successful setup
    await serviceClient
      .from('user_auth_codes')
      .update({ used_at: new Date().toISOString(), is_active: false })
      .eq('code', cleanCode);

    return NextResponse.json({
      success: true,
      email: targetEmail,
      redirect_url: linkData.properties.action_link,
      message: 'Auth code successfully claimed! Your SunShade account is active.',
    });
  } catch (err: any) {
    console.error('[claim-code] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
