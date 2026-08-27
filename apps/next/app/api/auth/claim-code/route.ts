import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';
import { getHubBaseUrl, isTrustedRedirectHost } from '../../../../lib/env';

function getSafeRedirectUrl(req: NextRequest, customRedirectUrl?: unknown): string {
  if (typeof customRedirectUrl === 'string') {
    const cleanUrl = customRedirectUrl.trim();
    if (cleanUrl.startsWith('/')) {
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
      const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
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
      // Ignore URL parse error and fall back to default
    }
  }

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');

  // Default fallback if host is real domain
  if (host && !host.includes('localhost')) {
    return `${proto}://${host}/dashboard`;
  }

  // Fallback using environment detection (hub-stag.sunshade.icu for staging, hub.sunshade.icu for prod)
  const baseUrl = getHubBaseUrl(host);
  return `${baseUrl}/dashboard`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode = body?.code;
    const rawEmail = body?.email;
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const rawRedirect =
      typeof body?.redirect_to === 'string'
        ? body.redirect_to
        : typeof body?.redirectTo === 'string'
        ? body.redirectTo
        : typeof body?.redirect === 'string'
        ? body.redirect
        : req.nextUrl.searchParams.get('redirect_to') || req.nextUrl.searchParams.get('redirect');

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

      // Check if Auth user exists by ID first, then by profile lookup
      let existingAuthUser = null;
      if (authUserId) {
        try {
          const { data: userById } = await serviceClient.auth.admin.getUserById(authUserId);
          if (userById?.user) {
            existingAuthUser = userById.user;
          }
        } catch {
          // User might not exist in Auth yet
        }
      }

      if (!existingAuthUser) {
        const { data: existingProfile } = await serviceClient
          .from('profiles')
          .select('id, email')
          .eq('email', targetEmail)
          .maybeSingle();

        if (existingProfile?.id) {
          try {
            const { data: userById } = await serviceClient.auth.admin.getUserById(existingProfile.id);
            if (userById?.user) {
              existingAuthUser = userById.user;
              authUserId = existingProfile.id;
            }
          } catch {
            // Profile exists without matching Auth user
          }
        }
      }

      if (existingAuthUser && authUserId) {
        const { error: updateAuthErr } = await serviceClient.auth.admin.updateUserById(authUserId, {
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName || existingAuthUser.user_metadata?.full_name || '',
            username: username || existingAuthUser.user_metadata?.username || '',
          },
        });
        if (updateAuthErr) {
          console.error('[claim-code] Failed to update Auth user password:', updateAuthErr);
          return NextResponse.json(
            { error: `Failed to update password: ${updateAuthErr.message}` },
            { status: 400 }
          );
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
          // If user already exists in auth.users, fetch by email from database and update password
          if (createAuthErr?.message?.toLowerCase().includes('already') || (createAuthErr as any)?.status === 422) {
            const { data: profileRow } = await serviceClient
              .from('profiles')
              .select('id')
              .eq('email', targetEmail)
              .maybeSingle();

            if (profileRow?.id) {
              authUserId = profileRow.id;
              const { error: fallbackUpdateErr } = await serviceClient.auth.admin.updateUserById(authUserId, {
                password,
                email_confirm: true,
              });
              if (fallbackUpdateErr) {
                return NextResponse.json(
                  { error: `Account setup failed: ${fallbackUpdateErr.message}` },
                  { status: 400 }
                );
              }
            } else {
              return NextResponse.json(
                { error: `An account with ${targetEmail} is already registered. Please sign in or use password reset.` },
                { status: 400 }
              );
            }
          } else {
            return NextResponse.json(
              { error: `Account creation failed: ${createAuthErr?.message || 'Failed to create user credential.'}` },
              { status: 400 }
            );
          }
        } else {
          authUserId = newAuthData.user.id;
        }
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
    const redirectUrl = getSafeRedirectUrl(req, rawRedirect);
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

    // Ensure action_link redirect_to param matches redirectUrl
    let finalActionLink = linkData.properties.action_link;
    try {
      const linkUrlObj = new URL(finalActionLink);
      linkUrlObj.searchParams.set('redirect_to', redirectUrl);
      finalActionLink = linkUrlObj.toString();
    } catch (e) {
      console.warn('[claim-code] Failed to rewrite action_link redirect_to URL:', e);
    }

    // 6. Invalidate code AFTER successful setup
    await serviceClient
      .from('user_auth_codes')
      .update({ used_at: new Date().toISOString(), is_active: false })
      .eq('code', cleanCode);

    return NextResponse.json({
      success: true,
      email: targetEmail,
      redirect_url: redirectUrl,
      action_link: finalActionLink,
      message: 'Auth code successfully claimed! Your SunShade account is active.',
    });
  } catch (err: any) {
    console.error('[claim-code] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
