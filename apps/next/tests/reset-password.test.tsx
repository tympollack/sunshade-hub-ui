import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ResetPasswordClient from '../app/reset-password/ResetPasswordClient';

let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

let mockSession: any = null;
const mockVerifyOtp = vi.fn();
const mockExchangeCode = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@digitalcanopy/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp: (...args: any[]) => mockVerifyOtp(...args),
      exchangeCodeForSession: (...args: any[]) => mockExchangeCode(...args),
      getSession: () => mockGetSession(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

describe('ResetPasswordClient Session Recovery & OTP Handling', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockSession = null;
    mockVerifyOtp.mockReset();
    mockExchangeCode.mockReset();
    mockGetSession.mockReset();
    window.location.hash = '';
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('strips token_hash and type from URL after successful OTP verification', async () => {
    mockSearchParams = new URLSearchParams({
      token_hash: 'valid_recovery_token_123',
      type: 'recovery',
    });

    const sessionObj = {
      user: { id: 'user_123', email: 'citizen@sunshade.icu' },
      access_token: 'valid_jwt_token',
    };

    mockVerifyOtp.mockResolvedValueOnce({
      data: { session: sessionObj },
      error: null,
    });
    mockGetSession.mockResolvedValueOnce({
      data: { session: sessionObj },
    });

    render(<ResetPasswordClient />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'valid_recovery_token_123',
      type: 'recovery',
    });

    // Validates that history.replaceState was called to sanitize URL
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it('clears token-verification error when fallback getSession returns an active session on refresh', async () => {
    // Simulates a user refreshing the page after token consumption
    mockSearchParams = new URLSearchParams({
      token_hash: 'already_consumed_token',
      type: 'recovery',
    });

    const activeSession = {
      user: { id: 'user_123', email: 'citizen@sunshade.icu' },
      access_token: 'existing_jwt_token',
    };

    // verifyOtp fails because token was already consumed
    mockVerifyOtp.mockResolvedValueOnce({
      data: null,
      error: { message: 'Token has expired or is invalid' },
    });

    // but getSession restores the valid session
    mockGetSession.mockResolvedValueOnce({
      data: { session: activeSession },
    });

    render(<ResetPasswordClient />);

    await act(async () => {
      await Promise.resolve();
    });

    // Form inputs should be visible and ready
    expect(screen.getByPlaceholderText(/Enter new password/i)).toBeInTheDocument();

    // Expired token error should NOT be displayed
    expect(screen.queryByText(/Token has expired or is invalid/i)).not.toBeInTheDocument();
  });

  it('displays error and shows recovery notice when OTP fails and no session exists', async () => {
    mockSearchParams = new URLSearchParams({
      token_hash: 'invalid_token_999',
      type: 'recovery',
    });

    mockVerifyOtp.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid or expired recovery token' },
    });

    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    });

    render(<ResetPasswordClient />);

    await waitFor(() => {
      expect(screen.getByText(/Invalid or expired recovery token/i)).toBeInTheDocument();
      expect(screen.getByText(/No Recovery Session Active/i)).toBeInTheDocument();
    });
  });

  it('exchanges code for session and removes code parameter from URL', async () => {
    mockSearchParams = new URLSearchParams({
      code: 'pkce_auth_code_xyz',
    });

    const codeSession = {
      user: { id: 'user_123', email: 'citizen@sunshade.icu' },
      access_token: 'code_jwt_token',
    };

    mockExchangeCode.mockResolvedValueOnce({
      data: { session: codeSession },
      error: null,
    });
    mockGetSession.mockResolvedValueOnce({
      data: { session: codeSession },
    });

    render(<ResetPasswordClient />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockExchangeCode).toHaveBeenCalledWith('pkce_auth_code_xyz');
    expect(window.history.replaceState).toHaveBeenCalled();
  });
});
