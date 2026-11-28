'use client';

import React, { useEffect, useState } from 'react';
import {
  Share2,
  Calendar,
  Send,
  Clock,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { AtmosphericBadge, GlassCard, Modal } from '@digitalcanopy/ui';

export type SocialPlatform = 'bluesky' | 'linkedin' | 'x' | 'meta';

export interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  maxChars: number;
  badgeVariant: 'telemetry' | 'neutral' | 'core' | 'cozy';
}

export const PLATFORMS: Record<SocialPlatform, PlatformConfig> = {
  bluesky: {
    id: 'bluesky',
    name: 'Bluesky',
    maxChars: 300,
    badgeVariant: 'telemetry',
  },
  x: {
    id: 'x',
    name: 'X (Twitter)',
    maxChars: 280,
    badgeVariant: 'neutral',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    maxChars: 3000,
    badgeVariant: 'telemetry',
  },
  meta: {
    id: 'meta',
    name: 'Meta',
    maxChars: 63206,
    badgeVariant: 'cozy',
  },
};

export interface PlatformOverride {
  text: string;
  linkUrl?: string;
  enabled?: boolean;
}

export interface BroadcastPostData {
  id?: string;
  title: string;
  body: string;
  canonicalUrl: string;
  shortUrl?: string;
  mediaUrls?: string[];
  scheduledAt?: string | null;
  targetPlatforms?: SocialPlatform[];
}

