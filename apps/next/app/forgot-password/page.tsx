import { Metadata } from 'next';
import React, { Suspense } from 'react';
import ForgotPasswordClient from './ForgotPasswordClient';

export const metadata: Metadata = {
  title: 'Reset Password | SunShade Ecosystem',
  description: 'Request a password reset link for your SunShade Ecosystem account.',
};

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen w-full flex flex-col items-center justify-center p-4 text-white font-sans"
          style={{
            background: 'radial-gradient(ellipse at top, #1c140e 0%, #111111 50%, #0a0a0a 100%)',
          }}
        >
          <img src="/logo.png" alt="SunShade Systems" className="w-64 h-auto mb-6 object-contain" />
          <div className="text-xs font-mono text-zinc-400 animate-pulse">
            Loading Password Recovery...
          </div>
        </div>
      }
    >
      <ForgotPasswordClient />
    </Suspense>
  );
}
