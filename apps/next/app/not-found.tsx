'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Key, ArrowLeft, Sparkles, Compass, ShieldAlert } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 text-center overflow-hidden relative selection:bg-orange-500/30 selection:text-white"
      style={{
        background: 'radial-gradient(ellipse at top, #1c140e 0%, #111111 50%, #0a0a0a 100%)',
      }}
    >
      {/* Decorative ambient backdrop glows (SunShade Amber/Orange) */}
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none -top-20 -left-20 opacity-35"
        style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.3) 0%, transparent 70%)' }}
      />
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20 opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)' }}
      />

      {/* Main 404 Glass Card */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 rounded-3xl bg-zinc-900/90 backdrop-blur-xl border border-orange-500/30 shadow-2xl shadow-orange-950/20 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Floating Emblem Container */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl border border-orange-500/40 text-orange-500"
            style={{
              background: 'linear-gradient(135deg, rgba(234,88,12,0.2) 0%, rgba(249,115,22,0.1) 100%)',
            }}
          >
            <ShieldAlert className="w-10 h-10 text-orange-500 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 w-16 h-3 bg-black/50 rounded-full blur-md" />
        </div>

        {/* Badge & Title */}
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider text-orange-400 bg-orange-950/40 border border-orange-500/30 shadow-sm uppercase font-mono">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>404 — Sector Not Found</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight leading-tight">
            This Sector Doesn&apos;t Exist
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
            The page, access node, or application route you are looking for may have been moved, unassigned, or hasn&apos;t been deployed yet.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 border border-orange-500/40"
            style={{
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              boxShadow: '0 4px 20px rgba(234,88,12,0.35)',
            }}
          >
            <Home className="w-4 h-4" />
            <span>Return to Hub Dashboard</span>
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/claim"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-semibold text-orange-300 bg-zinc-800/80 hover:bg-zinc-800 border border-orange-500/20 hover:border-orange-500/40 transition-all shadow-sm"
            >
              <Key className="w-3.5 h-3.5 text-orange-400" />
              <span>Claim Access Code</span>
            </Link>

            <button
              onClick={() => router.back()}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-semibold text-zinc-300 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 transition-all shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
              <span>Go Back</span>
            </button>
          </div>
        </div>

        {/* Footer brand note */}
        <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] font-mono text-zinc-500">
          <Compass className="w-3.5 h-3.5 text-zinc-500" />
          <span>SunShade Ecosystem • Central SSO Gateway</span>
        </div>
      </div>
    </div>
  );
}
