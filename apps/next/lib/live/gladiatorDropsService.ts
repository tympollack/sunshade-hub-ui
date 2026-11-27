import type { LiveHudTriggerEvent } from './useLiveReactionSync';

export const CREATOR_SPLIT_RATE = 0.95;
export const PLATFORM_SPLIT_RATE = 0.05;

export type LiveContributionType = 'gladiator_drop' | 'creator_cheer' | 'creator_sub';

export interface GladiatorDropDefinition {
  id: string;
  name: string;
  description: string;
  costTokens: number;
  effectCode: string;
  cooldownSec: number;
  badgeEmoji: string;
}

export interface CreatorSubTierDefinition {
  id: string;
  name: string;
  costTokens: number;
  perks: string;
}

export interface RevenueSplitBreakdown {
  grossTokens: number;
  creatorShareTokens: number;
  platformShareTokens: number;
  creatorPercent: 95;
  platformPercent: 5;
}

export const GLADIATOR_DROP_CATALOG: GladiatorDropDefinition[] = [
  {
    id: 'shield-surge',
    name: 'Shield Surge',
    description: 'Boosts arena hull telemetry shield +15% during live run.',
    costTokens: 50,
    effectCode: 'HULL_SHIELD_BOOST',
    cooldownSec: 15,
    badgeEmoji: '🛡️',
  },
  {
    id: 'warp-overdrive',
    name: 'Warp Overdrive',
    description: 'Triggers a Drama Index surge pulse on the WebGL stage.',
    costTokens: 100,
    effectCode: 'DRAMA_SPIKE_MULTIPLIER',
    cooldownSec: 30,
    badgeEmoji: '⚡',
  },
  {
    id: 'miracle-boost',
    name: 'Miracle Boost',
    description: 'Arms a clutch crowd-rally banner for the next blind skill-check.',
    costTokens: 250,
    effectCode: 'SUBSEED_LUCK_BOOST',
    cooldownSec: 45,
    badgeEmoji: '🔥',
  },
  {
    id: 'gladiator-supply',
    name: 'Gladiator Supply Drop',
    description: 'Full arena telemetry drop + priority highlight stamp.',
    costTokens: 500,
    effectCode: 'FULL_ARENA_SUPPLY',
    cooldownSec: 60,
    badgeEmoji: '👑',
  },
];

export const CREATOR_SUB_TIERS: CreatorSubTierDefinition[] = [
  {
    id: 'sub-tier-1',
    name: 'Citizen Sub • Tier 1',
    costTokens: 500,
    perks: '95% direct creator payout + live badge',
  },
  {
    id: 'sub-tier-2',
    name: 'Vanguard Sub • Tier 2',
    costTokens: 1000,
    perks: '95% direct creator payout + priority reaction cues',
  },
  {
    id: 'sub-tier-3',
    name: 'Founder Sub • Tier 3',
    costTokens: 2500,
    perks: '95% direct creator payout + Miracle Seed shoutout',
  },
];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function calculateCreatorRevenueSplit(grossTokens: number): RevenueSplitBreakdown {
  if (!Number.isFinite(grossTokens) || !Number.isInteger(grossTokens) || grossTokens <= 0) {
    throw new Error('Gross token amount must be a positive integer.');
  }

  const creatorShareTokens = Math.round(grossTokens * CREATOR_SPLIT_RATE);
  const platformShareTokens = grossTokens - creatorShareTokens;

  return {
    grossTokens,
    creatorShareTokens,
    platformShareTokens,
    creatorPercent: 95,
    platformPercent: 5,
  };
}

export function buildHudTriggerEvent(params: {
  id: string;
  actionType: LiveContributionType;
  senderName: string;
  creatorName: string;
  label: string;
  split: RevenueSplitBreakdown;
}): LiveHudTriggerEvent {
  const { id, actionType, senderName, creatorName, label, split } = params;
  const prefix =
    actionType === 'creator_sub'
      ? '👑 NEW SUB'
      : actionType === 'gladiator_drop'
      ? '⚡ GLADIATOR DROP'
      : '🔥 CHEER';

  return {
    id,
    kind: actionType,
    message: `${prefix}: ${senderName} → ${label} for ${creatorName} (${split.creatorShareTokens} HT to creator / 95-5 split)`,
    grossTokens: split.grossTokens,
    creatorShareTokens: split.creatorShareTokens,
    platformShareTokens: split.platformShareTokens,
    createdAt: new Date().toISOString(),
  };
}

