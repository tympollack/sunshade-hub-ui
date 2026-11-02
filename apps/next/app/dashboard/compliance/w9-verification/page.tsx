import React from 'react';
import { TOKEN_TERMINOLOGY, IRS_1099_SAFETY_BUFFER_CENTS } from '../../../../lib/services/complianceGateService';

export const metadata = {
  title: 'Tax Compliance & W-9 Verification | SunShade Hub',
  description: 'Complete mandatory IRS Form W-9 verification for contractor labor rebates.',
};

export default function W9VerificationPage() {
  const thresholdFormatted = (IRS_1099_SAFETY_BUFFER_CENTS / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span>IRS 1099-NEC Circuit Breaker</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Tax Compliance & Identity Verification
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Under IRS regulations and closed-loop fintech compliance rules, contributors whose cumulative
            annual {TOKEN_TERMINOLOGY.REBATE_UNIT_LABEL} redemptions reach or exceed ${thresholdFormatted} are
            required to maintain verified Form W-9 or foreign tax certification on file before fiat disbursements can be settled.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
            Legal & Regulatory Notice
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {TOKEN_TERMINOLOGY.LEGAL_DISCLAIMER}
          </p>
        </div>

        <form className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Legal Individual or Entity Name
            </label>
            <input
              type="text"
              placeholder="As shown on your official tax return"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Taxpayer Identification Number (SSN or EIN)
            </label>
            <input
              type="password"
              placeholder="•••-••-••••"
              maxLength={11}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Tax Classification
            </label>
            <select
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
              defaultValue="individual"
            >
              <option value="individual">Individual / Sole Proprietor</option>
              <option value="llc">Limited Liability Company (LLC)</option>
              <option value="corporation">C-Corp or S-Corp</option>
              <option value="non_us">Foreign Contributor (Form W-8BEN)</option>
            </select>
          </div>

          <div className="flex items-start gap-2.5 pt-2">
            <input
              type="checkbox"
              id="certify"
              required
              className="mt-1 rounded bg-zinc-900 border-zinc-700 text-orange-500 focus:ring-0"
            />
            <label htmlFor="certify" className="text-xs text-zinc-400 leading-normal">
              Under penalties of perjury, I certify that the Taxpayer Identification Number provided is correct
              and that I accept the {TOKEN_TERMINOLOGY.TERMS_NAME}.
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 border border-orange-500/40 shadow-lg shadow-orange-950/30 transition-all cursor-pointer"
          >
            Submit Verified Tax Certification
          </button>
        </form>
      </div>
    </div>
  );
}
