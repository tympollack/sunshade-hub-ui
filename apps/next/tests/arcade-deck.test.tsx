import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HubArcadeDeck } from '../app/dashboard/components/arcade/HubArcadeDeck';
import { DEFAULT_ARCADE_CARTRIDGES, mergeCartridgeCatalog } from '../lib/arcade/cartridges';
import { ArcadeCabinetRuntime } from '../lib/arcade/arcadeSessionService';

describe('HubArcadeDeck & Unlocked Cabinet Launcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('boots an unlocked cabinet instantly and pulls a spoiler-free roll preview', async () => {
    render(<HubArcadeDeck userId="player-1" utilityBalance={250} />);

    fireEvent.click(screen.getByTestId('launch-cabinet-dart-up-skirmish'));

    await waitFor(() => {
      expect(screen.getByTestId('arcade-cabinet-stage')).toBeInTheDocument();
    });
    expect(screen.getByTestId('cabinet-pulls')).toHaveTextContent('0 / 15');

    fireEvent.click(screen.getByTestId('pull-deterministic-roll-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('pending-roll-preview')).toBeInTheDocument();
    });
    expect(screen.getByText(/Roll #0 Ready/i)).toBeInTheDocument();
    expect(screen.getByTestId('cabinet-pulls')).toHaveTextContent('1 / 15');
  });

  it('supports banking a roll into the Bonus Stub Vault and idempotently claiming it', async () => {
    render(<HubArcadeDeck userId="player-1" utilityBalance={250} />);

    fireEvent.click(screen.getByTestId('launch-cabinet-smuggler-run'));
    await waitFor(() => expect(screen.getByTestId('arcade-cabinet-stage')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('pull-deterministic-roll-btn'));
    await waitFor(() => expect(screen.getByTestId('bank-stub-btn')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('bank-stub-btn'));
    await waitFor(() => expect(screen.getByTestId('stub-vault-tray')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('claim-stub-0'));
    await waitFor(() => {
      expect(screen.getByTestId('cabinet-result-banner')).toHaveTextContent(/Vaulted Stub #0 claimed/i);
    });
    expect(screen.queryByTestId('stub-vault-tray')).not.toBeInTheDocument();
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

  it('runtime pulls strip spoilers and enforce bounded chapter off-ramps', async () => {
    const baseCartridge = { ...DEFAULT_ARCADE_CARTRIDGES[0], pullsPerChapter: 2 };
    const runtime = new ArcadeCabinetRuntime({
      cartridge: baseCartridge,
      playerId: 'player-test',
      matchId: 'match-bounded-1',
      rootSeed: 'deterministic-root-seed',
    });

    const preview = await runtime.pullNextRoll();
    expect(preview.index).toBe(0);
    expect(preview.commitmentHash).toMatch(/^[0-9a-f]{64}$/);
    expect((preview as any).isHighStakes).toBeUndefined();
    expect((preview as any).candidateSubSeeds).toBeUndefined();

    await runtime.submitBlindSkillCheck({
      rollIndex: 0,
      minigameId: 'precision-pulse',
      rawScore: 95,
      maxScore: 100,
      clientSignature: 'sig-0',
      submittedAt: new Date().toISOString(),
    });

    await runtime.pullNextRoll();
    await runtime.submitBlindSkillCheck({
      rollIndex: 1,
      minigameId: 'precision-pulse',
      rawScore: 90,
      maxScore: 100,
      clientSignature: 'sig-1',
      submittedAt: new Date().toISOString(),
    });

    const snap = await runtime.getSnapshot();
    expect(snap.isChapterComplete).toBe(true);
    expect(snap.pullsRemaining).toBe(0);
    expect(snap.salvageSummary).not.toBeNull();
  });
});
