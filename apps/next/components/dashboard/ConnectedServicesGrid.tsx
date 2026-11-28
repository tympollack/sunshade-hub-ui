'use client';

import React from 'react';
import {
  Vote,
  Wrench,
  BookOpen,
  Home,
  Radio,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { AtmosphericBadge, GlassCard } from '@digitalcanopy/ui';
import { isVotaryTarget } from '../../lib/env';

export interface ConnectedService {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  status: 'active' | 'operational' | 'synchronized' | 'mesh-active';
  statusLabel: string;
  badgeVariant: 'core' | 'cozy' | 'telemetry' | 'success';
  icon: React.ReactNode;
  iconBg: string;
  accentColor: string;
  badgeBg: string;
}

export const CONNECTED_SERVICES: ConnectedService[] = [
  {
    id: 'votary',
    name: 'The Votary',
    tagline: 'Verified Civic Consensus',
    description: 'Verified civic consensus, community stance-taking, and sovereign citizen decrees.',
    url: 'https://votary.app',
    status: 'active',
    statusLabel: 'Consensus Active',
    badgeVariant: 'core',
    icon: <Vote className="w-5 h-5 text-orange-400" />,
    iconBg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    accentColor: 'text-orange-400',
    badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  },
  {
    id: 'patchwork',
    name: 'PatchWork',
    tagline: 'Municipal Infrastructure',
    description: 'Local municipal infrastructure, road hazards, and water quality reporting.',
    url: 'https://patchwork.sunshade.icu',
    status: 'operational',
    statusLabel: 'Operational',
    badgeVariant: 'cozy',
    icon: <Wrench className="w-5 h-5 text-amber-400" />,
    iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  {
    id: 'speak-for-the-dead',
    name: 'Speak for the Dead',
    tagline: 'Workplace Safety Ledger',
    description: 'Public workplace safety ledger and accountability records.',
    url: 'https://speakforthedead.sunshade.icu',
    status: 'active',
    statusLabel: 'Ledger Active',
    badgeVariant: 'success',
    icon: <BookOpen className="w-5 h-5 text-emerald-400" />,
    iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'cozy',
    name: 'Cozy',
    tagline: 'Neighborhood Spaces',
    description: 'Neighborhood spaces, local check-ins, and community connection.',
    url: 'https://cozy.sunshade.icu',
    status: 'synchronized',
    statusLabel: 'Synchronized',
    badgeVariant: 'telemetry',
    icon: <Home className="w-5 h-5 text-blue-400" />,
    iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    accentColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  {
    id: 'digital-canopy',
    name: 'Digital Canopy',
    tagline: 'Resilient Edge Mesh',
    description: 'Resilient local edge nodes and zero-WAN disaster relief connectivity.',
    url: 'https://canopy.sunshade.icu',
    status: 'mesh-active',
    statusLabel: 'Mesh Active',
    badgeVariant: 'telemetry',
    icon: <Radio className="w-5 h-5 text-cyan-400" />,
    iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    accentColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
];

interface ConnectedServicesGridProps {
  className?: string;
  services?: ConnectedService[];
}

export function ConnectedServicesGrid({
  className = '',
  services = CONNECTED_SERVICES,
}: ConnectedServicesGridProps) {
  const handleServiceLaunch = (
    e: React.MouseEvent<HTMLAnchorElement>,
    service: ConnectedService
  ) => {
    if (!isVotaryTarget(service.url)) {
      return;
    }

    e.preventDefault();
    if (typeof window !== 'undefined') {
      const launchPath = `/launch?target=${encodeURIComponent(service.url)}`;
      window.open(launchPath, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="connected-services-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            <span>Connected SunShade Services</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Civic utility suite powering community consensus, municipal reporting, and resilient infrastructure.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <GlassCard
            key={service.id}
            testID={`service-card-${service.id}`}
            variant="default"
            padding="md"
            className="group relative border border-stone-800/80 hover:border-orange-500/40 transition-all duration-200 flex flex-col justify-between overflow-hidden"
          >
            {/* Top row: Icon, Category & Active Status Indicator */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${service.iconBg}`}>
                    {service.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-stone-100 group-hover:text-orange-400 transition-colors truncate">
                      {service.name}
                    </h3>
                    <span className="text-[11px] font-mono font-medium text-stone-400 block truncate">
                      {service.tagline}
                    </span>
                  </div>
                </div>

                <AtmosphericBadge
                  label={service.statusLabel}
                  variant={service.badgeVariant}
                  statusDot
                  pulse
                  size="sm"
                />
              </div>

              {/* Description */}
              <p className="text-xs text-stone-300 leading-relaxed mb-4">
                {service.description}
              </p>
            </div>

            {/* Bottom Action: Clean External Link */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Verified Utility</span>
              </span>

              <a
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleServiceLaunch(e, service)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold text-stone-100 bg-stone-800/90 hover:bg-orange-600 hover:text-white border border-white/10 transition-all shadow-sm"
              >
                <span>Launch Service</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

export default ConnectedServicesGrid;
