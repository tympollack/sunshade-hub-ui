'use client';

import React from 'react';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  UserCheck,
  Cpu,
} from 'lucide-react';
import { AtmosphericBadge, GlassCard, Modal } from '@digitalcanopy/ui';

interface SecuritySettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SecuritySettingsDrawer({
  isOpen,
  onClose,
}: SecuritySettingsDrawerProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      testID="security-settings-drawer"
      size="lg"
      closeAriaLabel="Close drawer"
      icon={<ShieldCheck className="w-5 h-5 text-orange-400" />}
      title="How We Protect Deliberation"
      subtitle="Cryptographic guarantees ensuring sovereign civic stance-taking without peer pressure or vote manipulation."
      headerExtra={
        <AtmosphericBadge label="Consensus Architecture" variant="core" size="sm" />
      }
      className="bg-[#141414] border-zinc-800 text-stone-100"
      headerClassName="bg-zinc-900/60 border-zinc-800"
      bodyClassName="p-6 space-y-6"
      footerClassName="p-5 border-zinc-800 bg-zinc-900/40 justify-between"
      footer={
        <>
          <span className="text-[11px] font-mono text-zinc-400">
            SunShade Systems Security Suite
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[36px] rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            Close Documentation
          </button>
        </>
      }
    >
      {/* Pillar 1: Anti-Bandwagoning Lockboxes */}
      <GlassCard
        testID="pillar-anti-bandwagoning"
        variant="subtle"
        padding="md"
        className="border-zinc-800 space-y-3 hover:border-orange-500/40 transition-colors"
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
            <span>Prevents herd mentality &amp; peer bias</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
            <span>Unsealed simultaneously at deadline</span>
          </div>
        </div>
      </GlassCard>

      {/* Pillar 2: Zero-Knowledge Proofs */}
      <GlassCard
        testID="pillar-zero-knowledge"
        variant="subtle"
        padding="md"
        className="border-zinc-800 space-y-3 hover:border-emerald-500/40 transition-colors"
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
      </GlassCard>

      {/* Pillar 3: Sybil Resistance */}
      <GlassCard
        testID="pillar-sybil-resistance"
        variant="subtle"
        padding="md"
        className="border-zinc-800 space-y-3 hover:border-blue-500/40 transition-colors"
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
      </GlassCard>

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
    </Modal>
  );
}

export default SecuritySettingsDrawer;
