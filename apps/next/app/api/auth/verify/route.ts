import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getUserFromToken } from '../../../../lib/supabase-server';

const TRUSTED_VERIFIED_TIERS = new Set([
  'ANCHOR',
  'COMMUNITY_VERIFIED',
  'BIOMETRIC',
  'GOVERNMENT_ID',
  'VERIFIED',
]);

const CHALLENGE_TTL_MS = 15 * 60 * 1000;
const POW_PREFIX = '00';

function getChallengeSecret(): string {
  return (
    process.env.VERIFICATION_CHALLENGE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.ADMIN_JWT_SECRET ||
    'sunshade-verify-challenge-dev-secret'
  );
}

function signChallenge(challenge: string): string {
  return crypto
    .createHmac('sha256', getChallengeSecret())
    .update(challenge)
    .digest('hex');
}

function verifyProofChallenge(
  userId: string,
  challenge: unknown,
  signature: unknown,
  proofNonce: unknown
): { valid: boolean; error?: string } {
  if (
    typeof challenge !== 'string' ||
    typeof signature !== 'string' ||
    typeof proofNonce !== 'string' ||
    !challenge.trim() ||
    !signature.trim() ||
    !proofNonce.trim()
  ) {
    return { valid: false, error: 'Humanity verification challenge proof is required.' };
  }

  const parts = challenge.split(':');
  if (parts.length !== 3 || parts[0] !== userId) {
    return { valid: false, error: 'Verification challenge does not match authenticated user.' };
  }

  const issuedAtMs = Number(parts[1]);
  if (!Number.isFinite(issuedAtMs) || Date.now() - issuedAtMs > CHALLENGE_TTL_MS || issuedAtMs > Date.now() + 60_000) {
    return { valid: false, error: 'Verification challenge expired. Please restart verification.' };
  }

  const expectedSig = signChallenge(challenge);
  const sigBuf = Uint8Array.from(Buffer.from(signature, 'utf8'));
  const expectedBuf = Uint8Array.from(Buffer.from(expectedSig, 'utf8'));
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, error: 'Invalid verification challenge signature.' };
  }

  const digest = crypto
    .createHash('sha256')
    .update(`${challenge}:${proofNonce}`)
    .digest('hex');
  if (!digest.startsWith(POW_PREFIX)) {
    return { valid: false, error: 'Invalid cryptographic humanity proof nonce.' };
  }

  return { valid: true };
}

function hasTrustedVerificationClaim(user: any): boolean {
  const appMeta = (user?.app_metadata as Record<string, any>) || {};
  if (['slashed', 'quarantined'].includes(String(appMeta.trust_state || 'active').toLowerCase())) {
    return false;
  }
  const tier = String(appMeta.verification_tier || 'UNVERIFIED').toUpperCase();
  return Boolean(
    appMeta.is_human_verified === true ||
      appMeta.is_human === true ||
      appMeta.anti_sybil_verified === true ||
      TRUSTED_VERIFIED_TIERS.has(tier)
  );
}

