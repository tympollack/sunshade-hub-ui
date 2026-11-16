import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WidgetErrorBoundary } from '../components/WidgetErrorBoundary';

vi.mock('@digitalcanopy/supabase', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

const state: { era: any; pilot: any; rank: any } = { era: {}, pilot: {}, rank: {} };

function chain(result: () => any) {
  const q: any = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'gt']) q[m] = () => q;
  q.maybeSingle = () => Promise.resolve(result());
  q.then = (res: any, rej: any) => Promise.resolve(result()).then(res, rej);
  return q;
}

vi.mock('../utils/supabase/server', () => ({
  createSSRClient: async () => ({
    schema: () => ({
      from: (table: string) => {
        if (table === 'eras') return chain(() => state.era);
        // pilots: head-count query vs single lookup share the builder; rank used via .gt
        const q: any = chain(() => state.pilot);
        q.gt = () => chain(() => state.rank);
        return q;
      },
    }),
  }),
}));

import { DartUpWidget } from '../app/dashboard/widgets/DartUpWidget';

beforeEach(() => {
  state.era = { data: { era_seed: 'ERA-7', pve_threat_multiplier: 2 }, error: null };
  state.pilot = { data: { callsign: 'Ghost', elo_rating: 1300 }, error: null };
  state.rank = { count: 4, error: null };
});

describe('DartUpWidget', () => {
  it('renders null for signed-out users', async () => {
    expect(await DartUpWidget({ userId: null })).toBeNull();
  });

  it('renders era, threat and rank', async () => {
    render(await DartUpWidget({ userId: 'u1' }));
    expect(screen.getByText('ERA-7')).toBeTruthy();
    expect(screen.getByText('2.0×')).toBeTruthy();
    expect(screen.getByText('#5 (1300 ELO)')).toBeTruthy();
  });

  it('renders empty states with no era or pilot', async () => {
    state.era = { data: null, error: null };
    state.pilot = { data: null, error: null };
    render(await DartUpWidget({ userId: 'u1' }));
    expect(screen.getByText('Unranked')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBe(2);
  });

  it('throws on a query error so the error boundary can catch it', async () => {
    state.era = { data: null, error: { message: 'statement timeout' } };
    await expect(DartUpWidget({ userId: 'u1' })).rejects.toThrow(/statement timeout/);
  });
});

describe('WidgetErrorBoundary isolation', () => {
  it('shows a localized Retry fallback without affecting siblings', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Boom(): React.ReactElement {
      throw new Error('statement timeout');
    }
    render(
      <div>
        <WidgetErrorBoundary gameName="Dart Up!">
          <Boom />
        </WidgetErrorBoundary>
        <div>sibling widget</div>
      </div>
    );
    expect(screen.getByText('Dart Up! is currently unavailable.')).toBeTruthy();
    expect(screen.getByText('sibling widget')).toBeTruthy();
    expect(screen.getByText('Retry Connection')).toBeTruthy();
    fireEvent.click(screen.getByText('Retry Connection'));
  });
});
