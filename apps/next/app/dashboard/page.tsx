import { Suspense } from 'react';
import { getDashboardData } from './data';
import DashboardClient from './DashboardClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient
        profile={data.profile}
        edgeNodes={data.edgeNodes}
        gameStats={data.gameStats}
        matchHistory={data.matchHistory}
        ecosystemLogs={data.ecosystemLogs}
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
