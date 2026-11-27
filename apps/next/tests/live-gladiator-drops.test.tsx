import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  calculateCreatorRevenueSplit,
  executeCreatorSplitTransaction,
} from '../lib/live/gladiatorDropsService';
import { GladiatorDropsPanel } from '../components/live/GladiatorDropsPanel';
import { GET as gladiatorDropGet, POST as gladiatorDropPost } from '../app/api/live/gladiator-drop/route';
import { NextRequest } from 'next/server';

const { mockGetUserFromToken, mockServiceClient } = vi.hoisted(() => ({
  mockGetUserFromToken: vi.fn(),
  mockServiceClient: vi.fn(),
}));

vi.mock('../lib/supabase-server', () => ({
  getUserFromToken: mockGetUserFromToken,
  createServiceClient: mockServiceClient,
}));

function buildMockWalletDb(initialSenderBalance = 1000, initialCreatorBalance = 200) {
  const balances: Record<string, number> = {
    'sender-1': initialSenderBalance,
    'creator-1': initialCreatorBalance,
  };
  const ledgerRows: any[] = [];
  const cheerRows: any[] = [];

  const client: any = {
    from: vi.fn((table: string) => {
      if (table === 'hub_tokens_ledger') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          contains: vi.fn().mockReturnThis(),
          limit: vi.fn().mockImplementation(() =>
            Promise.resolve({ data: [], error: null })
          ),
          insert: vi.fn((rows: any) => {
            ledgerRows.push(...(Array.isArray(rows) ? rows : [rows]));
            return Promise.resolve({ error: null });
          }),
        };
      }
      if (table === 'user_token_wallets') {
        let targetUser = '';
        let expectedBal: number | null = null;
        let pendingUpdate: any = null;
        const q: any = {
          select: vi.fn().mockReturnThis(),
          update: vi.fn((payload: any) => {
            pendingUpdate = payload;
            return q;
          }),
          insert: vi.fn((payload: any) => {
            balances[payload.user_id] = payload.utility_balance;
            return Promise.resolve({ error: null });
          }),
          eq: vi.fn((col: string, val: any) => {
            if (col === 'user_id') targetUser = val;
            if (col === 'utility_balance') expectedBal = val;
            return q;
          }),
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: targetUser in balances ? { utility_balance: balances[targetUser] } : null,
              error: null,
            })
          ),
          then: (resolve: any) => {
            if (pendingUpdate) {
              if (expectedBal !== null && balances[targetUser] !== expectedBal) {
                return Promise.resolve({ data: [], error: null }).then(resolve);
              }
              balances[targetUser] = pendingUpdate.utility_balance;
              return Promise.resolve({
                data: [{ utility_balance: balances[targetUser] }],
                error: null,
              }).then(resolve);
            }
            return Promise.resolve({ data: null, error: null }).then(resolve);
          },
        };
        return q;
      }
      return {};
    }),
    schema: vi.fn(() => ({
      from: vi.fn(() => ({
        insert: vi.fn((row: any) => {
          cheerRows.push(row);
          return Promise.resolve({ error: null });
        }),
      })),
    })),
    _balances: balances,
    _ledgerRows: ledgerRows,
    _cheerRows: cheerRows,
  };

  return client;
}

