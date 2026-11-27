import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HubArcadeDeck } from '../app/dashboard/components/arcade/HubArcadeDeck';
import { DEFAULT_ARCADE_CARTRIDGES, mergeCartridgeCatalog } from '../lib/arcade/cartridges';
import { ArcadeCabinetRuntime } from '../lib/arcade/arcadeSessionService';
import DashboardClient from '../app/dashboard/DashboardClient';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@digitalcanopy/supabase', () => {
  const emptyChain = () => {
    const q: any = {};
    for (const m of ['select', 'eq', 'order', 'limit']) q[m] = () => q;
    q.then = (res: any, rej: any) => Promise.resolve({ data: [], error: null }).then(res, rej);
    return q;
  };
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      },
      from: vi.fn(() => emptyChain()),
      schema: vi.fn(() => ({ from: vi.fn(() => emptyChain()) })),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
        track: vi.fn(),
      })),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock('@digitalcanopy/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@digitalcanopy/ui')>();
  return {
    ...actual,
    AuthGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe('HubArcadeDeck & Unlocked Cabinet Launcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/dashboard');
  });

  it('renders all 4 unlocked instant-load cabinets immediately', () => {
    render(<HubArcadeDeck userId="player-1" utilityBalance={250} />);

    expect(screen.getByTestId('hub-arcade-deck')).toBeInTheDocument();
    expect(screen.getByTestId('arcade-cabinet-card-dart-up-skirmish')).toBeInTheDocument();
    expect(screen.getByTestId('arcade-cabinet-card-smuggler-run')).toBeInTheDocument();
    expect(screen.getByTestId('arcade-cabinet-card-puk-huk-blitz')).toBeInTheDocument();
    expect(screen.getByTestId('arcade-cabinet-card-second-wind-hold')).toBeInTheDocument();
    expect(screen.getByText(/4 Unlocked Cabinets/i)).toBeInTheDocument();
  });

  it('filters cabinets by genre pill', () => {
    render(<HubArcadeDeck userId="player-1" utilityBalance={250} />);

    fireEvent.click(screen.getByRole('button', { name: 'smuggler' }));
    expect(screen.getByTestId('arcade-cabinet-card-smuggler-run')).toBeInTheDocument();
    expect(screen.queryByTestId('arcade-cabinet-card-dart-up-skirmish')).not.toBeInTheDocument();
  });

  it('keeps BlindSkillCheckOverlay reveal mounted after submission until Continue Cabinet is clicked', async () => {
    render(<HubArcadeDeck userId="player-1" utilityBalance={250} />);

    fireEvent.click(screen.getByTestId('launch-cabinet-dart-up-skirmish'));
    await waitFor(() => expect(screen.getByTestId('arcade-cabinet-stage')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('pull-deterministic-roll-btn'));
    await waitFor(() => expect(screen.getByTestId('blind-skill-check-modal')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('tactile-action-btn'));
    await waitFor(() => expect(screen.getByTestId('blind-skill-check-reveal')).toBeInTheDocument());

    // Reveal must remain open until explicit Continue Cabinet
    expect(screen.getByTestId('close-skill-reveal-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('close-skill-reveal-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('blind-skill-check-modal')).not.toBeInTheDocument();
    });
  });

  it('supports banking a roll into the Bonus Stub Vault and idempotently claiming it', async () => {
    render(<HubArcadeDeck userId="player-1" utilityBalance={250} />);

    fireEvent.click(screen.getByTestId('launch-cabinet-smuggler-run'));
    await waitFor(() => expect(screen.getByTestId('arcade-cabinet-stage')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('pull-deterministic-roll-btn'));
    await waitFor(() => expect(screen.getByTestId('overlay-bank-stub-btn')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('overlay-bank-stub-btn'));
    await waitFor(() => expect(screen.getByTestId('stub-vault-tray')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('claim-stub-0'));
    await waitFor(() => {
      expect(screen.getByTestId('cabinet-result-banner')).toHaveTextContent(/Vaulted Stub #0 claimed/i);
    });
    expect(screen.queryByTestId('stub-vault-tray')).not.toBeInTheDocument();
  });

  it('launches a Miracle Seed without rebooting on pulls and exits cleanly', async () => {
    const seed = {
      matchId: 'miracle-match-9',
      rootSeed: 'miracle-root-9',
      cartridgeId: 'smuggler-run',
      checkpointRollIndex: 4,
      boardSnapshot: {
        scoreAtCheckpoint: 320,
        winProbabilityAtCheckpoint: 0.09,
        hullIntegrity: 5,
        contrabandHoldCount: 2,
      },
      targetScoreToBeat: 1200,
    };

    render(<HubArcadeDeck userId="player-1" utilityBalance={250} activeMiracleSeed={seed} />);

    await waitFor(() => expect(screen.getByTestId('arcade-cabinet-stage')).toBeInTheDocument());
    expect(screen.getByTestId('cabinet-score')).toHaveTextContent('320');
    expect(screen.getByText(/MIRACLE SEED CHALLENGE • TARGET 1,200/i)).toBeInTheDocument();

    // Pulling a roll must advance roll index (to 5) and NOT reboot the Miracle Seed runtime
    fireEvent.click(screen.getByTestId('pull-deterministic-roll-btn'));
    await waitFor(() => expect(screen.getByTestId('pending-roll-preview')).toBeInTheDocument());
    expect(screen.getByText(/Roll #5 Ready/i)).toBeInTheDocument();
    expect(screen.getByTestId('cabinet-pulls')).toHaveTextContent('1 / 15');

    // Exiting Miracle Seed clears the active challenge cabinet cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Exit Miracle Seed' }));
    await waitFor(() => {
      expect(screen.queryByTestId('arcade-cabinet-stage')).not.toBeInTheDocument();
    });
  });

  it('preserves arcade progress and banked stubs when switching between Overview and Arcade Deck', async () => {
    render(
      <DashboardClient
        profile={{
          id: 'u-1',
          display_name: 'Pilot',
          email: 'test@sunshade.icu',
          global_hub_tokens: 500,
          critterverse_elo: 1200,
          status: 'active',
        }}
        edgeNodes={[]}
        gameLibrary={[]}
        chessWidget={<div />}
        ecosystemWidget={<div />}
        featureFlags={{ arcade_deck: true }}
      />
    );

    fireEvent.click(screen.getByTestId('launch-cabinet-smuggler-run'));
    await waitFor(() => expect(screen.getByTestId('arcade-cabinet-stage')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('pull-deterministic-roll-btn'));
    await waitFor(() => expect(screen.getByTestId('overlay-bank-stub-btn')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('overlay-bank-stub-btn'));
    await waitFor(() => expect(screen.getByTestId('stub-vault-tray')).toBeInTheDocument());

    // Switch to Arcade Deck dedicated view and claim the stub banked in Overview
    const navButtons = screen.getAllByText('Arcade Deck');
    fireEvent.click(navButtons[0]);

    await waitFor(() => expect(screen.getByTestId('claim-stub-0')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('claim-stub-0'));
    await waitFor(() => {
      expect(screen.getByTestId('cabinet-result-banner')).toHaveTextContent(/Vaulted Stub #0 claimed/i);
    });
  });

  it('ignores ?view=arcade deep link when arcade_deck feature flag is disabled', () => {
    window.history.replaceState({}, '', '/dashboard?view=arcade');

    render(
      <DashboardClient
        profile={{
          id: 'u-1',
          display_name: 'Pilot',
          email: 'test@sunshade.icu',
          global_hub_tokens: 500,
          critterverse_elo: 1200,
          status: 'active',
        }}
        edgeNodes={[]}
        gameLibrary={[]}
        chessWidget={<div />}
        ecosystemWidget={<div />}
        featureFlags={{ arcade_deck: false }}
      />
    );

    expect(screen.queryByTestId('hub-arcade-deck')).not.toBeInTheDocument();
  });

  it('respects locked cartridge state from DB catalog unless explicitly unlocked', () => {
    const merged = mergeCartridgeCatalog(
      [
        {
          id: 'vault-exclusive',
          title: 'Vault Exclusive',
          genre: 'roguelike',
          is_unlocked_by_default: false,
          is_active: true,
        },
      ],
      new Set()
    );
    expect(merged[0].isUnlocked).toBe(false);

    const unlocked = mergeCartridgeCatalog(
      [
        {
          id: 'vault-exclusive',
          title: 'Vault Exclusive',
          genre: 'roguelike',
          is_unlocked_by_default: false,
          is_active: true,
        },
      ],
      new Set(['vault-exclusive'])
    );
    expect(unlocked[0].isUnlocked).toBe(true);
  });

  it('prevents double scoring on a final high-stakes pull and restores vault checkpoint state', async () => {
    const baseCartridge = { ...DEFAULT_ARCADE_CARTRIDGES[0], pullsPerChapter: 1 };
    const runtime = new ArcadeCabinetRuntime({
      cartridge: baseCartridge,
      playerId: 'player-test',
      matchId: 'match-final-hs',
      rootSeed: 'seed-final-hs',
    });

    const preview = await runtime.pullNextRoll();
    expect(preview.index).toBe(0);
    expect((preview as any).isHighStakes).toBeUndefined();

    // Even on final pull, active pending roll is NOT auto-vaulted before player acts
    let snap = await runtime.getSnapshot();
    expect(snap.activeStubs.length).toBe(0);

    await runtime.submitBlindSkillCheck({
      rollIndex: 0,
      minigameId: 'precision-pulse',
      rawScore: 95,
      maxScore: 100,
      clientSignature: 'sig-0',
      submittedAt: new Date().toISOString(),
    });

    snap = await runtime.getSnapshot();
    expect(snap.isChapterComplete).toBe(true);
    expect(snap.steps.length).toBe(1);
    expect(snap.activeStubs.length).toBe(0);

    // Also verify vault claim preserves full boardState for Miracle Seed checkpoints
    const runtime2 = new ArcadeCabinetRuntime({
      cartridge: { ...DEFAULT_ARCADE_CARTRIDGES[1], pullsPerChapter: 5 },
      playerId: 'player-test',
      matchId: 'match-vault-board',
      rootSeed: 'seed-vault-board',
    });
    await runtime2.pullNextRoll();
    const banked = await runtime2.bankPendingRollAsStub();
    await runtime2.claimVaultedStub(banked.stubId);
    const snap2 = await runtime2.getSnapshot();
    expect(snap2.steps[0].boardState).toEqual(
      expect.objectContaining({
        rollIndex: 0,
        hullIntegrity: 100,
        contrabandHoldCount: expect.any(Number),
      })
    );
  });
});
