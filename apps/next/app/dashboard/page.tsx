import { Suspense } from 'react';
import { getDashboardData } from './data';
import DashboardClient from './DashboardClient';
import { WidgetErrorBoundary } from '../../components/WidgetErrorBoundary';
import { ChessWidget } from './widgets/ChessWidget';
import { EcosystemLogWidget } from './widgets/EcosystemLogWidget';
import { OTAManager } from './OTAManager';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient
        profile={data.profile}
        edgeNodes={data.edgeNodes}
        chessWidget={
          <WidgetErrorBoundary gameName="SunShade Chess">
            <Suspense fallback={<WidgetSkeleton />}>
              <ChessWidget userId={data.userId} />
            </Suspense>
          </WidgetErrorBoundary>
        }
        ecosystemWidget={
          <WidgetErrorBoundary gameName="Ecosystem Log">
            <Suspense fallback={<WidgetSkeleton />}>
              <EcosystemLogWidget userId={data.userId} />
            </Suspense>
          </WidgetErrorBoundary>
        }
      />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="w-full h-screen bg-zinc-50 dark:bg-[#111111] flex items-center justify-center">
      <div className="space-y-4 w-full max-w-2xl px-8 animate-pulse">
        <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />)}
        </div>
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>
    </div>
  );
}

export function WidgetSkeleton() {
  return (
    <div className="w-full h-64 bg-zinc-100 dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-6 animate-pulse">
      <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />)}
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => <div key={i} className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />)}
      </div>
    </div>
  );
}
