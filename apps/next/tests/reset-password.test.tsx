import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ResetPasswordClient from '../app/reset-password/ResetPasswordClient';

let mockSearchParams: URLSearchParams | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams || new URLSearchParams(window.location.search),
}));

let mockSession: any = null;
const mockVerifyOtp = vi.fn();
const mockExchangeCode = vi.fn();
const mockGetSession = vi.fn();
const mockSetSession = vi.fn();
let authStateListener: ((event: string, session: any) => void) | null = null;

vi.mock('@digitalcanopy/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp: (...args: any[]) => mockVerifyOtp(...args),
      exchangeCodeForSession: (...args: any[]) => mockExchangeCode(...args),
      setSession: (...args: any[]) => mockSetSession(...args),
      getSession: () => mockGetSession(),
      onAuthStateChange: vi.fn((cb) => {
        authStateListener = cb;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      }),
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

describe('ResetPasswordClient Session Recovery & OTP Handling', () => {
  let replaceStateSpy: any;

  beforeEach(() => {
    mockSearchParams = null;
    mockSession = null;
    mockVerifyOtp.mockReset();
    mockExchangeCode.mockReset();
    mockGetSession.mockReset();
    mockSetSession.mockReset();

    mockVerifyOtp.mockResolvedValue({ data: null, error: null });
    mockExchangeCode.mockResolvedValue({ data: null, error: null });
    mockSetSession.mockResolvedValue({ data: null, error: null });
    mockGetSession.mockResolvedValue({ data: { session: null } });

    authStateListener = null;
    window.location.hash = '';
    window.history.replaceState(null, '', '/reset-password');
    replaceStateSpy = vi.spyOn(window.history, 'replaceState');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('strips token_hash and type from URL after successful OTP verification', async () => {
    window.history.replaceState(
      null,
      '',
      '/reset-password?token_hash=valid_recovery_token_123&type=recovery'
    );

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

    // Validates that history.replaceState was called to sanitize URL and stripped the token
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/reset-password');
    expect(window.location.search).toBe('');
    expect(window.location.href).not.toContain('token_hash');
    expect(window.location.href).not.toContain('type');
  });

  it('retains error and rejects recovery when URL query contains error parameters, even if an active session exists', async () => {
    // Simulates an expired link redirect from Supabase to /reset-password?error=otp_expired
    window.history.replaceState(
      null,
      '',
      '/reset-password?error=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    );

    const activeSession = {
      user: { id: 'alice_123', email: 'alice@sunshade.icu' },
      access_token: 'alices_jwt_token',
    };

    mockGetSession.mockResolvedValueOnce({
      data: { session: activeSession },
    });

    render(<ResetPasswordClient />);

    await waitFor(() => {
      expect(screen.getByText(/Email link is invalid or has expired/i)).toBeInTheDocument();
      expect(screen.getByText(/No Recovery Session Active/i)).toBeInTheDocument();
    });

    expect(screen.queryByPlaceholderText(/Enter new password/i)).not.toBeInTheDocument();
  });

  it('prevents background onAuthStateChange events from reviving hasSession after recovery fails', async () => {
    window.history.replaceState(
      null,
      '',
      '/reset-password?error=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    );

    const activeSession = {
      user: { id: 'alice_123', email: 'alice@sunshade.icu' },
      access_token: 'alices_jwt_token',
    };

    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    });

    render(<ResetPasswordClient />);

    await waitFor(() => {
      expect(screen.getByText(/Email link is invalid or has expired/i)).toBeInTheDocument();
      expect(screen.getByText(/No Recovery Session Active/i)).toBeInTheDocument();
    });

    // Simulate Supabase emitting a background session event (e.g. from cookies or tab sync)
    act(() => {
      authStateListener?.('INITIAL_SESSION', activeSession);
    });

    // Verify hasSession remains false and password form is NOT rendered
    expect(screen.getByText(/Email link is invalid or has expired/i)).toBeInTheDocument();
    expect(screen.getByText(/No Recovery Session Active/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Enter new password/i)).not.toBeInTheDocument();
  });

  it('retains error and rejects recovery when URL hash contains error fragment, even if an active session exists', async () => {
    // Simulates an error passed via URL hash fragment
    window.location.hash = '#error=access_denied&error_description=Recovery+token+has+expired';

    const activeSession = {
      user: { id: 'alice_123', email: 'alice@sunshade.icu' },
      access_token: 'alices_jwt_token',
    };

    mockGetSession.mockResolvedValueOnce({
      data: { session: activeSession },
    });

    render(<ResetPasswordClient />);

    await waitFor(() => {
      expect(screen.getByText(/Recovery token has expired/i)).toBeInTheDocument();
      expect(screen.getByText(/No Recovery Session Active/i)).toBeInTheDocument();
    });

    expect(screen.queryByPlaceholderText(/Enter new password/i)).not.toBeInTheDocument();
  });

  it('retains error and rejects recovery when hash tokens fail setSession, even if an active session exists', async () => {
    window.location.hash = '#access_token=corrupt_tok&refresh_token=corrupt_ref';

    const activeSession = {
      user: { id: 'alice_123', email: 'alice@sunshade.icu' },
      access_token: 'alices_jwt_token',
    };

    mockSetSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid or revoked recovery session tokens' },
    });

    mockGetSession.mockResolvedValueOnce({
      data: { session: activeSession },
    });

    render(<ResetPasswordClient />);

    await waitFor(() => {
      expect(screen.getByText(/Invalid or revoked recovery session tokens/i)).toBeInTheDocument();
      expect(screen.getByText(/No Recovery Session Active/i)).toBeInTheDocument();
    });

    expect(screen.queryByPlaceholderText(/Enter new password/i)).not.toBeInTheDocument();
  });

  it('restores active recovery session on page refresh when token parameters were already stripped from URL', async () => {
    // Simulates a user refreshing the page after URL was sanitized (clean path, no query params)
    window.history.replaceState(null, '', '/reset-password');

    const activeSession = {
      user: { id: 'user_123', email: 'citizen@sunshade.icu' },
      access_token: 'existing_jwt_token',
    };

    mockGetSession.mockResolvedValueOnce({
      data: { session: activeSession },
    });

    render(<ResetPasswordClient />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter new password/i)).toBeInTheDocument();
    });

    // Displays target account email and no error alert
    expect(screen.getByText(/citizen@sunshade\.icu/i)).toBeInTheDocument();
    expect(screen.queryByText(/Token has expired or is invalid/i)).not.toBeInTheDocument();
  });

  it('shows error and rejects recovery when token verification fails, preventing account mismatch even if an existing session exists', async () => {
    // Simulates Alice being signed in, but opening Bob's invalid/expired recovery token
    window.history.replaceState(
      null,
      '',
      '/reset-password?token_hash=bobs_expired_token&type=recovery'
    );

    const alicesSession = {
      user: { id: 'alice_123', email: 'alice@sunshade.icu' },
      access_token: 'alices_jwt_token',
    };

    mockVerifyOtp.mockResolvedValueOnce({
      data: null,
      error: { message: 'Token has expired or is invalid' },
    });

    mockGetSession.mockResolvedValueOnce({
      data: { session: alicesSession },
    });

    render(<ResetPasswordClient />);

    await waitFor(() => {
      // Must display the error and NOT show the password change form for Alice
      expect(screen.getByText(/Token has expired or is invalid/i)).toBeInTheDocument();
      expect(screen.getByText(/No Recovery Session Active/i)).toBeInTheDocument();
    });

    expect(screen.queryByPlaceholderText(/Enter new password/i)).not.toBeInTheDocument();
  });

  it('displays error and shows recovery notice when OTP fails and no session exists', async () => {
    window.history.replaceState(
      null,
      '',
      '/reset-password?token_hash=invalid_token_999&type=recovery'
    );

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
    window.history.replaceState(
      null,
      '',
      '/reset-password?code=pkce_auth_code_xyz'
    );

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
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/reset-password');
    expect(window.location.search).toBe('');
    expect(window.location.href).not.toContain('code=');
  });
});