export interface BroadcastPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  post: BroadcastPostData;
  onApproveAndQueue?: (data: {
    overrides: Record<SocialPlatform, PlatformOverride>;
    scheduledAt: string | null;
    enabledPlatforms: SocialPlatform[];
  }) => Promise<void> | void;
  onBroadcastImmediately?: (data: {
    overrides: Record<SocialPlatform, PlatformOverride>;
    enabledPlatforms: SocialPlatform[];
  }) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function BroadcastPreviewDrawer({
  isOpen,
  onClose,
  post,
  onApproveAndQueue,
  onBroadcastImmediately,
  isSubmitting = false,
}: BroadcastPreviewDrawerProps) {
  const platformKeys: SocialPlatform[] = ['bluesky', 'x', 'linkedin', 'meta'];

  const [activePlatform, setActivePlatform] = useState<SocialPlatform>('bluesky');
  const [scheduledAt, setScheduledAt] = useState<string>(post?.scheduledAt ?? '');
  const [overrides, setOverrides] = useState<Record<SocialPlatform, PlatformOverride>>(() => {
    const initial: Partial<Record<SocialPlatform, PlatformOverride>> = {};
    for (const p of platformKeys) {
      const isTarget = !post?.targetPlatforms || post.targetPlatforms.includes(p);
      initial[p] = {
        text: post?.body ?? '',
        linkUrl: post?.shortUrl || post?.canonicalUrl || '',
        enabled: isTarget,
      };
    }
    return initial as Record<SocialPlatform, PlatformOverride>;
  });

  // Re-sync overrides when post changes
  useEffect(() => {
    if (post) {
      setScheduledAt(post.scheduledAt ?? '');
      setOverrides(() => {
        const initial: Partial<Record<SocialPlatform, PlatformOverride>> = {};
        for (const p of platformKeys) {
          const isTarget = !post.targetPlatforms || post.targetPlatforms.includes(p);
          initial[p] = {
            text: post.body ?? '',
            linkUrl: post.shortUrl || post.canonicalUrl || '',
            enabled: isTarget,
          };
        }
        return initial as Record<SocialPlatform, PlatformOverride>;
      });
    }
  }, [post]);

  if (!post) return null;

  const currentPlatformConfig = PLATFORMS[activePlatform];
  const currentOverride = overrides[activePlatform] ?? { text: '', enabled: true };
  const currentLength = currentOverride.text.length;
  const isOverLimit = currentLength > currentPlatformConfig.maxChars;
  const isNearLimit = currentLength > currentPlatformConfig.maxChars - 20 && !isOverLimit;

  const enabledPlatforms = platformKeys.filter((p) => overrides[p]?.enabled);
  const anyOverLimit = enabledPlatforms.some(
    (p) => (overrides[p]?.text.length ?? 0) > PLATFORMS[p].maxChars,
  );

  const handleTextChange = (text: string) => {
    setOverrides((prev) => ({
      ...prev,
      [activePlatform]: {
        ...prev[activePlatform],
        text,
      },
    }));
  };

  const handleLinkChange = (linkUrl: string) => {
    setOverrides((prev) => ({
      ...prev,
      [activePlatform]: {
        ...prev[activePlatform],
        linkUrl,
      },
    }));
  };

  const togglePlatform = (platform: SocialPlatform) => {
    setOverrides((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        enabled: !prev[platform]?.enabled,
      },
    }));
  };

  const handleResetCurrent = () => {
    setOverrides((prev) => ({
      ...prev,
      [activePlatform]: {
        ...prev[activePlatform],
        text: post.body ?? '',
        linkUrl: post.shortUrl || post.canonicalUrl || '',
      },
    }));
  };

  const handleQueue = () => {
    if (anyOverLimit || isSubmitting) return;
    onApproveAndQueue?.({
      overrides,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      enabledPlatforms,
    });
  };

  const handleBroadcast = () => {
    if (anyOverLimit || isSubmitting) return;
    onBroadcastImmediately?.({
      overrides,
      enabledPlatforms,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      testID="broadcast-preview-drawer"
      size="lg"
      closeAriaLabel="Close drawer"
      icon={<Share2 className="w-5 h-5 text-orange-400" />}
      title="Social Broadcast Preview & Override"
      subtitle="Review and customize platform-specific copy, links, and scheduled delivery before publication."
      headerExtra={
        <AtmosphericBadge label="Syndication Dispatch Engine" variant="core" size="sm" />
      }
      className="bg-[#121212] border-zinc-800 text-stone-100"
      headerClassName="p-5 border-zinc-800 bg-zinc-900/60"
      bodyClassName="p-5 space-y-5 custom-scrollbar"
      footerClassName="p-4 border-zinc-800 bg-zinc-900/90 flex-col sm:flex-row sm:justify-between gap-3"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 min-h-[36px] rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              onClick={handleQueue}
              disabled={anyOverLimit || enabledPlatforms.length === 0 || isSubmitting}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 min-h-[36px] rounded-xl text-xs font-bold transition-all ${
                anyOverLimit || enabledPlatforms.length === 0 || isSubmitting
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
              }`}
              data-testid="btn-approve-and-queue"
            >
              <Clock size={14} />
              <span>{scheduledAt ? 'Approve & Schedule' : 'Approve & Queue'}</span>
            </button>

            <button
              type="button"
              onClick={handleBroadcast}
              disabled={anyOverLimit || enabledPlatforms.length === 0 || isSubmitting}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 min-h-[36px] rounded-xl text-xs font-bold transition-all ${
                anyOverLimit || enabledPlatforms.length === 0 || isSubmitting
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/25'
              }`}
              data-testid="btn-broadcast-immediately"
            >
              <Send size={14} />
              <span>Broadcast Immediately</span>
            </button>
          </div>
        </>
      }
    >
      {/* Post Overview Card */}
      <GlassCard
        testID="post-overview-card"
        variant="subtle"
        padding="md"
        className="border-zinc-800 space-y-2.5"
      >
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-semibold text-zinc-200">Source Publication</span>
          {post.id && <span className="font-mono text-[11px] text-zinc-400">{post.id}</span>}
        </div>
        <h3 className="text-sm font-bold text-white line-clamp-1">{post.title}</h3>
        <p className="text-xs text-zinc-300 line-clamp-2">{post.body}</p>
        <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
          <a
            href={post.canonicalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-orange-400 hover:underline"
          >
            <span>{post.canonicalUrl}</span>
            <ExternalLink size={12} />
          </a>
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <span className="inline-flex items-center gap-1 text-zinc-400">
              <Layers size={12} />
              <span>{post.mediaUrls.length} attachment(s)</span>
            </span>
          )}
        </div>
      </GlassCard>

      {/* Platform Switcher & Enable Toggles */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-300">Target Channels</label>
          <span className="text-[11px] text-zinc-400">
            {enabledPlatforms.length} of {platformKeys.length} channels active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="tablist" aria-label="Platform Tabs">
          {platformKeys.map((p) => {
            const config = PLATFORMS[p];
            const override = overrides[p];
            const isSelected = activePlatform === p;
            const charLen = override?.text.length ?? 0;
            const over = charLen > config.maxChars;

            return (
              <div
                key={p}
                className={`relative p-2.5 rounded-xl border flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-800/90 border-orange-500/50 shadow-sm'
                    : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
                onClick={() => setActivePlatform(p)}
                role="tab"
                aria-selected={isSelected}
                data-testid={`tab-${p}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white truncate">{config.name}</span>
                  <input
                    type="checkbox"
                    checked={override?.enabled ?? false}
                    onChange={(e) => {
                      e.stopPropagation();
                      togglePlatform(p);
                    }}
                    aria-label={`Enable ${config.name}`}
                    className="rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    data-testid={`toggle-${p}`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className={over ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                    {charLen}/{config.maxChars}
                  </span>
                  {override?.enabled ? (
                    <span className="text-[9px] font-mono text-emerald-400 font-semibold">ON</span>
                  ) : (
                    <span className="text-[9px] font-mono text-zinc-500">OFF</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Platform Copy Editor */}
      <section
        data-testid={`editor-${activePlatform}`}
        className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AtmosphericBadge
              label={currentPlatformConfig.name}
              variant={currentPlatformConfig.badgeVariant}
              size="sm"
            />
            {!currentOverride.enabled && (
              <span className="text-[10px] text-zinc-400 italic">(Channel currently disabled)</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleResetCurrent}
            title="Reset copy to original source body"
            className="inline-flex items-center gap-1 min-h-[32px] px-2 text-[11px] text-zinc-400 hover:text-orange-400 transition-colors"
            data-testid="btn-reset-copy"
          >
            <RotateCcw size={12} />
            <span>Reset copy</span>
          </button>
        </div>

        {/* Copy Textarea */}
        <div className="space-y-1.5">
          <label
            htmlFor={`override-text-${activePlatform}`}
            className="block text-xs font-semibold text-zinc-300"
          >
            Post Text
          </label>
          <textarea
            id={`override-text-${activePlatform}`}
            value={currentOverride.text}
            onChange={(e) => handleTextChange(e.target.value)}
            rows={5}
            placeholder={`Draft custom ${currentPlatformConfig.name} copy...`}
            className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/40 resize-y"
            data-testid={`input-text-${activePlatform}`}
          />
        </div>

        {/* Character Counter & Warnings */}
        <div
          className="flex items-center justify-between text-xs pt-1"
          data-testid={`char-counter-${activePlatform}`}
        >
          <div className="flex items-center gap-1.5">
            {isOverLimit ? (
              <span className="inline-flex items-center gap-1 text-rose-400 font-semibold text-[11px]">
                <AlertTriangle size={13} />
                <span>Exceeds platform limit by {currentLength - currentPlatformConfig.maxChars} chars</span>
              </span>
            ) : isNearLimit ? (
              <span className="text-amber-400 text-[11px]">
                Approaching limit ({currentPlatformConfig.maxChars - currentLength} chars left)
              </span>
            ) : (
              <span className="text-zinc-400 text-[11px]">Within character budget</span>
            )}
          </div>

          <span
            className={`font-mono text-xs font-bold ${
              isOverLimit
                ? 'text-rose-500'
                : isNearLimit
                ? 'text-amber-400'
                : 'text-zinc-400'
            }`}
          >
            {currentLength} / {currentPlatformConfig.maxChars}
          </span>
        </div>

        {/* Link URL Override */}
        <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
          <label
            htmlFor={`override-link-${activePlatform}`}
            className="block text-xs font-semibold text-zinc-300"
          >
            Destination / Shortlink URL
          </label>
          <input
            id={`override-link-${activePlatform}`}
            type="url"
            value={currentOverride.linkUrl ?? ''}
            onChange={(e) => handleLinkChange(e.target.value)}
            placeholder="https://links.sunshade.icu/..."
            className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/60"
            data-testid={`input-link-${activePlatform}`}
          />
        </div>
      </section>

      {/* Scheduled Cadence Section */}
      <section
        data-testid="cadence-section"
        className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2.5"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
          <Calendar size={14} className="text-orange-400" />
          <span>Scheduled Delivery Cadence (Optional)</span>
        </div>
        <p className="text-[11px] text-zinc-400">
          Set a future timestamp to queue messages with cadence delays, or leave blank to broadcast on queue consumption.
        </p>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full sm:w-auto px-3 py-1.5 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-orange-500/60"
          data-testid="input-scheduled-at"
        />
      </section>
    </Modal>
  );
}

export default BroadcastPreviewDrawer;