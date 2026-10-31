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

vi.mock('@digitalcanopy/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: mockSession } })),
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
    vi.useFakeTimers();
    mockSession = {
      user: { id: 'test-user-id', email: 'citizen@sunshade.icu', user_metadata: { display_name: 'Test Citizen' } },
      access_token: 'test_token',
      refresh_token: 'test_refresh',
    };
    mockSelect.mockReset().mockResolvedValue({
      data: [{ id: 'test-user-id', display_name: 'Alex_Citizen', citizen_tier: 'Verified Citizen' }],
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
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
    await act(async () => {
      fireEvent.click(beginBtn);
    });

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Step 2: Citizen Profile Setup
    expect(screen.getByText('Choose Your Public Citizen Alias')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/e\.g\. CivicVoice_42/i);
    act(() => {
      fireEvent.change(nameInput, { target: { value: 'Alex_Citizen' } });
    });

    const confirmProfileBtn = screen.getByRole('button', { name: /Confirm Citizen Profile/i });
    await act(async () => {
      fireEvent.click(confirmProfileBtn);
    });

    // Verify error is displayed and user remains on Step 2
    expect(
      screen.getByText(/Database RLS policy rejection: unauthorized update/i)
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
    await act(async () => {
      fireEvent.click(beginBtn);
    });

    // Advance timer for step 1 simulation
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Step 2: Citizen Profile Setup
    expect(screen.getByText('Choose Your Public Citizen Alias')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/e\.g\. CivicVoice_42/i);
    act(() => {
      fireEvent.change(nameInput, { target: { value: 'Alex_Citizen' } });
    });

    const confirmProfileBtn = screen.getByRole('button', { name: /Confirm Citizen Profile/i });
    await act(async () => {
      fireEvent.click(confirmProfileBtn);
    });

    // Advance timer for step 2 simulation
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Step 3: Verified Badge
    expect(screen.getByText('Citizen Profile Verified')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to Civic Services/i })).toBeInTheDocument();
  });
});