function extractBearerToken(req: NextRequest): string {
  const authHeader = req.headers.get('authorization') || '';
  return authHeader.replace(/^Bearer\s+/i, '').trim();
}

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
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

    const nonce = crypto.randomBytes(12).toString('hex');
    const challenge = `${user.id}:${Date.now()}:${nonce}`;
    const signature = signChallenge(challenge);

    return NextResponse.json({
      success: true,
      challenge,
      signature,
      powPrefix: POW_PREFIX,
      expiresInMs: CHALLENGE_TTL_MS,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to issue verification challenge' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
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

    let body: {
      displayName?: string;
      challenge?: string;
      signature?: string;
      proofNonce?: string;
    } = {};
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

    // Fail closed if governance policy cannot be queried safely
    let verificationMode = 'self_service';
    try {
      const { data: settingRow, error: settingErr } = await serviceClient
        .schema('valerie')
        .from('system_settings')
        .select('value')
        .eq('key', 'hub.verification_mode')
        .maybeSingle();

      if (settingErr) {
        return NextResponse.json(
          { error: 'Unable to load verification governance policy. Please try again.' },
          { status: 503 }
        );
      }

      if (settingRow?.value !== undefined && settingRow?.value !== null) {
        verificationMode = String(settingRow.value).replace(/^"|"$/g, '').trim() || 'self_service';
      }
    } catch {
      return NextResponse.json(
        { error: 'Unable to load verification governance policy. Please try again.' },
        { status: 503 }
      );
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

    const alreadyVerified = hasTrustedVerificationClaim(user);

    if (verificationMode === 'manual_queue' && !alreadyVerified) {
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

    if (verificationMode === 'auto_on_invite' && !alreadyVerified) {
      let hasInviteClaim = user.app_metadata?.invite_redeemed === true;
      try {
        if (!hasInviteClaim) {
          const { data: redeemedCodes } = await serviceClient
            .from('user_auth_codes')
            .select('id')
            .eq('user_id', user.id)
            .not('used_at', 'is', null)
            .limit(1);
          hasInviteClaim = Array.isArray(redeemedCodes) && redeemedCodes.length > 0;
        }

        if (!hasInviteClaim && user.email) {
          const normalizedEmail = user.email.trim().toLowerCase();
          const escapedEmail = normalizedEmail.replace(/[\\%_]/g, '\\$&');
          const { data: approvedReq } = await serviceClient
            .from('user_auth_code_requests')
            .select('id, email')
            .ilike('email', escapedEmail)
            .eq('status', 'approved')
            .limit(20);
          hasInviteClaim = Array.isArray(approvedReq)
            ? approvedReq.some(
                (r: any) => typeof r?.email === 'string' && r.email.trim().toLowerCase() === normalizedEmail
              )
            : false;
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

    if (!alreadyVerified) {
      const challengeCheck = verifyProofChallenge(
        user.id,
        body.challenge,
        body.signature,
        body.proofNonce
      );
      if (!challengeCheck.valid) {
        return NextResponse.json({ error: challengeCheck.error }, { status: 400 });
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
      const errCode = (error as any).code;
      const errMsg = error.message || '';
      const isMissingRpcOrUnexposedSchema =
        errCode === 'PGRST202' ||
        errCode === 'PGRST106' ||
        /could not find the function|does not exist|the schema must be one of/i.test(errMsg);

      if (!isMissingRpcOrUnexposedSchema || !serviceClient.auth?.admin?.updateUserById) {
        console.error('[ACCOUNT VERIFICATION ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const now = new Date().toISOString();
      const existingAppMeta = (user.app_metadata as Record<string, any>) || {};
      const existingTier = String(existingAppMeta.verification_tier || 'UNVERIFIED').toUpperCase();
      const nextTier = TRUSTED_VERIFIED_TIERS.has(existingTier) ? existingTier : 'VERIFIED';
      const effectiveVerifiedAt =
        alreadyVerified && typeof existingAppMeta.verified_at === 'string' && existingAppMeta.verified_at
          ? existingAppMeta.verified_at
          : now;

      const { error: authUpdateErr } = await serviceClient.auth.admin.updateUserById(user.id, {
        app_metadata: {
          ...existingAppMeta,
          is_human_verified: true,
          is_human: true,
          anti_sybil_verified: true,
          verification_tier: nextTier,
          verified_at: effectiveVerifiedAt,
        },
      });

      if (authUpdateErr) {
        return NextResponse.json({ error: authUpdateErr.message }, { status: 500 });
      }

      // Update core is_verified separately from optional columns
      const { error: coreProfErr } = await serviceClient
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', user.id);

      if (coreProfErr) {
        const isMissingIsVerifiedCol =
          coreProfErr.code === '42703' ||
          coreProfErr.code === 'PGRST204' ||
          /is_verified.*does not exist|could not find the 'is_verified' column/i.test(
            coreProfErr.message || ''
          );
        if (!isMissingIsVerifiedCol) {
          return NextResponse.json(
            { error: `Failed to persist profile verification: ${coreProfErr.message}` },
            { status: 500 }
          );
        }
      }

      const secondaryUpdatePayload: Record<string, any> = {
        ...(cleanDisplayName ? { display_name: cleanDisplayName } : {}),
        citizen_tier: 'Verified Citizen',
      };
      if (!alreadyVerified) {
        secondaryUpdatePayload.verified_at = effectiveVerifiedAt;
        secondaryUpdatePayload.verification_method = 'self_service';
      }

      try {
        const { error: secondaryProfErr } = await serviceClient
          .from('profiles')
          .update(secondaryUpdatePayload)
          .eq('id', user.id);

        if (secondaryProfErr) {
          await serviceClient
            .from('profiles')
            .update({
              ...(cleanDisplayName ? { display_name: cleanDisplayName } : {}),
              citizen_tier: 'Verified Citizen',
            })
            .eq('id', user.id);
        }
      } catch {
        try {
          await serviceClient
            .from('profiles')
            .update({
              ...(cleanDisplayName ? { display_name: cleanDisplayName } : {}),
              citizen_tier: 'Verified Citizen',
            })
            .eq('id', user.id);
        } catch {
          // Secondary profile metadata sync fallback
        }
      }

      let existingProfileMethod: string | null = null;
      if (alreadyVerified && typeof serviceClient.from === 'function') {
        try {
          const profSelect = serviceClient.from('profiles') as any;
          if (profSelect && typeof profSelect.select === 'function') {
            const { data: existingProf } = await profSelect
              .select('verification_method')
              .eq('id', user.id)
              .maybeSingle();
            if (typeof existingProf?.verification_method === 'string' && existingProf.verification_method) {
              existingProfileMethod = existingProf.verification_method;
            }
          }
        } catch {
          // Optional read
        }
      }

      verificationResult = {
        user_id: user.id,
        is_verified: true,
        verified_at: effectiveVerifiedAt,
        method: alreadyVerified
          ? existingProfileMethod || existingAppMeta.verification_method || 'self_service'
          : 'self_service',
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
