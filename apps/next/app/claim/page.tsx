import { Suspense } from 'react';
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
      <div className="w-full max-w-lg p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 animate-pulse">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 mx-auto" />
        <div className="space-y-2 text-center">
          <div className="h-6 bg-slate-800 rounded w-1/2 mx-auto" />
          <div className="h-4 bg-slate-800 rounded w-3/4 mx-auto" />
        </div>
        <div className="space-y-4">
          <div className="h-10 bg-slate-800 rounded-xl" />
          <div className="h-10 bg-slate-800 rounded-xl" />
          <div className="h-12 bg-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
