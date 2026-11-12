'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play, ExternalLink, Wifi, Sparkles, Shield, ArrowUpRight } from 'lucide-react';
import { GlassCard } from '@digitalcanopy/ui';
import type { EcosystemApp, ReleaseTag } from '../../data/ecosystemApps';
import { DEFAULT_BLUR_DATA_URL } from '../../data/ecosystemApps';
import { buildTokenRedirectUrl } from '../../lib/auth/redirectValidator';
import { supabase } from '@digitalcanopy/supabase';

export interface AppCardProps {
  app: EcosystemApp;
  onLaunch?: (app: EcosystemApp, redirectUrl: string) => void;
  priority?: boolean;
}

export function getAppReleaseBadge(tag: ReleaseTag) {
  switch (tag) {
    case 'Production':
      return {
        label: 'Production',
        className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400',
      };
    case 'Local Mesh Only':
      return {
        label: 'Local Mesh Only',
        className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        dot: 'bg-cyan-400',
        icon: <Wifi className="w-3 h-3 mr-1" />,
      };
    case 'Beta':
      return {
        label: 'Beta',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        dot: 'bg-amber-400',
      };
    default:
      return {
        label: tag,
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

export function AppCard({ app, onLaunch, priority = false }: AppCardProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const badge = getAppReleaseBadge(app.releaseTag);

  const handleLaunch = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLaunching(true);

    try {
      const targetBase = resolveLaunchUrl(app.launchRoute);
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
        onLaunch(app, finalUrl);
      } else {
        if (finalUrl.startsWith('/') && typeof window !== 'undefined') {
          window.location.href = finalUrl;
        } else if (typeof window !== 'undefined') {
          window.open(finalUrl, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err) {
      console.error('Launch failed:', err);
      if (typeof window !== 'undefined') {
        window.location.href = app.launchRoute;
      }
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div
      data-testid={`app-card-${app.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-[#161616]/90 backdrop-blur-md shadow-sm dark:shadow-none transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-orange-500/10 hover:border-orange-500/40"
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
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Release Tag Chip */}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border backdrop-blur-md ${badge.className}`}
          >
            {badge.icon}
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse ${badge.dot}`} />
            {badge.label}
          </span>

          {/* Version Chip */}
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-black/60 text-zinc-300 border border-white/10 backdrop-blur-md">
            {app.version}
          </span>
        </div>

        {/* Category Label at bottom of banner */}
        <div className="absolute bottom-2.5 left-3">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-orange-400 bg-orange-950/60 border border-orange-500/30 px-2 py-0.5 rounded">
            {app.category}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight group-hover:text-orange-500 transition-colors">
            {app.name}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {app.bio}
          </p>
        </div>

        {/* Launch CTA Action Button */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-500">
            {app.ssoSupported ? 'SSO Handshake Ready' : 'Direct Link'}
          </div>

          <button
            onClick={handleLaunch}
            disabled={isLaunching}
            data-testid={`launch-btn-${app.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all duration-150 shadow-md shadow-orange-500/20 disabled:opacity-50"
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
    </div>
  );
}

export interface AppRegistryGridProps {
  apps?: EcosystemApp[];
  className?: string;
  onLaunch?: (app: EcosystemApp, redirectUrl: string) => void;
}

export function AppRegistryGrid({
  apps = [],
  className = '',
  onLaunch,
}: AppRegistryGridProps) {
  return (
    <div
      data-testid="app-registry-grid"
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}
    >
      {apps.map((app, idx) => (
        <AppCard key={app.id} app={app} onLaunch={onLaunch} priority={idx < 3} />
      ))}
    </div>
  );
}
