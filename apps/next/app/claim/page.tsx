import { Suspense } from 'react';
import { Skeleton } from '@digitalcanopy/ui';
import type { Metadata } from 'next';
import ClaimClient from './ClaimClient';

export const metadata: Metadata = {
  title: 'Claim Access Code | SunShade Ecosystem',
  description: 'Activate your SunShade Ecosystem access code and complete profile setup.',
};

export default function ClaimPage() {
  return (
    <Suspense fallback={<ClaimSkeleton />}>
      <ClaimClient />
    </Suspense>
  );
}

function ClaimSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <Skeleton width={64} height={64} className="rounded-2xl mx-auto" />
        <div className="space-y-2 text-center">
          <Skeleton width="50%" height={24} className="rounded mx-auto" />
          <Skeleton width="75%" height={16} className="rounded mx-auto" />
        </div>
        <div className="space-y-4">
          <Skeleton height={40} className="rounded-xl" />
          <Skeleton height={40} className="rounded-xl" />
          <Skeleton height={48} className="rounded-xl" />
        </div>
      </div>
    </div>
  );
}
