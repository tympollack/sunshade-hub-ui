import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getUserFromToken } from '../../../../lib/supabase-server';

const TRUSTED_VERIFIED_TIERS = new Set([
  'ANCHOR',
  'COMMUNITY_VERIFIED',
  'BIOMETRIC',
  'GOVERNMENT_ID',
  'VERIFIED',
]);

function hasTrustedVerificationClaim(user: any): boolean {
  const appMeta = (user?.app_metadata as Record<string, any>) || {};
  const tier = String(appMeta.verification_tier || 'UNVERIFIED').toUpperCase();
  return Boolean(
    appMeta.is_human_verified === true ||
      appMeta.is_human === true ||
      appMeta.anti_sybil_verified === true ||
      TRUSTED_VERIFIED_TIERS.has(tier)
  );
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: missing bearer token' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: invalid or expired session token' },
        { status: 401 }
      );
    }

    let body: { displayName?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Optional JSON body
    }

    const cleanDisplayName =
      typeof body.displayName === 'string' && body.displayName.trim()
        ? body.displayName.trim()
        : null;

    const serviceClient = createServiceClient();

    // Respect Hub verification governance mode (defaulting to self_service if unset)
    let verificationMode = 'self_service';
    try {
      const { data: settingRow } = await serviceClient
        .schema('valerie')
        .from('system_settings')
        .select('value')
        .eq('key', 'hub.verification_mode')
        .maybeSingle();

      if (settingRow?.value !== undefined && settingRow?.value !== null) {
        verificationMode = String(settingRow.value).replace(/^"|"$/g, '').trim() || 'self_service';
      }
    } catch {
      // Default to self_service if settings table is unreachable
    }

    if (cleanDisplayName) {
      try {
        await serviceClient
          .from('profiles')
          .update({ display_name: cleanDisplayName })
          .eq('id', user.id);
      } catch {
        // Non-blocking profile alias sync
      }
    }

    if (verificationMode === 'manual_queue' && !hasTrustedVerificationClaim(user)) {
      return NextResponse.json(
        {
          error:
            'Account verification is currently managed via Manual Admin Queue. Your account is waiting for administrator approval.',
          mode: 'manual_queue',
          requiresManualReview: true,
        },
        { status: 403 }
      );
    }

    if (verificationMode === 'auto_on_invite' && !hasTrustedVerificationClaim(user)) {
      let hasInviteClaim = false;
      try {
        const { data: redeemedCodes } = await serviceClient
          .from('user_auth_codes')
          .select('id')
          .eq('user_id', user.id)
          .not('used_at', 'is', null)
          .limit(1);
        hasInviteClaim = Array.isArray(redeemedCodes) && redeemedCodes.length > 0;

        if (!hasInviteClaim && user.email) {
          const { data: approvedReq } = await serviceClient
            .from('user_auth_code_requests')
            .select('id')
            .ilike('email', user.email)
            .eq('status', 'approved')
            .limit(1);
          hasInviteClaim = Array.isArray(approvedReq) && approvedReq.length > 0;
        }
      } catch {
        hasInviteClaim = false;
      }

      if (!hasInviteClaim) {
        return NextResponse.json(
          {
            error:
              'Account verification currently requires a redeemed invite code or administrator confirmation.',
            mode: 'auto_on_invite',
            requiresManualReview: true,
          },
          { status: 403 }
        );
      }
    }

    const { data, error } = await serviceClient
      .schema('admin')
      .rpc('set_user_verification', {
        p_target_user_id: user.id,
        p_is_verified: true,
        p_method: 'self_service',
        p_actor_id: null,
        p_reason: 'Self-service humanity confirmation',
      });

    let verificationResult = data;

    if (error) {
      const errMsg = error.message || '';
      const isMissingRpc =
        (error as any).code === 'PGRST202' ||
        /could not find the function|does not exist/i.test(errMsg);

      if (!isMissingRpc || !serviceClient.auth?.admin?.updateUserById) {
        console.error('[ACCOUNT VERIFICATION ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const now = new Date().toISOString();
      const existingAppMeta = (user.app_metadata as Record<string, any>) || {};
      const existingTier = String(existingAppMeta.verification_tier || 'UNVERIFIED').toUpperCase();
      const nextTier = TRUSTED_VERIFIED_TIERS.has(existingTier) ? existingTier : 'VERIFIED';

      const { error: authUpdateErr } = await serviceClient.auth.admin.updateUserById(user.id, {
        app_metadata: {
          ...existingAppMeta,
          is_human_verified: true,
          is_human: true,
          anti_sybil_verified: true,
          verification_tier: nextTier,
          verified_at: now,
        },
      });

      if (authUpdateErr) {
        return NextResponse.json({ error: authUpdateErr.message }, { status: 500 });
      }

      try {
        const { error: profErr } = await serviceClient
          .from('profiles')
          .update({
            ...(cleanDisplayName ? { display_name: cleanDisplayName } : {}),
            is_verified: true,
            verified_at: now,
            verification_method: 'self_service',
            citizen_tier: 'Verified Citizen',
          })
          .eq('id', user.id);

        if (profErr) {
          await serviceClient
            .from('profiles')
            .update({
              ...(cleanDisplayName ? { display_name: cleanDisplayName } : {}),
              citizen_tier: 'Verified Citizen',
            })
            .eq('id', user.id);
        }
      } catch {
        // Non-blocking profile sync fallback
      }

      verificationResult = {
        user_id: user.id,
        is_verified: true,
        verified_at: now,
        method: 'self_service',
        verification_tier: nextTier,
      };
    }

    return NextResponse.json({
      success: true,
      mode: verificationMode,
      verification: verificationResult,
    });
  } catch (err: any) {
    console.error('[ACCOUNT VERIFICATION EXCEPTION]', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
