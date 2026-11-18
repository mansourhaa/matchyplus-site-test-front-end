'use client';

import { isNativeMobileClient } from '@/lib/native';
import { useEffect, useState } from 'react';

import { useBootstrapSession } from '../hooks/use-bootstrap-session';
import { MatchyLogoWhite } from './matchy-logo';

const SPLASH_SHOWN_KEY = 'matchy_splash_shown';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  useBootstrapSession();
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    if (!isNativeMobileClient()) return;
    try {
      if (window.sessionStorage.getItem(SPLASH_SHOWN_KEY) === '1') return;
      window.sessionStorage.setItem(SPLASH_SHOWN_KEY, '1');
    } catch {
      // Ignore storage errors
    }

    const startId = window.setTimeout(() => setShowSplash(true), 0);
    const hideId = window.setTimeout(() => setShowSplash(false), 1200);
    return () => {
      window.clearTimeout(startId);
      window.clearTimeout(hideId);
    };
  }, []);

  return (
    <>
      {children}
      {showSplash && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between overflow-hidden px-6 py-16 text-white"
          style={{
            background: 'linear-gradient(135deg, #1655A2 0%, #2F76BB 55%, #5FB7A3 100%)',
          }}
        >
          {/* Decorative background circles */}
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full"
            style={{ background: 'rgba(255, 255, 255, 0.08)' }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full"
            style={{ background: 'rgba(255, 255, 255, 0.08)' }}
          />

          <div />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div
              className="mb-5 flex h-24 w-24 items-center justify-center rounded-3xl shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #5EBBA6 0%, #2F76BB 100%)',
              }}
            >
              <MatchyLogoWhite size="lg" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Matchy<sup className="ml-0.5 text-2xl font-bold">+</sup>
            </h1>
            <p className="mt-3 max-w-xs text-sm font-medium text-white/80">
              Geolocation-based professional networking
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white/80" />
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-white/80"
              style={{ animationDelay: '200ms' }}
            />
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-white/80"
              style={{ animationDelay: '400ms' }}
            />
          </div>
        </div>
      )}
    </>
  );
}
