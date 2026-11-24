import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConnectedServicesGrid, CONNECTED_SERVICES } from '../components/dashboard/ConnectedServicesGrid';

const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
const mockRefreshSession = vi.fn().mockResolvedValue({ data: { session: null } });

vi.mock('@digitalcanopy/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      refreshSession: () => mockRefreshSession(),
    },
  },
}));

describe('ConnectedServicesGrid Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  it('renders all 5 core SunShade civic services', () => {
    render(<ConnectedServicesGrid />);

    // Check headings and titles
    expect(screen.getByText('Connected SunShade Services')).toBeInTheDocument();
    expect(screen.getByText('The Votary')).toBeInTheDocument();
    expect(screen.getByText('PatchWork')).toBeInTheDocument();
    expect(screen.getByText('Speak for the Dead')).toBeInTheDocument();
    expect(screen.getByText('Cozy')).toBeInTheDocument();
    expect(screen.getByText('Digital Canopy')).toBeInTheDocument();
  });

  it('renders civic utility mission copy rather than arcade mechanics', () => {
    const { container } = render(<ConnectedServicesGrid />);
    const textContent = container.textContent || '';

    // Check civic utility descriptions
    expect(
      screen.getByText(/Verified civic consensus, community stance-taking, and sovereign citizen decrees/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Local municipal infrastructure, road hazards, and water quality reporting/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Public workplace safety ledger and accountability records/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Neighborhood spaces, local check-ins, and community connection/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Resilient local edge nodes and zero-WAN disaster relief connectivity/i)
    ).toBeInTheDocument();

    // Verify absence of outdated arcade/gaming jargon in Connected Services directory
    expect(textContent).not.toMatch(/token balances/i);
    expect(textContent).not.toMatch(/badges, and unlocks/i);
    expect(textContent).not.toMatch(/arcade mechanics/i);
  });

  it('renders active status indicators for all services', () => {
    render(<ConnectedServicesGrid />);

    expect(screen.getByText('Consensus Active')).toBeInTheDocument();
    expect(screen.getByText('Operational')).toBeInTheDocument();
    expect(screen.getByText('Ledger Active')).toBeInTheDocument();
    expect(screen.getByText('Synchronized')).toBeInTheDocument();
    expect(screen.getByText('Mesh Active')).toBeInTheDocument();
  });

  it('renders correct launch links for each service', () => {
    render(<ConnectedServicesGrid />);

    const votaryCard = screen.getByTestId('service-card-votary');
    const votaryLink = votaryCard.querySelector('a');
    expect(votaryLink).toHaveAttribute('href', 'https://votary.app');
    expect(votaryLink).toHaveAttribute('target', '_blank');

    const patchworkCard = screen.getByTestId('service-card-patchwork');
    const patchworkLink = patchworkCard.querySelector('a');
    expect(patchworkLink).toHaveAttribute('href', 'https://patchwork.sunshade.icu');

    const canopyCard = screen.getByTestId('service-card-digital-canopy');
    const canopyLink = canopyCard.querySelector('a');
    expect(canopyLink).toHaveAttribute('href', 'https://canopy.sunshade.icu');
  });

  it('renders in responsive 2-column or 3-column grid', () => {
    const { container } = render(<ConnectedServicesGrid />);
    const gridEl = container.querySelector('.grid');
    expect(gridEl).toHaveClass('grid-cols-1');
    expect(gridEl).toHaveClass('md:grid-cols-2');
    expect(gridEl).toHaveClass('lg:grid-cols-3');
  });

  it('transfers active SSO session tokens to votary.app/auth/callback when launching The Votary', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'hub_access_jwt_123',
          refresh_token: 'hub_refresh_456',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });

    const mockNewTab = { location: { href: '' } };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockNewTab as any);

    try {
      render(<ConnectedServicesGrid />);
      const votaryCard = screen.getByTestId('service-card-votary');
      const votaryLink = votaryCard.querySelector('a')!;
      fireEvent.click(votaryLink);

      await waitFor(() => {
        expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank', 'noopener,noreferrer');
        expect(mockNewTab.location.href).toBe(
          'https://votary.app/auth/callback?return_to=%2F#access_token=hub_access_jwt_123&refresh_token=hub_refresh_456'
        );
      });
    } finally {
      openSpy.mockRestore();
    }
  });
});
