'use client';

import { AuthLayout } from '@/components/auth/auth-layout';
import { MatchyLogo } from '@/components/auth/matchy-logo';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

type OnboardingStepLayoutProps = {
  step: number;
  totalSteps: number;
  stepLabel: string;
  onBack?: () => void;
  children: ReactNode;
};

/**
 * Shared desktop/mobile shell for every onboarding step — the same scaffold
 * login-form.tsx/register-form.tsx each repeat inline, extracted here since 5 step
 * components would otherwise duplicate it.
 */
export function OnboardingStepLayout({
  step,
  totalSteps,
  stepLabel,
  onBack,
  children,
}: OnboardingStepLayoutProps) {
  const header = (
    <div className="flex items-center gap-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg px-2 py-1"
          style={{
            border: '1px solid #E8E8E8',
            color: '#667085',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          <ArrowLeft size={14} />
          Retour
        </button>
      )}
      <MatchyLogo size="sm" />
    </div>
  );

  return (
    <AuthLayout
      activeFeature={0}
      step={step}
      totalSteps={totalSteps}
      stepLabel={stepLabel}
      panelImage="https://images.unsplash.com/photo-1633545515526-ce9cd7fc67d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800"
      hideVideoFeature
    >
      {/* Desktop */}
      <div className="hidden h-full flex-col bg-white md:flex">
        <div
          className="flex items-center justify-between px-10 py-5"
          style={{ borderBottom: '1px solid #F5F5F5' }}
        >
          {header}
        </div>
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-10 py-10">
          {children}
        </div>
      </div>

      {/* Mobile */}
      <div
        className="flex flex-col overflow-y-auto bg-white md:hidden"
        style={{ minHeight: '100dvh' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">{header}</div>
        <div className="flex flex-1 flex-col justify-center px-7 py-8">{children}</div>
      </div>
    </AuthLayout>
  );
}
