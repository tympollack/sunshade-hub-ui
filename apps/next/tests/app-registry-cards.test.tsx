import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ECOSYSTEM_APPS } from '../data/ecosystemApps';
import { AppCard, AppRegistryGrid, resolveLaunchUrl } from '../components/launchpad/AppCard';

let mockSession: any = {
  access_token: 'test_access_token_123',
  refresh_token: 'test_refresh_token_456',
};

vi.mock('@digitalcanopy/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: mockSession } })),
    },
  },
}));

describe('Dynamic App Registry & AppCard Showcase', () => {
  beforeEach(() => {
    mockSession = {
      access_token: 'test_access_token_123',
      refresh_token: 'test_refresh_token_456',
    };
  });

  it('contains valid metadata for all 6 required SunShade ecosystem applications', () => {
    const requiredApps = [
      'War: Second Wind',
      'Puk Huk',
      'Cozy',
      'PatchWork',
      'Project Valerie',
      'Makerverse',
    ];

    expect(ECOSYSTEM_APPS.length).toBe(6);

    for (const appName of requiredApps) {
      const app = ECOSYSTEM_APPS.find((a) => a.name === appName);
      expect(app).toBeDefined();
      expect(app!.bio).toBeTruthy();
      expect(app!.version).toMatch(/^v\d+\.\d+\.\d+/);
      expect(app!.bannerUrl).toMatch(/\.webp$/);
      expect(app!.blurDataUrl).toBeTruthy();
      expect(['Production', 'Local Mesh Only', 'Beta']).toContain(app!.releaseTag);
      expect(app!.launchRoute).toBeTruthy();
      expect(['Play Now', 'Launch']).toContain(app!.ctaType);
    }
  });

  it('renders AppCard with 16:9 banner, release tag chip, version chip, and bio', () => {
    const wswApp = ECOSYSTEM_APPS.find((a) => a.id === 'wsw')!;
    render(<AppCard app={wswApp} />);

    expect(screen.getByText('War: Second Wind')).toBeInTheDocument();
    expect(screen.getByText(wswApp.bio)).toBeInTheDocument();
    expect(screen.getByText(wswApp.version)).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Game')).toBeInTheDocument();

    const img = screen.getByAltText('War: Second Wind');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('wsw.webp');
  });

  it('generates SSO tokens and executes handshake redirect on Launch click', async () => {
    const cozyApp = ECOSYSTEM_APPS.find((a) => a.id === 'cozy')!;
    const onLaunchMock = vi.fn();

    render(<AppCard app={cozyApp} onLaunch={onLaunchMock} />);

    const launchBtn = screen.getByRole('button', { name: /Launch/i });
    await act(async () => {
      fireEvent.click(launchBtn);
    });

    await waitFor(() => {
      expect(onLaunchMock).toHaveBeenCalled();
    });

    const [calledApp, finalUrl] = onLaunchMock.mock.calls[0];
    expect(calledApp.id).toBe('cozy');
    expect(finalUrl).toContain('https://cozy.sunshade.icu');
    expect(finalUrl).toContain('#access_token=test_access_token_123');
    expect(finalUrl).toContain('refresh_token=test_refresh_token_456');
  });

  it('renders responsive 1-column mobile, 2-column tablet, 3-column desktop grid in AppRegistryGrid', () => {
    const { container } = render(<AppRegistryGrid apps={ECOSYSTEM_APPS} />);

    const grid = screen.getByTestId('app-registry-grid');
    expect(grid).toBeInTheDocument();
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('sm:grid-cols-2');
    expect(grid.className).toContain('lg:grid-cols-3');

    expect(container.querySelectorAll('[data-testid^="app-card-"]').length).toBe(6);
  });
});
