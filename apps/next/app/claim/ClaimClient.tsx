'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Key,
  Mail,
  User,
  AtSign,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';

export default function ClaimClient() {
  const searchParams = useSearchParams();

  const queryCode = searchParams.get('code') || '';
  const queryEmail = searchParams.get('email') || '';

  const [authCode, setAuthCode] = useState(queryCode.toUpperCase());
  const [email, setEmail] = useState(queryEmail);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ email: string; redirectUrl: string } | null>(null);
  const [redirectCount, setRedirectCount] = useState(3);

  useEffect(() => {
    if (queryCode) setAuthCode(queryCode.toUpperCase().trim());
    if (queryEmail) setEmail(queryEmail.trim());
  }, [queryCode, queryEmail]);

  // Handle automatic redirect on successful claim
  useEffect(() => {
    if (!successData) return;

    const timer = setInterval(() => {
      setRedirectCount((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = successData.redirectUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [successData]);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-zinc-700' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 33, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score: 66, label: 'Medium', color: 'bg-amber-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = authCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length !== 8 || !/^[A-Z0-9]{8}$/.test(cleanCode)) {
      setError('Please enter a valid 8-character alphanumeric auth code.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your entries.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/claim-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: authCode.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to claim auth code.');
      }

      setSuccessData({
        email: data.email || email,
        redirectUrl: data.redirect_url || '/dashboard',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to activate account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-orange-500/30 selection:text-white relative overflow-hidden my-auto"
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

      <div className="relative z-10 w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-zinc-900/90 backdrop-blur-xl border border-orange-500/30 shadow-2xl shadow-orange-950/20 space-y-6 animate-in fade-in zoom-in-95 duration-300 mx-auto">
        
        {/* Header Branding & Badge */}
        <div className="text-center space-y-3">
          <div
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center border border-orange-500/30 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(234,88,12,0.25) 0%, rgba(249,115,22,0.15) 100%)',
            }}
          >
            <ShieldCheck className="w-8 h-8 text-orange-500" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-wider text-orange-400 bg-orange-950/40 border border-orange-500/30 uppercase">
              <Sparkles className="w-3 h-3 text-orange-400" />
              <span>Account Onboarding</span>
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight mt-1.5">
              Claim Your Access Code
            </h1>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
              Enter your issued 8-character code and set up your SunShade Ecosystem profile to gain instant access.
            </p>
          </div>
        </div>

        {/* Step Indicator Progress Bar */}
        {!successData && (
          <div className="flex items-center justify-between gap-2 bg-zinc-950/80 p-2 rounded-xl border border-zinc-800">
            <div
              className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors ${
                step === 1 ? 'bg-orange-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              1. Code & Email
            </div>
            <div
              className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors ${
                step === 2 ? 'bg-orange-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              2. Account Setup
            </div>
          </div>
        )}

        {/* Error Alert Box */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-700 text-rose-200 text-xs font-medium flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Success Screen */}
        {successData ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-600 flex items-center justify-center text-emerald-400 shadow-xl animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-zinc-100">Account Activated!</h2>
              <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                Welcome to SunShade, <strong className="text-orange-400">{successData.email}</strong>! Your authentication profile is active.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <p className="text-xs text-zinc-400">Redirecting to Dashboard in</p>
              <div className="font-mono text-3xl font-extrabold text-orange-400">{redirectCount}s</div>
            </div>

            <button
              onClick={() => (window.location.href = successData.redirectUrl)}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors shadow-lg shadow-orange-950/30"
            >
              <span>Go to Dashboard Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : step === 1 ? (
          /* STEP 1 FORM: Auth Code & Email */
          <form onSubmit={handleNextStep} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 h-6">
                <Key className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>8-Character Auth Code</span>
              </label>
              <input
                type="text"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value.toUpperCase().trim())}
                placeholder="e.g. ASDF1234"
                maxLength={8}
                required
                className="w-full h-12 bg-zinc-950 border border-zinc-800 rounded-xl px-4 text-base font-mono font-extrabold tracking-widest text-orange-400 uppercase placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              <span className="text-[10px] text-zinc-500 block">
                Issued in your admin approval notification.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 h-6">
                <Mail className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@domain.com"
                required
                className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl px-4 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-95 border border-orange-500/40 mt-4"
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                boxShadow: '0 4px 16px rgba(234,88,12,0.35)',
              }}
            >
              <span>Continue to Account Setup</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* STEP 2 FORM: Profile Info & Security */
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 h-6">
                  <User className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Mercer"
                  className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 h-6">
                  <AtSign className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>Username</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alex_m"
                  className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 h-6">
                <Lock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Choose Account Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl pl-3.5 pr-10 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {password && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>Password Strength:</span>
                    <span className="font-bold">{strength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 h-6">
                <Lock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Confirm Password</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-95 border border-orange-500/40 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                  boxShadow: '0 4px 16px rgba(234,88,12,0.35)',
                }}
              >
                <span>{isSubmitting ? 'Activating Account...' : 'Activate SunShade Account'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Footer brand note */}
        <div className="pt-2 text-center text-[11px] font-mono text-zinc-500 flex items-center justify-center gap-1.5 border-t border-zinc-800/80">
          <Compass className="w-3.5 h-3.5 text-zinc-500" />
          <span>SunShade Ecosystem • Central SSO Gateway</span>
        </div>
      </div>
    </div>
  );
}
