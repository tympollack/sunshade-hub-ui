'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { AppRegistryGrid } from '../../../components/launchpad/AppCard';
import { ECOSYSTEM_APPS, type EcosystemApp } from '../../../data/ecosystemApps';

export interface LaunchpadShowcaseProps {
  className?: string;
  apps?: EcosystemApp[];
}

export function LaunchpadShowcase({
  className = '',
  apps = ECOSYSTEM_APPS,
}: LaunchpadShowcaseProps) {
  return (
    <div className={`space-y-4 ${className}`} data-testid="launchpad-ecosystem-showcase">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <span>SunShade Ecosystem Launchpad</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            High-res directory of offline mesh games, sovereign civic tools, and collaborative creative suites.
          </p>
        </div>
      </div>
      <AppRegistryGrid apps={apps} />
    </div>
  );
}
