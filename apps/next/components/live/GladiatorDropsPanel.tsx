'use client';

import React, { useMemo, useState } from 'react';
import { Zap, Crown, Flame, ShieldCheck } from 'lucide-react';
import { AtmosphericBadge, PrimaryButton } from '@digitalcanopy/ui';
import {
  CREATOR_SUB_TIERS,
  GLADIATOR_DROP_CATALOG,
  calculateCreatorRevenueSplit,
  type LiveContributionType,
} from '../../lib/live/gladiatorDropsService';
import type { LiveHudTriggerEvent } from '../../lib/live/useLiveReactionSync';

export interface GladiatorDropsPanelProps {
  creatorId: string | null;
  creatorName: string;
  viewerUserId: string | null;
  viewerBalance: number;
  activeMatchId?: string;
  authAccessToken?: string | null;
  hudHistory: LiveHudTriggerEvent[];
  onHudTrigger: (trigger: LiveHudTriggerEvent, newSenderBalance?: number) => void;
}

const CHEER_AMOUNTS = [25, 100, 500] as const;

export function GladiatorDropsPanel({
  creatorId,
  creatorName,
  viewerUserId,
  viewerBalance,
  activeMatchId,
  authAccessToken,
  hudHistory,
  onHudTrigger,
}: GladiatorDropsPanelProps) {
  const [activeTab, setActiveTab] = useState<'drops' | 'cheer' | 'sub'>('drops');
  const [cheerAmount, setCheerAmount] = useState<number>(100);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const previewSplit = useMemo(() => {
    try {
      return calculateCreatorRevenueSplit(cheerAmount);
    } catch {
      return { creatorShareTokens: 0, platformShareTokens: 0, grossTokens: 0 };
    }
  }, [cheerAmount]);

  const sendContribution = async (
    actionType: LiveContributionType,
    grossTokens: number,
    dropId?: string
  ) => {
    setErrorMsg(null);
    setStatusMsg(null);

    if (!creatorId) {
      setErrorMsg('This channel does not have a registered creator wallet yet.');
      return;
    }
    if (!viewerUserId || !authAccessToken) {
      setErrorMsg('Sign in to your Hub Citizen account to send Gladiator Drops or subscribe.');
      return;
    }
    if (viewerUserId === creatorId) {
      setErrorMsg('Creators cannot send drops or cheers to their own channel.');
      return;
    }

    setIsSending(true);
    try {
      const idempotencyKey = `live_${actionType}_${dropId || grossTokens}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;

      const res = await fetch('/api/live/gladiator-drop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authAccessToken}`,
        },
        body: JSON.stringify({
          creatorId,
          creatorName,
          actionType,
          grossTokens,
          dropId,
          matchId: activeMatchId,
          idempotencyKey,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Transaction failed.');
      }

      setStatusMsg(
        `Sent! ${data.split.creatorShareTokens} HT credited to ${creatorName} (95%) • ${data.split.platformShareTokens} HT Hub fee (5%).`
      );
      onHudTrigger(data.hudTrigger, data.senderRemainingBalance);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to send Gladiator Drop.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      data-testid="gladiator-drops-panel"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Gladiator Drops & 95/5 Split
          </h3>
        </div>
        <AtmosphericBadge label="95% Creator / 5% Hub" variant="success" size="sm" />
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
        {[
          { id: 'drops', label: 'Drops' },
          { id: 'cheer', label: 'Cheer' },
          { id: 'sub', label: 'Subscribe' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-testid={`gladiator-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === tab.id
                ? 'bg-orange-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'drops' && (
        <div className="space-y-2">
          {GLADIATOR_DROP_CATALOG.map((drop) => {
            const split = calculateCreatorRevenueSplit(drop.costTokens);
            return (
              <div
                key={drop.id}
                data-testid={`gladiator-drop-card-${drop.id}`}
                className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">
                    {`${drop.badgeEmoji} ${drop.name}`}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{drop.description}</p>
                  <p className="text-[10px] font-mono text-emerald-400 mt-1">
                    {`${split.creatorShareTokens} HT Creator (95%) • ${split.platformShareTokens} HT Hub`}
                  </p>
                </div>
                <PrimaryButton
                  testID={`trigger-drop-${drop.id}`}
                  variant="sunshade"
                  size="sm"
                  disabled={isSending}
                  onPress={() => sendContribution('gladiator_drop', drop.costTokens, drop.id)}
                  label={`${drop.costTokens} HT`}
                />
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'cheer' && (
        <div className="space-y-3 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
          <div className="flex items-center gap-2">
            {CHEER_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                data-testid={`cheer-preset-${amt}`}
                onClick={() => setCheerAmount(amt)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold border ${
                  cheerAmount === amt
                    ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                {`${amt} HT`}
              </button>
            ))}
          </div>
          <p data-testid="cheer-split-preview" className="text-[11px] font-mono text-emerald-400">
            {`Creator receives ${previewSplit.creatorShareTokens} HT (95%) • Hub fee ${previewSplit.platformShareTokens} HT (5%)`}
          </p>
          <PrimaryButton
            testID="send-cheer-btn"
            variant="cozy"
            size="sm"
            isLoading={isSending}
            onPress={() => sendContribution('creator_cheer', cheerAmount)}
            icon={<Flame className="w-3.5 h-3.5" />}
            label={`Send ${cheerAmount} HT Cheer`}
            className="w-full"
          />
        </div>
      )}

      {activeTab === 'sub' && (
        <div className="space-y-2">
          {CREATOR_SUB_TIERS.map((tier) => {
            const split = calculateCreatorRevenueSplit(tier.costTokens);
            return (
              <div
                key={tier.id}
                className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>{tier.name}</span>
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{tier.perks}</p>
                  <p className="text-[10px] font-mono text-emerald-400 mt-1">
                    {`${split.creatorShareTokens} HT Creator (95%) • ${split.platformShareTokens} HT Hub`}
                  </p>
                </div>
                <PrimaryButton
                  testID={`subscribe-tier-${tier.id}`}
                  variant="sunshade"
                  size="sm"
                  disabled={isSending}
                  onPress={() => sendContribution('creator_sub', tier.costTokens, tier.id)}
                  label={`${tier.costTokens} HT`}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          Closed-Loop Utility Firewall
        </span>
        <span>{`Wallet: ${viewerBalance.toLocaleString()} HT`}</span>
      </div>

      {errorMsg && (
        <div data-testid="gladiator-error" className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          {errorMsg}
        </div>
      )}
      {statusMsg && (
        <div data-testid="gladiator-success" className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
          {statusMsg}
        </div>
      )}

      {/* Live HUD Trigger Feed */}
      <div className="pt-2 border-t border-zinc-800 space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Live HUD Trigger Feed ({hudHistory.length})
        </p>
        {hudHistory.length === 0 ? (
          <p data-testid="gladiator-feed-empty" className="text-[11px] text-zinc-500">
            No Gladiator Drops or cheers triggered in this session yet.
          </p>
        ) : (
          <div data-testid="gladiator-feed-list" className="space-y-1 max-h-36 overflow-y-auto">
            {hudHistory.map((item) => (
              <div
                key={item.id}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-200"
              >
                {item.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
