'use client';

import { AuthLayout } from '@/features/auth/components/auth-layout';
import { MatchyLogo } from '@/features/auth/components/matchy-logo';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { LangPickerLight } from './lang-picker-light';

/** Small pill-segment progress indicator rendered inline above each step's title —
 * separate from (and in addition to) AuthLayout's own left-panel step bar, matching
 * the old app's Inscription1..5 (StepProgressBar + "Étape X sur Y" / "XX%" row). */
export function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-6">
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <div
            key={index}
            className="h-1.5 flex-1 rounded-full transition-all"
            style={{
              background: index < step ? '#2F76BB' : index === step - 1 ? '#61BCA6' : '#E0E0E0',
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p style={{ fontSize: '12px', color: '#888' }}>
          Étape {step} sur {total}
        </p>
        <p style={{ fontSize: '12px', color: '#2F76BB', fontWeight: 700 }}>
          {Math.round((step / total) * 100)}%
        </p>
      </div>
    </div>
  );
}

/** Gray-bordered card wrapper used to group each step's fields — the old app puts
 * every section (interests, goals, experience list, education list, ...) in one of
 * these instead of a flat list of inputs. */
export function StepCard({
  title,
  description,
  icon,
  children,
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#F9FAFC', border: '1px solid #F0F0F0' }}>
      {(title || icon) && (
        <div className="mb-4 flex items-start gap-3">
          {icon && (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #61BCA6, #2F76BB)' }}
            >
              {icon}
            </div>
          )}
          <div>
            {title && (
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E' }}>{title}</p>
            )}
            {description && (
              <p style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{description}</p>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

/** Side-by-side "Retour" + primary continue/finish button row, matching every old-app
 * step's CTA row (not stacked, unlike the plain login/register forms). */
export function StepCtaRow({
  onBack,
  onContinue,
  continueLabel,
  continueIcon,
  disabled,
  loading,
}: {
  onBack?: () => void;
  onContinue: () => void;
  continueLabel: string;
  continueIcon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
}) {
  const busy = Boolean(disabled || loading);
  return (
    <div className="mt-8 flex gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="rounded-2xl px-6 py-4 disabled:opacity-50"
          style={{ background: '#F5F5F5', color: '#888', fontSize: '14px', fontWeight: 700 }}
        >
          Retour
        </button>
      )}
      <button
        type="button"
        onClick={onContinue}
        disabled={busy}
        className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-white disabled:opacity-80"
        style={{
          background: !busy ? 'linear-gradient(90deg, #61BCA6, #2F76BB)' : '#D5D5D5',
          fontSize: '15px',
          fontWeight: 700,
        }}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          (continueIcon ?? <Check size={18} />)
        )}
        {continueLabel}
      </button>
    </div>
  );
}

type OnboardingStepLayoutProps = {
  step: number;
  totalSteps: number;
  stepLabel: string;
  onBack?: () => void;
  /** Optional label override for the mobile/desktop header back control (default Retour). */
  backLabel?: string;
  skipLabel?: string;
  onSkip?: () => void;
  /** Community-rules / bienvenue screen — no step progress chrome. */
  hideProgress?: boolean;
  children: ReactNode;
};

/**
 * Shared desktop/mobile shell for every onboarding step. Matches Matchy Inscription1..5:
 * desktop header = Matchy logo + LangPickerLight; mobile header = Retour + LangPickerLight.
 * Bottom CTA "Retour" still lives in each step's StepCtaRow when provided.
 */
export function OnboardingStepLayout({
  step,
  totalSteps,
  stepLabel,
  onBack,
  backLabel = 'Retour',
  skipLabel,
  onSkip,
  hideProgress = false,
  children,
}: OnboardingStepLayoutProps) {
  return (
    <AuthLayout
      activeFeature={Math.max(0, step - 1)}
      step={hideProgress ? undefined : step}
      totalSteps={hideProgress ? undefined : totalSteps}
      stepLabel={stepLabel}
      hideVideoFeature
      showPanelLangPicker={false}
    >
      {/* Desktop — Matchy: logo left, language right */}
      <div className="hidden h-full flex-col bg-[#FAFBFC] md:flex">
        <div
          className="flex items-center justify-between bg-white px-10 py-5"
          style={{ borderBottom: '1px solid #F0F0F0' }}
        >
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1"
                style={{ fontSize: '14px', color: '#888' }}
              >
                <ArrowLeft size={18} />
                <span>{backLabel}</span>
              </button>
            )}
            <MatchyLogo size="sm" />
          </div>
          <div className="flex items-center gap-3">
            {onSkip && skipLabel && (
              <button
                type="button"
                onClick={onSkip}
                style={{ fontSize: '13px', fontWeight: 700, color: '#2F76BB' }}
              >
                {skipLabel}
              </button>
            )}
            <LangPickerLight />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-10 py-10">{children}</div>
        </div>
      </div>

      {/* Mobile — Matchy: Retour left, language right */}
      <div className="overflow-y-auto bg-white md:hidden" style={{ minHeight: '100dvh' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1"
              style={{ fontSize: '14px', color: '#888' }}
            >
              <ArrowLeft size={18} />
              <span>{backLabel}</span>
            </button>
          ) : (
            <MatchyLogo size="sm" />
          )}
          <div className="flex items-center gap-2">
            {onSkip && skipLabel && (
              <button
                type="button"
                onClick={onSkip}
                style={{ fontSize: '13px', fontWeight: 700, color: '#2F76BB' }}
              >
                {skipLabel}
              </button>
            )}
            <LangPickerLight />
          </div>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </AuthLayout>
  );
}
