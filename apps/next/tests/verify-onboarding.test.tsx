import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VerifyClient from '../app/(onboarding)/verify/VerifyClient';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockSelect = vi.fn();
const mockEq = vi.fn(() => ({
  select: mockSelect,
}));
const mockUpdate = vi.fn(() => ({
  eq: mockEq,
}));
const mockFrom = vi.fn((_table?: string) => ({
  update: mockUpdate,
}));

let mockSession: any = {
  user: { id: 'test-user-id', email: 'citizen@sunshade.icu', user_metadata: { display_name: 'Test Citizen' } },
  access_token: 'test_token',
  refresh_token: 'test_refresh',
};

let mockRefreshSession: any;

vi.mock('@digitalcanopy/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: mockSession } })),
      refreshSession: (...args: any[]) => mockRefreshSession?.(...args),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getUser: vi.fn(() =>
        Promise.resolve({
          data: mockSession?.user ? { user: mockSession.user } : null,
          error: mockSession?.user ? null : new Error('No user session'),
        })
      ),
    },
    from: (table: string) => mockFrom(table),
  },
}));

describe('Onboarding Citizen Verification Flow', () => {
  beforeEach(() => {
    mockSession = {
      user: { id: 'test-user-id', email: 'citizen@sunshade.icu', user_metadata: { display_name: 'Test Citizen' } },
      access_token: 'test_token',
      refresh_token: 'test_refresh',
    };
    mockRefreshSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          ...mockSession,
          access_token: 'refreshed_verified_token',
        },
      },
      error: null,
    });
    global.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (!init?.method || init.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            challenge: 'test-user-id:123456:abc',
            signature: 'sig_abc',
            powPrefix: '0',
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          verification: { user_id: 'test-user-id', is_verified: true, method: 'self_service' },
        }),
      };
    }) as any;
    mockSelect.mockReset().mockResolvedValue({
      data: [{ id: 'test-user-id', display_name: 'Alex_Citizen', citizen_tier: 'Verified Citizen' }],
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('introduces verification with clear, single-human citizen copy', async () => {
    const { container } = render(<VerifyClient />);
    await act(async () => {
      await Promise.resolve();
    });
    const textContent = container.textContent || '';

    // Must match exact user requirement
    expect(
      screen.getByText(/Confirm your single-human citizen profile so your voice counts once and cannot be forged by bots\./i)
    ).toBeInTheDocument();

    // Verify absence of all-caps jarring acronyms on the front-door onboarding entry
    expect(textContent).not.toContain('ANTI-BANDWAGONING');
    expect(textContent).not.toContain('ANTI-SYBIL');
  });

  it('renders value proposition cards with accessible civic language', async () => {
    render(<VerifyClient />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('Equal Voice')).toBeInTheDocument();
    expect(screen.getByText('Bot Protection')).toBeInTheDocument();
    expect(screen.getByText('Private & Safe')).toBeInTheDocument();
    expect(screen.getByText('Confirm Single-Human Humanity')).toBeInTheDocument();
  });

  it('links Security Settings directly to dashboard settings and security drawer', async () => {
    render(<VerifyClient />);
    await act(async () => {
      await Promise.resolve();
    });

    const link = screen.getByRole('link', { name: /Security Settings/i });
    expect(link).toHaveAttribute('href', '/dashboard?view=Settings&drawer=security');
  });

  it('blocks unauthenticated visitors from advancing to verification', async () => {
    mockSession = null;
    render(<VerifyClient />);

    const beginBtn = screen.getByRole('button', { name: /Begin Verification/i });
    await act(async () => {
      fireEvent.click(beginBtn);
    });

    expect(
      screen.getByText(/Active authenticated session required to initiate citizen verification/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Choose Your Public Citizen Alias')).not.toBeInTheDocument();
  });

  it('halts progression and displays error when profile database update fails', async () => {
    mockSelect.mockResolvedValue({
      data: null,
      error: { message: 'Database RLS policy rejection: unauthorized update' },
    });

    render(<VerifyClient />);
    await act(async () => {
      await Promise.resolve();
    });

    // Step 1: Click Begin Verification
    const beginBtn = screen.getByRole('button', { name: /Begin Verification/i });
    fireEvent.click(beginBtn);

    // Step 2: Citizen Profile Setup
    expect(
      await screen.findByText('Choose Your Public Citizen Alias', {}, { timeout: 4000 })
    ).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/e\.g\. CivicVoice_42/i);
    fireEvent.change(nameInput, { target: { value: 'Alex_Citizen' } });

    const confirmProfileBtn = screen.getByRole('button', { name: /Confirm Citizen Profile/i });
    fireEvent.click(confirmProfileBtn);

    // Verify error is displayed and user remains on Step 2
    expect(
      await screen.findByText(/Database RLS policy rejection: unauthorized update/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Citizen Profile Verified')).not.toBeInTheDocument();
    expect(screen.getByText('Choose Your Public Citizen Alias')).toBeInTheDocument();
  });

  it('progresses through verification steps when authenticated and database update succeeds', async () => {
    render(<VerifyClient />);
    await act(async () => {
      await Promise.resolve();
    });

    // Step 1: Click Begin Verification
    const beginBtn = screen.getByRole('button', { name: /Begin Verification/i });
    fireEvent.click(beginBtn);

    // Step 2: Citizen Profile Setup
    expect(
      await screen.findByText('Choose Your Public Citizen Alias', {}, { timeout: 4000 })
    ).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/e\.g\. CivicVoice_42/i);
    fireEvent.change(nameInput, { target: { value: 'Alex_Citizen' } });

    const confirmProfileBtn = screen.getByRole('button', { name: /Confirm Citizen Profile/i });
    fireEvent.click(confirmProfileBtn);

    // Step 3: Verified Badge
    expect(
      await screen.findByText('Citizen Profile Verified', {}, { timeout: 4000 })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to Civic Services/i })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/verify',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test_token',
        }),
        body: expect.stringMatching(/"challenge":"test-user-id:123456:abc".*"signature":"sig_abc".*"proofNonce":"[0-9a-f]+"/),
      })
    );
    expect(mockUpdate).toHaveBeenCalledWith({ display_name: 'Alex_Citizen' });
    expect(mockRefreshSession).toHaveBeenCalled();
  });

  it('halts progression when /api/auth/verify returns manual_queue 403', async () => {
    (global.fetch as any).mockImplementation(async (_url: string, init?: RequestInit) => {
      if (!init?.method || init.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            challenge: 'test-user-id:123456:abc',
            signature: 'sig_abc',
            powPrefix: '0',
          }),
        };
      }
      return {
        ok: false,
        status: 403,
        json: async () => ({
          error: 'Account verification is currently managed via Manual Admin Queue.',
          mode: 'manual_queue',
          requiresManualReview: true,
        }),
      };
    });

    render(<VerifyClient />);
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole('button', { name: /Begin Verification/i }));

    const nameInput = await screen.findByPlaceholderText(/e\.g\. CivicVoice_42/i, {}, { timeout: 4000 });
    fireEvent.change(nameInput, {
      target: { value: 'Alex_Citizen' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Citizen Profile/i }));

    expect(
      await screen.findByText(/Account verification is currently managed via Manual Admin Queue/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Citizen Profile Verified')).not.toBeInTheDocument();
  });
});
