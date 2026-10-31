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

export interface ConnectedService {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  status: 'active' | 'operational' | 'synchronized' | 'mesh-active';
  statusLabel: string;
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
          <div
            key={service.id}
            data-testid={`service-card-${service.id}`}
            className="group relative bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/70 hover:border-orange-500/50 dark:hover:border-orange-500/40 rounded-2xl p-5 shadow-sm dark:shadow-none transition-all duration-200 flex flex-col justify-between overflow-hidden"
          >
            {/* Top row: Icon, Category & Active Status Indicator */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${service.iconBg}`}>
                    {service.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-white group-hover:text-orange-500 transition-colors">
                      {service.name}
                    </h3>
                    <span className="text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
                      {service.tagline}
                    </span>
                  </div>
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border ${service.badgeBg}`}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                  </span>
                  <span>{service.statusLabel}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                {service.description}
              </p>
            </div>

            {/* Bottom Action: Clean External Link */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Verified Utility</span>
              </span>

              <a
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-orange-500 hover:text-white dark:bg-zinc-800/80 dark:hover:bg-orange-600 dark:hover:text-white transition-all shadow-sm group-hover:shadow"
              >
                <span>Launch Service</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConnectedServicesGrid;
