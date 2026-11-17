import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  isFeatureEnabled,
  filterVisibleLaunchpadApps,
  normalizeFeatureFlags,
  type HubFeatureFlag,
} from '../lib/services/featureFlagsService';
import { ECOSYSTEM_APPS } from '../data/ecosystemApps';
import FlagsClient from '../app/admin/flags/FlagsClient';

const mockUpsert = vi.fn();
vi.mock('@digitalcanopy/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: mockUpsert,
    })),
  },
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));

describe('FeatureFlagsService Core Logic', () => {
  it('normalizes undefined or empty flags to default true states', () => {
    const flags = normalizeFeatureFlags(null);
    expect(flags.card_dartup).toBe(true);
    expect(flags.widget_dartup).toBe(true);
    expect(flags.widget_chess).toBe(true);
  });

  it('correctly reports enabled state with fallback', () => {
    const flags: HubFeatureFlag[] = [
      { key: 'card_dartup', name: 'Dart Up', category: 'card', enabled: false },
      { key: 'widget_chess', name: 'Chess', category: 'widget', enabled: true },
    ];

    expect(isFeatureEnabled(flags, 'card_dartup')).toBe(false);
    expect(isFeatureEnabled(flags, 'widget_chess')).toBe(true);
    expect(isFeatureEnabled(flags, 'unregistered_flag', true)).toBe(true);
    expect(isFeatureEnabled(flags, 'unregistered_flag', false)).toBe(false);
  });

  it('filters launchpad apps according to card visibility flags', () => {
    const flags = {
      card_dartup: false,
      card_wsw: true,
      card_pukhuk: true,
      card_cozy: true,
      card_patchwork: true,
      card_valerie: true,
      card_makerverse: true,
    };

    const visible = filterVisibleLaunchpadApps(ECOSYSTEM_APPS, flags);
    expect(visible.some((a) => a.id === 'dartup')).toBe(false);
    expect(visible.some((a) => a.id === 'wsw')).toBe(true);
    expect(visible.length).toBe(ECOSYSTEM_APPS.length - 1);
  });
});

describe('FlagsClient Admin Gateway UI', () => {
  const sampleFlags: HubFeatureFlag[] = [
    {
      key: 'card_dartup',
      name: 'Dart Up! Launchpad Card',
      description: 'Display Dart Up! in the SunShade Ecosystem Launchpad showcase',
      category: 'card',
      enabled: true,
    },
    {
      key: 'widget_dartup',
      name: 'Dart Up! Widget',
      description: 'Mount real-time telemetry widget',
      category: 'widget',
      enabled: true,
    },
    {
      key: 'connected_services',
      name: 'Connected Services Directory',
      description: 'Display connected services grid',
      category: 'system',
      enabled: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
  });

  it('renders flags summary counters and rows', () => {
    render(<FlagsClient initialFlags={sampleFlags} />);

    expect(screen.getByText('Dart Up! Launchpad Card')).toBeInTheDocument();
    expect(screen.getByText('Dart Up! Widget')).toBeInTheDocument();
    expect(screen.getByText('Connected Services Directory')).toBeInTheDocument();

    // Metric counters
    expect(screen.getAllByText('1').length).toBe(2); // 1 card, 1 widget
    expect(screen.getByText('2 / 3')).toBeInTheDocument(); // 2 active
  });

  it('filters rows by category pill', () => {
    render(<FlagsClient initialFlags={sampleFlags} />);

    const cardPill = screen.getByRole('button', { name: 'Launchpad Cards' });
    fireEvent.click(cardPill);

    expect(screen.getByText('Dart Up! Launchpad Card')).toBeInTheDocument();
    expect(screen.queryByText('Dart Up! Widget')).not.toBeInTheDocument();
    expect(screen.queryByText('Connected Services Directory')).not.toBeInTheDocument();
  });

  it('toggles a feature flag and persists to Supabase', async () => {
    render(<FlagsClient initialFlags={sampleFlags} />);

    const toggleBtns = screen.getAllByTitle(/Click to/i);
    // Click first toggle (card_dartup: true -> false)
    fireEvent.click(toggleBtns[0]);

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'card_dartup',
          enabled: false,
        }),
        { onConflict: 'key' }
      );
    });

    expect(mockRefresh).toHaveBeenCalled();
  });
});
