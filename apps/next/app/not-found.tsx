'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Key, ArrowLeft, Sparkles, Compass, ShieldAlert } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 text-center overflow-hidden relative selection:bg-indigo-500 selection:text-white"
      style={{
        background: 'radial-gradient(ellipse at top, #1E1B4B 0%, #0F172A 50%, #090D16 100%)',
      }}
    >
      {/* Decorative ambient backdrop glows */}
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none -top-20 -left-20 opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)' }}
      />
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20 opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)' }}
      />

      {/* Main 404 Glass Card */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Floating Emblem Container */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl border border-indigo-400/30 text-indigo-400"
            style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.2) 0%, rgba(16,185,129,0.15) 100%)',
            }}
          >
            <ShieldAlert className="w-10 h-10 text-indigo-400 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 w-16 h-3 bg-black/40 rounded-full blur-md" />
        </div>

        {/* Badge & Title */}
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider text-indigo-300 bg-indigo-950/80 border border-indigo-700/60 shadow-sm uppercase font-mono">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>404 — Sector Not Found</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-tight">
            This Sector Doesn&apos;t Exist
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            The page, access node, or application route you are looking for may have been moved, unassigned, or hasn&apos;t been deployed yet.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 border border-indigo-500/40"
            style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)',
              boxShadow: '0 4px 20px rgba(79,70,229,0.35)',
            }}
          >
            <Home className="w-4 h-4" />
            <span>Return to Hub Dashboard</span>
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/claim"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-semibold text-indigo-200 bg-slate-800/80 hover:bg-slate-800 border border-indigo-500/20 transition-all shadow-sm"
            >
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Claim Access Code</span>
            </Link>

            <button
              onClick={() => router.back()}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Go Back</span>
            </button>
          </div>
        </div>

        {/* Footer brand note */}
        <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-500">
          <Compass className="w-3.5 h-3.5 text-slate-500" />
          <span>SunShade Ecosystem • Central SSO Gateway</span>
        </div>
      </div>
    </div>
  );
}
