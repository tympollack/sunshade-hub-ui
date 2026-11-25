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
import { POST as verifyPost } from '../app/api/auth/verify/route';

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

  it('POST /api/auth/verify rejects missing bearer token with 401', async () => {
    const req = new NextRequest('http://localhost/api/auth/verify', { method: 'POST' });
    const res = await verifyPost(req);
    expect(res.status).toBe(401);
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

    const req = new NextRequest('http://localhost/api/auth/verify', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid_jwt',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ displayName: 'CivicVoter' }),
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

  it('POST /api/auth/verify falls back to auth.admin.updateUserById when RPC is not yet deployed', async () => {
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

    const req = new NextRequest('http://localhost/api/auth/verify', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid_jwt' },
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