describe('TASK-LIVE-GLADIATOR-DROPS: Audience Gladiator Drops & 95/5 Creator Split', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes exact integer 95/5 creator/platform split without rounding drift', () => {
    const s100 = calculateCreatorRevenueSplit(100);
    expect(s100.creatorShareTokens).toBe(95);
    expect(s100.platformShareTokens).toBe(5);
    expect(s100.creatorShareTokens + s100.platformShareTokens).toBe(100);

    const s50 = calculateCreatorRevenueSplit(50);
    expect(s50.creatorShareTokens).toBe(48);
    expect(s50.platformShareTokens).toBe(2);
    expect(s50.creatorShareTokens + s50.platformShareTokens).toBe(50);
  });

  it('executes closed-loop utility split transfer and records 95% creator payout + cheer row', async () => {
    const db = buildMockWalletDb(1000, 200);

    const res = await executeCreatorSplitTransaction({
      senderId: 'sender-1',
      senderName: 'Viewer One',
      creatorId: 'creator-1',
      creatorName: 'Nova Pilot',
      actionType: 'gladiator_drop',
      grossTokens: 100,
      dropId: 'warp-overdrive',
      matchId: '11111111-1111-4111-8111-111111111111',
      idempotencyKey: 'drop-key-1',
      supabaseClient: db,
    });

    expect(res.success).toBe(true);
    expect(res.split.creatorShareTokens).toBe(95);
    expect(res.split.platformShareTokens).toBe(5);
    expect(res.senderRemainingBalance).toBe(900);
    expect(db._balances['sender-1']).toBe(900);
    expect(db._balances['creator-1']).toBe(295);
    expect(db._ledgerRows).toHaveLength(2);
    expect(db._ledgerRows[0].token_class).toBe('utility_token');
    expect(db._ledgerRows[1].transaction_type).toBe('LIVE_CREATOR_PAYOUT_95PCT');
    expect(db._cheerRows).toHaveLength(1);
    expect(res.hudTrigger.message).toContain('Warp Overdrive');
    expect(res.hudTrigger.effectCode).toBe('DRAMA_SPIKE_MULTIPLIER');
  });

  it('blocks noncanonical case-variant self-payments and rolls back wallets on ledger failure', async () => {
    const db = buildMockWalletDb(1000, 200);
    await expect(
      executeCreatorSplitTransaction({
        senderId: 'sender-1',
        senderName: 'Viewer',
        creatorId: '  SENDER-1 ',
        creatorName: 'Viewer',
        actionType: 'creator_cheer',
        grossTokens: 100,
        idempotencyKey: 'self-key',
        supabaseClient: db,
      })
    ).rejects.toThrow(/themselves/i);

    // Force ledger insert failure and verify both sender and creator balances roll back
    const origFrom = db.from;
    db.from = vi.fn((table: string) => {
      if (table === 'hub_tokens_ledger') {
        const base = origFrom(table);
        return {
          ...base,
          insert: vi.fn().mockResolvedValue({ error: { message: 'ledger write failed' } }),
        };
      }
      return origFrom(table);
    });

    await expect(
      executeCreatorSplitTransaction({
        senderId: 'sender-1',
        senderName: 'Viewer',
        creatorId: 'creator-1',
        creatorName: 'Nova Pilot',
        actionType: 'creator_cheer',
        grossTokens: 100,
        idempotencyKey: 'rollback-key',
        supabaseClient: db,
      })
    ).rejects.toThrow(/ledger write failed/);

    expect(db._balances['sender-1']).toBe(1000);
    expect(db._balances['creator-1']).toBe(200);
  });

  it('verifies transaction receipt via GET /api/live/gladiator-drop', async () => {
    mockServiceClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{ id: 'row-1' }], error: null }),
      })),
    });
    const req = new NextRequest('http://localhost/api/live/gladiator-drop?txKey=drop-key-1');
    const res = await gladiatorDropGet(req);
    const json = await res.json();
    expect(json.verified).toBe(true);
  });

  it('rejects unauthenticated requests on POST /api/live/gladiator-drop', async () => {
    const req = new NextRequest('http://localhost/api/live/gladiator-drop', {
      method: 'POST',
      body: JSON.stringify({
        creatorId: 'creator-1',
        actionType: 'creator_cheer',
        grossTokens: 100,
        idempotencyKey: 'k-1',
      }),
    });

    const response = await gladiatorDropPost(req);
    expect(response.status).toBe(401);
  });

  it('triggers Gladiator Drop from panel and invokes onHudTrigger with updated balance', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        split: { grossTokens: 100, creatorShareTokens: 95, platformShareTokens: 5 },
        senderRemainingBalance: 400,
        hudTrigger: {
          id: 'hud_1',
          kind: 'gladiator_drop',
          message: '⚡ GLADIATOR DROP: Citizen → ⚡ Warp Overdrive for Nova Pilot (95 HT to creator / 95-5 split)',
          grossTokens: 100,
          creatorShareTokens: 95,
          platformShareTokens: 5,
          createdAt: '2026-11-27T12:00:00Z',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const onHudTrigger = vi.fn();
    render(
      <GladiatorDropsPanel
        creatorId="creator-1"
        creatorName="Nova Pilot"
        viewerUserId="viewer-1"
        viewerBalance={500}
        authAccessToken="jwt-token-123"
        hudHistory={[]}
        onHudTrigger={onHudTrigger}
      />
    );

    expect(screen.getByTestId('gladiator-feed-empty')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('trigger-drop-warp-overdrive'));

    await waitFor(() => {
      expect(onHudTrigger).toHaveBeenCalledWith(
        expect.objectContaining({ creatorShareTokens: 95 }),
        400
      );
    });
    expect(screen.getByTestId('gladiator-success')).toHaveTextContent('95 HT credited to Nova Pilot (95%)');

    vi.unstubAllGlobals();
  });
});
