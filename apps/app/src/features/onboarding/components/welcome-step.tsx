'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { OnboardingStepLayout } from '@/features/onboarding/components/onboarding-step-layout';
import { Check, Flag, Handshake, IdCard, Loader2, Lock, Shield } from 'lucide-react';
import { useState } from 'react';

type WelcomeStepProps = {
  loading: boolean;
  onAccept: () => Promise<boolean>;
};

export function WelcomeStep({ loading, onAccept }: WelcomeStepProps) {
  const { t } = useI18n();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const RULES = [
    {
      title: t('onboarding.welcome.rule1Title'),
      desc: t('onboarding.welcome.rule1Desc'),
      icon: <IdCard size={20} className="text-[#2F76BB]" />,
      color: '#2F76BB',
      bg: '#F0F6FF',
      border: '#DCEBFA',
    },
    {
      title: t('onboarding.welcome.rule2Title'),
      desc: t('onboarding.welcome.rule2Desc'),
      icon: <Lock size={18} className="text-[#4EAD96]" />,
      color: '#4EAD96',
      bg: '#EAF7F3',
      border: '#D4EFE8',
    },
    {
      title: t('onboarding.welcome.rule3Title'),
      desc: t('onboarding.welcome.rule3Desc'),
      icon: <Handshake size={20} className="text-[#E59824]" />,
      color: '#E59824',
      bg: '#FFF8EB',
      border: '#FCECD2',
    },
    {
      title: t('onboarding.welcome.rule4Title'),
      desc: t('onboarding.welcome.rule4Desc'),
      icon: <Flag size={18} className="text-[#E75B5B]" />,
      color: '#E75B5B',
      bg: '#FFF0EE',
      border: '#FCDCD7',
    },
  ] as const;

  const handleAccept = async () => {
    if (accepting || loading) return;
    setAccepting(true);
    setError(null);
    const ok = await onAccept();
    if (!ok) {
      setError(t('onboarding.welcome.errorSubmit'));
      setAccepting(false);
    }
  };

  return (
    <OnboardingStepLayout
      step={0}
      totalSteps={0}
      stepLabel={t('onboarding.welcome.title')}
      hideProgress
    >
      <div className="mx-auto w-full max-w-md">
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: '#EEF5FF' }}
        >
          <Shield size={22} color="#2F76BB" strokeWidth={2.2} />
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-[#1A1A2E] md:text-3xl">
          <span>{t('onboarding.welcome.title')}</span>
          <span className="text-2xl">🎉</span>
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#718096]">
          {t('onboarding.welcome.rulesDesc')}
        </p>

        <div className="mt-6 mb-8 space-y-3.5">
          {RULES.map((rule) => (
            <div
              key={rule.title}
              className="flex items-center gap-4 rounded-2xl p-4 transition-all"
              style={{ background: rule.bg, border: `1px solid ${rule.border}` }}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-xs">
                {rule.icon}
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold" style={{ color: rule.color }}>
                  {rule.title}
                </p>
                <p className="mt-0.5 text-[12px] leading-normal text-[#4A5568]">{rule.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void handleAccept()}
          disabled={accepting || loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-white shadow-md transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-70"
          style={{
            background: 'linear-gradient(90deg, #61BCA6 0%, #2F76BB 100%)',
            fontSize: '15px',
          }}
        >
          {accepting || loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Check size={18} strokeWidth={2.5} />
          )}
          <span>{t('onboarding.welcome.acceptRules')}</span>
        </button>

        {error && (
          <p className="mt-3 text-center text-xs text-[#E24E59]" role="alert">
            {error}
          </p>
        )}

        <p className="mt-4 text-center text-xs text-[#A0AEC0]">
          {t('onboarding.welcome.acceptDisclaimer')}
        </p>
      </div>
    </OnboardingStepLayout>
  );
}
