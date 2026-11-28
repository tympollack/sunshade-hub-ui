'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play, ExternalLink, Wifi, Sparkles, Shield, ArrowUpRight } from 'lucide-react';
import { AtmosphericBadge, GlassCard } from '@digitalcanopy/ui';
import type { EcosystemApp, ReleaseTag } from '../../data/ecosystemApps';
import { DEFAULT_BLUR_DATA_URL } from '../../data/ecosystemApps';
import { buildTokenRedirectUrl } from '../../lib/auth/redirectValidator';
import { supabase } from '@digitalcanopy/supabase';

export interface AppCardProps {
  app: EcosystemApp;
  onLaunch?: (app: EcosystemApp, redirectUrl: string) => void;
  priority?: boolean;
  guestLaunchEnabled?: boolean;
}

export function getAppReleaseBadge(tag: ReleaseTag) {
  switch (tag) {
    case 'Production':
      return {
        label: 'Production',
        variant: 'success' as const,
        className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400',
      };
    case 'Local Mesh Only':
      return {
        label: 'Local Mesh Only',
        variant: 'telemetry' as const,
        className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        dot: 'bg-cyan-400',
        icon: <Wifi className="w-3 h-3 text-cyan-300" />,
      };
    case 'Beta':
      return {
        label: 'Beta',
        variant: 'cozy' as const,
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        dot: 'bg-amber-400',
      };
    default:
      return {
        label: tag,
        variant: 'neutral' as const,
        className: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
        dot: 'bg-zinc-400',
      };
  }
}

export function resolveLaunchUrl(rawRoute: string): string {
  if (typeof window === 'undefined') return rawRoute;

  // If already relative, keep as-is
  if (rawRoute.startsWith('/')) return rawRoute;

  try {
    const parsed = new URL(rawRoute);
    const host = window.location.hostname.toLowerCase();
    const isStaging =
      host.includes('-stag') ||
      host.includes('staging') ||
      host.endsWith('.vercel.app');

    if (isStaging && parsed.hostname.endsWith('.sunshade.icu')) {
      const parts = parsed.hostname.split('.');
      if (parts.length >= 3 && !parts[0].endsWith('-stag')) {
        parts[0] = `${parts[0]}-stag`;
        parsed.hostname = parts.join('.');
        return parsed.toString();
      }
    }
  } catch {
    // Return raw route on parse exception
  }

  return rawRoute;
}

export function AppCard({
  app,
  onLaunch,
  priority = false,
  guestLaunchEnabled = true,
}: AppCardProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const badge = getAppReleaseBadge(app.releaseTag);

  const handleLaunch = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLaunching(true);

    const targetBase = resolveLaunchUrl(app.launchRoute);
    const isExternal = !targetBase.startsWith('/') && typeof window !== 'undefined';
    let newTab: Window | null = null;

    // Retain synchronous user gesture for external links to bypass browser popup blockers
    if (isExternal && !onLaunch) {
      newTab = window.open('about:blank', '_blank', 'noopener,noreferrer');
    }

    try {
      if (guestLaunchEnabled === false) {
        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          if (newTab) newTab.close();
          const loginTarget = `/login?redirect=${encodeURIComponent(targetBase)}`;
          if (typeof window !== 'undefined') {
            window.location.href = loginTarget;
          }
          return;
        }
      }

      let finalUrl = targetBase;

      if (app.ssoSupported) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          finalUrl = buildTokenRedirectUrl(targetBase, {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }
      }

      if (onLaunch) {
        if (newTab) newTab.close();
        onLaunch(app, finalUrl);
      } else if (newTab) {
        newTab.location.href = finalUrl;
      } else if (typeof window !== 'undefined') {
        window.location.href = finalUrl;
      }
    } catch (err) {
      console.error('Launch failed:', err);
      if (newTab) {
        newTab.location.href = app.launchRoute;
      } else if (typeof window !== 'undefined') {
        window.location.href = app.launchRoute;
      }
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <GlassCard
      testID={`app-card-${app.id}`}
      variant="default"
      padding="none"
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-800/80 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-orange-500/10 hover:border-orange-500/40"
    >
      {/* Top 16:9 Banner Image Container */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-zinc-900">
        <Image
          src={app.bannerUrl}
          alt={app.name}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          placeholder="blur"
          blurDataURL={app.blurDataUrl || DEFAULT_BLUR_DATA_URL}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        {/* Top Badges Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          {/* Release Tag Chip */}
          <AtmosphericBadge
            label={badge.label}
            variant={badge.variant}
            icon={badge.icon}
            statusDot
            pulse
            size="sm"
          />

          {/* Version Chip */}
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-black/70 text-stone-200 border border-white/15 backdrop-blur-md">
            {app.version}
          </span>
        </div>

        {/* Category Label at bottom of banner */}
        <div className="absolute bottom-2.5 left-3">
          <AtmosphericBadge label={app.category} variant="core" size="sm" />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-stone-100 tracking-tight group-hover:text-orange-400 transition-colors">
            {app.name}
          </h3>
          <p className="text-xs sm:text-sm text-stone-300 line-clamp-2 leading-relaxed">
            {app.bio}
          </p>
        </div>

        {/* Launch CTA Action Button */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="text-[11px] font-mono text-stone-400">
            {app.ssoSupported ? 'SSO Handshake Ready' : 'Direct Link'}
          </div>

          <button
            type="button"
            onClick={handleLaunch}
            disabled={isLaunching}
            data-testid={`launch-btn-${app.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[36px] rounded-xl text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 active:scale-95 transition-all duration-150 shadow-md shadow-orange-500/20 disabled:opacity-50"
          >
            {app.ctaType === 'Play Now' ? (
              <Play className="w-3.5 h-3.5 fill-current" />
            ) : (
              <ArrowUpRight className="w-3.5 h-3.5" />
            )}
            <span>{isLaunching ? 'Connecting...' : app.ctaType}</span>
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

export interface AppRegistryGridProps {
  apps?: EcosystemApp[];
  className?: string;
  onLaunch?: (app: EcosystemApp, redirectUrl: string) => void;
  guestLaunchEnabled?: boolean;
}

export function AppRegistryGrid({
  apps = [],
  className = '',
  onLaunch,
  guestLaunchEnabled = true,
}: AppRegistryGridProps) {
  return (
    <div
      data-testid="app-registry-grid"
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}
    >
      {apps.map((app, idx) => (
        <AppCard
          key={app.id}
          app={app}
          onLaunch={onLaunch}
          priority={idx < 3}
          guestLaunchEnabled={guestLaunchEnabled}
        />
      ))}
    </div>
  );
}