export async function executeCreatorSplitTransaction(params: {
  senderId: string;
  senderName: string;
  creatorId: string;
  creatorName: string;
  actionType: LiveContributionType;
  grossTokens: number;
  idempotencyKey: string;
  dropId?: string;
  matchId?: string;
  supabaseClient: any;
}): Promise<{
  success: true;
  idempotentReplay: boolean;
  split: RevenueSplitBreakdown;
  senderRemainingBalance: number;
  hudTrigger: LiveHudTriggerEvent;
}> {
  const {
    senderId,
    senderName,
    creatorId,
    creatorName,
    actionType,
    grossTokens,
    idempotencyKey,
    dropId,
    matchId,
    supabaseClient,
  } = params;

  if (!senderId || !creatorId) {
    throw new Error('Both senderId and creatorId are required.');
  }
  if (senderId === creatorId) {
    throw new Error('Creators cannot send Gladiator Drops or cheers to themselves.');
  }
  if (!idempotencyKey || !idempotencyKey.trim()) {
    throw new Error('idempotencyKey is required.');
  }

  let effectiveTokens = grossTokens;
  let itemLabel = actionType === 'creator_sub' ? 'Creator Subscription' : 'Audience Cheer';

  if (actionType === 'gladiator_drop') {
    const drop = GLADIATOR_DROP_CATALOG.find((d) => d.id === dropId);
    if (!drop) {
      throw new Error(`Unknown Gladiator Drop "${dropId ?? ''}".`);
    }
    effectiveTokens = drop.costTokens;
    itemLabel = `${drop.badgeEmoji} ${drop.name}`;
  } else if (actionType === 'creator_sub') {
    const tier = CREATOR_SUB_TIERS.find((t) => t.id === dropId);
    if (tier) {
      effectiveTokens = tier.costTokens;
      itemLabel = tier.name;
    }
  }

  const split = calculateCreatorRevenueSplit(effectiveTokens);
  const cleanKey = idempotencyKey.trim();

  // Check idempotency via existing hub_tokens_ledger metadata key when available
  const { data: existingLedger, error: existingErr } = await supabaseClient
    .from('hub_tokens_ledger')
    .select('id, metadata')
    .eq('user_id', senderId)
    .contains('metadata', { idempotency_key: cleanKey })
    .limit(1);

  if (existingErr) {
    throw new Error(`Failed to verify transaction idempotency: ${existingErr.message}`);
  }

  if (Array.isArray(existingLedger) && existingLedger.length > 0) {
    const { data: walletNow } = await supabaseClient
      .from('user_token_wallets')
      .select('utility_balance')
      .eq('user_id', senderId)
      .maybeSingle();

    return {
      success: true,
      idempotentReplay: true,
      split,
      senderRemainingBalance: Number(walletNow?.utility_balance ?? 0),
      hudTrigger: buildHudTriggerEvent({
        id: String(existingLedger[0].id),
        actionType,
        senderName,
        creatorName,
        label: itemLabel,
        split,
      }),
    };
  }

  // 1. Verify sender closed-loop utility_balance (never touch work_rebate_token)
  const { data: senderWallet, error: senderWalletErr } = await supabaseClient
    .from('user_token_wallets')
    .select('utility_balance')
    .eq('user_id', senderId)
    .maybeSingle();

  if (senderWalletErr) {
    throw new Error(`Failed to fetch sender utility wallet: ${senderWalletErr.message}`);
  }

  const senderBalance = Number(senderWallet?.utility_balance ?? 0);
  if (senderBalance < split.grossTokens) {
    throw new Error(
      `Insufficient utility balance. Available: ${senderBalance} HT, Required: ${split.grossTokens} HT.`
    );
  }

  const nextSenderBalance = senderBalance - split.grossTokens;
  const nowIso = new Date().toISOString();

  // 2. Optimistically debit sender utility_balance
  const { data: debitedRows, error: debitErr } = await supabaseClient
    .from('user_token_wallets')
    .update({ utility_balance: nextSenderBalance, updated_at: nowIso })
    .eq('user_id', senderId)
    .eq('utility_balance', senderBalance)
    .select('utility_balance');

  if (debitErr) {
    throw new Error(`Failed to debit sender utility wallet: ${debitErr.message}`);
  }
  if (Array.isArray(debitedRows) && debitedRows.length === 0) {
    throw new Error('Concurrent wallet update detected; please retry.');
  }

  // 3. Credit creator 95% share into creator utility_balance
  const { data: creatorWallet, error: creatorWalletErr } = await supabaseClient
    .from('user_token_wallets')
    .select('utility_balance')
    .eq('user_id', creatorId)
    .maybeSingle();

  if (creatorWalletErr) {
    await supabaseClient
      .from('user_token_wallets')
      .update({ utility_balance: senderBalance, updated_at: nowIso })
      .eq('user_id', senderId)
      .eq('utility_balance', nextSenderBalance);
    throw new Error(`Failed to fetch creator wallet: ${creatorWalletErr.message}`);
  }

  const creatorPrev = Number(creatorWallet?.utility_balance ?? 0);
  const creatorNext = creatorPrev + split.creatorShareTokens;

  const creatorUpdateRes = creatorWallet
    ? await supabaseClient
        .from('user_token_wallets')
        .update({ utility_balance: creatorNext, updated_at: nowIso })
        .eq('user_id', creatorId)
    : await supabaseClient
        .from('user_token_wallets')
        .insert({ user_id: creatorId, utility_balance: creatorNext, updated_at: nowIso });

  if (creatorUpdateRes?.error) {
    await supabaseClient
      .from('user_token_wallets')
      .update({ utility_balance: senderBalance, updated_at: nowIso })
      .eq('user_id', senderId)
      .eq('utility_balance', nextSenderBalance);
    throw new Error(`Failed to credit creator share: ${creatorUpdateRes.error.message}`);
  }

  // 4. Append-only hub_tokens_ledger records for sender debit + creator 95% credit
  const txTypeMap: Record<LiveContributionType, string> = {
    gladiator_drop: 'LIVE_GLADIATOR_DROP',
    creator_cheer: 'LIVE_CREATOR_CHEER',
    creator_sub: 'LIVE_CREATOR_SUB',
  };

  const { error: ledgerErr } = await supabaseClient.from('hub_tokens_ledger').insert([
    {
      user_id: senderId,
      token_class: 'utility_token',
      transaction_type: txTypeMap[actionType],
      amount: -split.grossTokens,
      description: `${itemLabel} sent to ${creatorName}`,
      metadata: {
        idempotency_key: cleanKey,
        creator_id: creatorId,
        drop_id: dropId ?? null,
        split_ratio: '95/5',
        creator_share_tokens: split.creatorShareTokens,
        platform_share_tokens: split.platformShareTokens,
      },
      created_at: nowIso,
    },
    {
      user_id: creatorId,
      token_class: 'utility_token',
      transaction_type: 'LIVE_CREATOR_PAYOUT_95PCT',
      amount: split.creatorShareTokens,
      description: `95% Live Payout (${itemLabel}) from ${senderName}`,
      metadata: {
        idempotency_key: `${cleanKey}:creator`,
        sender_id: senderId,
        gross_tokens: split.grossTokens,
        platform_fee_tokens: split.platformShareTokens,
      },
      created_at: nowIso,
    },
  ]);

  if (ledgerErr) {
    throw new Error(`Failed to record split ledger entries: ${ledgerErr.message}`);
  }

  // 5. Persist into hub.cheer_transactions when matchId is a valid UUID
  if (matchId && UUID_REGEX.test(matchId) && typeof supabaseClient.schema === 'function') {
    const { error: cheerErr } = await supabaseClient
      .schema('hub')
      .from('cheer_transactions')
      .insert({
        sender_id: senderId,
        pilot_id: creatorId,
        match_id: matchId,
        amount: split.grossTokens,
        idempotency_key: cleanKey,
      });
    if (cheerErr && !cheerErr.message?.includes('duplicate')) {
      throw new Error(`Failed to persist cheer transaction: ${cheerErr.message}`);
    }
  }

  return {
    success: true,
    idempotentReplay: false,
    split,
    senderRemainingBalance: nextSenderBalance,
    hudTrigger: buildHudTriggerEvent({
      id: `hud_${cleanKey}`,
      actionType,
      senderName,
      creatorName,
      label: itemLabel,
      split,
    }),
  };
}
