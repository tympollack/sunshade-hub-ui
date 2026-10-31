'use client';

import React, { useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  UserCheck,
  X,
  FileCheck,
  Cpu,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface SecuritySettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SecuritySettingsDrawer({
  isOpen,
  onClose,
}: SecuritySettingsDrawerProps) {
  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end"
      data-testid="security-settings-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-xl h-full bg-[#141414] border-l border-zinc-800 shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-start justify-between gap-4 bg-zinc-900/60">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider text-orange-400 bg-orange-950/40 border border-orange-500/30 uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
              <span>Consensus Architecture</span>
            </div>
            <h2
              id="security-drawer-title"
              className="text-xl font-bold text-white tracking-tight"
            >
              How We Protect Deliberation
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Cryptographic guarantees ensuring sovereign civic stance-taking without peer pressure or vote manipulation.
            </p>
          </div>

          <button
            onClick={onClose}
            title="Close drawer"
            aria-label="Close drawer"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Pillar 1: Anti-Bandwagoning Lockboxes */}
          <section
            data-testid="pillar-anti-bandwagoning"
            className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3 hover:border-orange-500/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Anti-Bandwagoning Lockboxes
                </h3>
                <span className="text-[11px] font-mono text-orange-400">
                  Time-Locked Cryptographic Commitments
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Consensus votes and community stances are sealed inside cryptographic lockboxes until the deliberation window concludes. Live vote tallies and trending percentages are strictly concealed while deliberation is ongoing.
            </p>

            <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                <span>Prevents herd mentality & peer bias</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                <span>Unsealed simultaneously at deadline</span>
              </div>
            </div>
          </section>

          {/* Pillar 2: Zero-Knowledge Proofs */}
          <section
            data-testid="pillar-zero-knowledge"
            className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3 hover:border-emerald-500/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Zero-Knowledge Proofs (ZKP)
                </h3>
                <span className="text-[11px] font-mono text-emerald-400">
                  Verifiable Eligibility Without Identity Exposure
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Zero-knowledge cryptography proves that a citizen is registered and eligible to participate in a decree without revealing who they are. Your ballot is mathematically verifiable, yet decoupled from your private credentials.
            </p>

            <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Zero identity leak in public ledgers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Mathematically auditable tallies</span>
              </div>
            </div>
          </section>

          {/* Pillar 3: Sybil Resistance */}
          <section
            data-testid="pillar-sybil-resistance"
            className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3 hover:border-blue-500/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Sybil Resistance
                </h3>
                <span className="text-[11px] font-mono text-blue-400">
                  One Citizen, One Sovereign Decree
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Every verified participant is linked to exactly one single-human citizen profile. Malicious actors cannot spawn bot armies, coordinated puppet accounts, or artificial voting nodes to sway outcomes.
            </p>

            <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>Immune to automated bot rings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>Decentralized uniqueness verification</span>
              </div>
            </div>
          </section>

          {/* Technical Summary Callout */}
          <div className="p-4 rounded-xl bg-orange-950/20 border border-orange-500/20 text-zinc-300 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
              <Cpu className="w-4 h-4" />
              <span>Decoupled Civic UX</span>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-400">
              By keeping technical proofs and cryptographic mechanics behind this security architecture drawer, everyday citizens enjoy a straightforward, jargon-free deliberative experience.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <span className="text-[11px] font-mono text-zinc-500">
            SunShade Systems Security Suite
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            Close Documentation
          </button>
        </div>

      </div>
    </div>
  );
}

export default SecuritySettingsDrawer;
