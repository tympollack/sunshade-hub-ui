import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VerifyClient from '../app/(onboarding)/verify/VerifyClient';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('Onboarding Citizen Verification Flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('introduces verification with clear, single-human citizen copy', () => {
    const { container } = render(<VerifyClient />);
    const textContent = container.textContent || '';

    // Must match exact user requirement
    expect(
      screen.getByText(/Confirm your single-human citizen profile so your voice counts once and cannot be forged by bots\./i)
    ).toBeInTheDocument();

    // Verify absence of all-caps jarring acronyms on the front-door onboarding entry
    expect(textContent).not.toContain('ANTI-BANDWAGONING');
    expect(textContent).not.toContain('ANTI-SYBIL');
  });

  it('renders value proposition cards with accessible civic language', () => {
    render(<VerifyClient />);

    expect(screen.getByText('Equal Voice')).toBeInTheDocument();
    expect(screen.getByText('Bot Protection')).toBeInTheDocument();
    expect(screen.getByText('Private & Safe')).toBeInTheDocument();
    expect(screen.getByText('Confirm Single-Human Humanity')).toBeInTheDocument();
  });

  it('progresses through verification steps', () => {
    render(<VerifyClient />);

    // Step 1: Click Begin Verification
    const beginBtn = screen.getByRole('button', { name: /Begin Verification/i });
    act(() => {
      fireEvent.click(beginBtn);
    });

    // Advance timer for step 1 simulation
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Step 2: Citizen Profile Setup
    expect(screen.getByText('Choose Your Public Citizen Alias')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/e\.g\. CivicVoice_42/i);
    act(() => {
      fireEvent.change(nameInput, { target: { value: 'Alex_Citizen' } });
    });

    const confirmProfileBtn = screen.getByRole('button', { name: /Confirm Citizen Profile/i });
    act(() => {
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
