import crypto from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { NextRequest } from 'next/server';

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();
let mockSessionValue: any = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@digitalcanopy/ui', () => ({
  LoginForm: () => <div data-testid="login-form-stub" />,
}));

vi.mock('@digitalcanopy/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: mockSessionValue } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

const mockGetUserFromToken = vi.fn();
const mockCreateServiceClient = vi.fn();

vi.mock('../lib/supabase-server', () => ({
  getUserFromToken: (...args: any[]) => mockGetUserFromToken(...args),
  createServiceClient: () => mockCreateServiceClient(),
}));

import LoginClient from '../app/login/LoginClient';
import { GET as verifyGet, POST as verifyPost } from '../app/api/auth/verify/route';

async function solveChallengeForUser(token = 'valid_jwt') {
  const challengeRes = await verifyGet(
    new NextRequest('http://localhost/api/auth/verify', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
  );
  const data = await challengeRes.json();
  const prefix = String(data.powPrefix || '00');
  let proofNonce = '0';
  for (let i = 0; i < 100_000; i++) {
    const cand = i.toString(16);
    const hex = crypto.createHash('sha256').update(`${data.challenge}:${cand}`).digest('hex');
    if (hex.startsWith(prefix)) {
      proofNonce = cand;
      break;
    }
  }
  return { challenge: data.challenge, signature: data.signature, proofNonce };
}

describe('Hub Verification Flow & Login Redirect (verify=true)', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockGetUserFromToken.mockReset();
    mockCreateServiceClient.mockReset();
    mockSearchParams = new URLSearchParams();
    mockSessionValue = null;
  });

  it('redirects already-signed-in users to /verify when verify=true instead of bouncing back unverified', async () => {
    mockSessionValue = {
      user: { id: 'usr_123', email: 'voter@sunshade.icu' },
      access_token: 'tok_abc',
      refresh_token: 'ref_xyz',
    };
    mockSearchParams = new URLSearchParams(
      'redirect=https%3A%2F%2Fvotary.app%2Fauth%2Fcallback&verify=true&redirectTo=https%3A%2F%2Fvotary.app%2Fpolls%2F1'
    );

    render(<LoginClient />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        '/verify?redirectTo=https%3A%2F%2Fvotary.app%2Fpolls%2F1'
      );
    });
  });

  it('POST /api/auth/verify rejects missing bearer token with 401 and missing proof challenge with 400', async () => {
    const unauthReq = new NextRequest('http://localhost/api/auth/verify', { method: 'POST' });
    const unauthRes = await verifyPost(unauthReq);
    expect(unauthRes.status).toBe(401);

    mockGetUserFromToken.mockResolvedValue({
      id: 'usr_no_proof',
      email: 'voter@sunshade.icu',
      app_metadata: {},
    });
    mockCreateServiceClient.mockReturnValue({
      schema: vi.fn(() => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { value: 'self_service' }, error: null }),
            }),
          }),
        }),
      })),
    });

    const noProofRes = await verifyPost(
      new NextRequest('http://localhost/api/auth/verify', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid_jwt', 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'CivicVoter' }),
      })
    );
    expect(noProofRes.status).toBe(400);
  });

  it('POST /api/auth/verify fails closed with 503 when verification_mode query fails', async () => {
    mockGetUserFromToken.mockResolvedValue({
      id: 'usr_policy_err',
      email: 'voter@sunshade.icu',
      app_metadata: {},
    });
    mockCreateServiceClient.mockReturnValue({
      schema: vi.fn(() => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: { message: 'DB timeout' } }),
            }),
          }),
        }),
      })),
    });

    const proof = await solveChallengeForUser();
    const res = await verifyPost(
      new NextRequest('http://localhost/api/auth/verify', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid_jwt', 'Content-Type': 'application/json' },
        body: JSON.stringify(proof),
      })
    );
    expect(res.status).toBe(503);
  });

  it('POST /api/auth/verify executes admin.set_user_verification under self_service mode', async () => {
    mockGetUserFromToken.mockResolvedValue({
      id: 'usr_self_1',
      email: 'voter@sunshade.icu',
      app_metadata: {},
    });

    const rpcSpy = vi.fn().mockResolvedValue({
      data: { user_id: 'usr_self_1', is_verified: true, method: 'self_service' },
      error: null,
    });

    mockCreateServiceClient.mockReturnValue({
      schema: vi.fn((schemaName: string) => {
        if (schemaName === 'valerie') {
          return {
            from: () => ({
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { value: 'self_service' }, error: null }),
                }),
              }),
            }),
          };
        }
        expect(schemaName).toBe('admin');
        return { rpc: rpcSpy };
      }),
      from: () => ({
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    });

    const proof = await solveChallengeForUser();
    const req = new NextRequest('http://localhost/api/auth/verify', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid_jwt',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ displayName: 'CivicVoter', ...proof }),
    });

    const res = await verifyPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.verification.is_verified).toBe(true);
    expect(rpcSpy).toHaveBeenCalledWith('set_user_verification', {
      p_target_user_id: 'usr_self_1',
      p_is_verified: true,
      p_method: 'self_service',
      p_actor_id: null,
      p_reason: 'Self-service humanity confirmation',
    });
  });

  it('POST /api/auth/verify blocks self-service when hub.verification_mode is manual_queue', async () => {
    mockGetUserFromToken.mockResolvedValue({
      id: 'usr_queue_1',
      email: 'queued@sunshade.icu',
      app_metadata: {},
    });

    const rpcSpy = vi.fn();
    mockCreateServiceClient.mockReturnValue({
      schema: vi.fn((schemaName: string) => {
        if (schemaName === 'valerie') {
          return {
            from: () => ({
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { value: 'manual_queue' }, error: null }),
                }),
              }),
            }),
          };
        }
        return { rpc: rpcSpy };
      }),
      from: () => ({
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    });

    const req = new NextRequest('http://localhost/api/auth/verify', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid_jwt' },
    });

    const res = await verifyPost(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.mode).toBe('manual_queue');
    expect(body.requiresManualReview).toBe(true);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('POST /api/auth/verify rejects SQL wildcard email matches in auto_on_invite and allows invite_redeemed', async () => {
    mockGetUserFromToken.mockResolvedValue({
      id: 'usr_wild_1',
      email: 'a_b@sunshade.icu',
      app_metadata: {},
    });

    mockCreateServiceClient.mockReturnValue({
      schema: vi.fn(() => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { value: 'auto_on_invite' }, error: null }),
            }),
          }),
        }),
      })),
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            not: () => ({ limit: async () => ({ data: [], error: null }) }),
          }),
          ilike: () => ({
            eq: () => ({
              limit: async () => ({
                // Simulates wildcard hit for different address aXb@sunshade.icu
                data: table === 'user_auth_code_requests' ? [{ id: 'req_1', email: 'aXb@sunshade.icu' }] : [],
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const proof = await solveChallengeForUser();
    const blockedRes = await verifyPost(
      new NextRequest('http://localhost/api/auth/verify', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid_jwt', 'Content-Type': 'application/json' },
        body: JSON.stringify(proof),
      })
    );
    expect(blockedRes.status).toBe(403);

    // Account with invite_redeemed claim is permitted
    mockGetUserFromToken.mockResolvedValue({
      id: 'usr_invited_1',
      email: 'invited@sunshade.icu',
      app_metadata: { invite_redeemed: true },
    });
    const updateUserByIdSpy = vi.fn().mockResolvedValue({ data: { user: { id: 'usr_invited_1' } }, error: null });
    mockCreateServiceClient.mockReturnValue({
      schema: vi.fn((schemaName: string) => {
        if (schemaName === 'valerie') {
          return {
            from: () => ({
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { value: 'auto_on_invite' }, error: null }),
                }),
              }),
            }),
          };
        }
        return {
          rpc: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST106', message: 'The schema must be one of the following: public' },
          }),
        };
      }),
      auth: { admin: { updateUserById: updateUserByIdSpy } },
      from: () => ({
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    });

    const invitedProof = await solveChallengeForUser();
    const allowedRes = await verifyPost(
      new NextRequest('http://localhost/api/auth/verify', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid_jwt', 'Content-Type': 'application/json' },
        body: JSON.stringify(invitedProof),
      })
    );
    expect(allowedRes.status).toBe(200);
    expect(updateUserByIdSpy).toHaveBeenCalled();
  });

  it('POST /api/auth/verify falls back to auth.admin.updateUserById on PGRST202 and PGRST106', async () => {
    mockGetUserFromToken.mockResolvedValue({
      id: 'usr_fallback_1',
      email: 'voter@sunshade.icu',
      app_metadata: { role: 'user' },
    });

    const updateUserByIdSpy = vi.fn().mockResolvedValue({ data: { user: { id: 'usr_fallback_1' } }, error: null });
    const rpcSpy = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function admin.set_user_verification' },
    });

    mockCreateServiceClient.mockReturnValue({
      schema: vi.fn((schemaName: string) => {
        if (schemaName === 'valerie') {
          return {
            from: () => ({
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return { rpc: rpcSpy };
      }),
      auth: { admin: { updateUserById: updateUserByIdSpy } },
      from: () => ({
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    });

    const proof = await solveChallengeForUser();
    const req = new NextRequest('http://localhost/api/auth/verify', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid_jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify(proof),
    });

    const res = await verifyPost(req);
    expect(res.status).toBe(200);
    expect(updateUserByIdSpy).toHaveBeenCalledWith(
      'usr_fallback_1',
      expect.objectContaining({
        app_metadata: expect.objectContaining({
          role: 'user',
          is_human_verified: true,
          is_human: true,
          anti_sybil_verified: true,
          verification_tier: 'VERIFIED',
        }),
      })
    );
  });
});
