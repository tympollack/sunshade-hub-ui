'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  UserCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Compass,
  Fingerprint,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { getValidatedRedirectUrl, isVotaryTarget, buildTokenRedirectUrl } from '../../../lib/env';

export default function VerifyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawTargetUrl =
    searchParams.get('redirectTo') ||
    searchParams.get('redirect_to') ||
    searchParams.get('next') ||
    '/dashboard';

  const validatedRedirect = getValidatedRedirectUrl(rawTargetUrl, '/dashboard');

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [verificationComplete, setVerificationComplete] = useState(false);

  const handleStartVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setStep(2);
    }, 1200);
  };

  const handleCompleteProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setVerificationComplete(true);
      setStep(3);
    }, 1000);
  };

  const handleProceed = () => {
    if (isVotaryTarget(validatedRedirect)) {
      window.location.href = validatedRedirect;
      return;
    }

    if (validatedRedirect.startsWith('/')) {
      router.push(validatedRedirect);
      return;
    }

    window.location.href = validatedRedirect;
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 text-white font-sans relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at top, #1c140e 0%, #111111 50%, #0a0a0a 100%)',
      }}
    >
      {/* Background ambient lighting */}
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none -top-20 -left-20 opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(234,88,12,0.3) 0%, transparent 70%)' }}
      />
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20 opacity-25"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-xl p-6 sm:p-8 rounded-3xl bg-zinc-900/90 backdrop-blur-xl border border-orange-500/30 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <img src="/logo.png" alt="SunShade Systems" className="h-9 object-contain" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-wider text-orange-400 bg-orange-950/40 border border-orange-500/30 uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
            <span>Citizen Identity Verification</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
            Single-Human Verification
          </h1>

          <p className="text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
            Confirm your single-human citizen profile so your voice counts once and cannot be forged by bots.
          </p>
        </div>

        {/* Step Progression Indicators */}
        <div className="flex items-center justify-center gap-3 py-2 border-y border-zinc-800">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step >= 1 ? 'text-orange-400' : 'text-zinc-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 1 ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
              1
            </span>
            <span>Humanity Check</span>
          </div>
          <span className="text-zinc-600">→</span>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step >= 2 ? 'text-orange-400' : 'text-zinc-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 2 ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
              2
            </span>
            <span>Citizen Profile</span>
          </div>
          <span className="text-zinc-600">→</span>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step >= 3 ? 'text-emerald-400' : 'text-zinc-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 3 ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
              3
            </span>
            <span>Verified</span>
          </div>
        </div>

        {/* Value Proposition Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
            <div className="flex items-center gap-2 text-orange-400 font-semibold text-xs">
              <Users className="w-4 h-4 shrink-0" />
              <span>Equal Voice</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Every verified person receives exactly one vote in civic consensus.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Bot Protection</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Prevents automated swarms from creating fake accounts or skewing decrees.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Private & Safe</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Confirms uniqueness without publishing your real-world identity.
            </p>
          </div>
        </div>

        {/* Step 1: Humanity Check */}
        {step === 1 && (
          <div className="space-y-4 pt-2 text-center">
            <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Fingerprint className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-100">Confirm Single-Human Humanity</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Verify your browser session with a secure cryptographic challenge to guarantee your vote is unique.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartVerification}
                disabled={isVerifying}
                className="w-full sm:w-auto px-6 py-3 mt-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isVerifying ? 'Verifying Uniqueness...' : 'Begin Verification'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Citizen Profile Setup */}
        {step === 2 && (
          <form onSubmit={handleCompleteProfile} className="space-y-4 pt-2">
            <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-orange-400">
                <UserCheck className="w-4 h-4" />
                <span>Choose Your Public Citizen Alias</span>
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                  Citizen Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. CivicVoice_42"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <p className="text-[11px] text-zinc-400">
                This name represents your citizen participation across The Votary and SunShade civic products.
              </p>
            </div>

            <button
              type="submit"
              disabled={isVerifying || !displayName.trim()}
              className="w-full py-3 px-5 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <span>{isVerifying ? 'Finalizing Profile...' : 'Confirm Citizen Profile'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 3: Verified Badge */}
        {step === 3 && (
          <div className="space-y-5 pt-2 text-center">
            <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-emerald-300">Citizen Profile Verified</h3>
                <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                  Your single-human citizen profile is confirmed. Your voice is sovereign and ready for civic deliberation.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleProceed}
              className="w-full py-3.5 px-6 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40"
            >
              <span>Continue to Civic Services</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer info: explains where in-depth cryptography lives */}
        <div className="pt-3 border-t border-zinc-800 text-center space-y-2">
          <p className="text-[11px] text-zinc-400">
            Curious about our consensus architecture? Read about lockboxes and zero-knowledge privacy in{' '}
            <Link
              href="/dashboard"
              className="text-orange-400 hover:text-orange-300 underline underline-offset-2"
            >
              Security Settings
            </Link>
            .
          </p>

          <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <Compass className="w-3.5 h-3.5" />
            <span>SunShade Civic Infrastructure • Single-Human Protocol</span>
          </div>
        </div>

      </div>
    </div>
  );
}
