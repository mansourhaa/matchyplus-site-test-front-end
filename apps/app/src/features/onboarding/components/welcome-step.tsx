'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { OnboardingStepLayout } from '@/features/onboarding/components/onboarding-step-layout';
import { Check, Loader2, Shield } from 'lucide-react';
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
      icon: '🪪',
      color: '#2F76BB',
      bg: '#EEF5FF',
    },
    {
      title: t('onboarding.welcome.rule2Title'),
      desc: t('onboarding.welcome.rule2Desc'),
      icon: '🔒',
      color: '#61BCA6',
      bg: '#E8F7F3',
    },
    {
      title: t('onboarding.welcome.rule3Title'),
      desc: t('onboarding.welcome.rule3Desc'),
      icon: '🤝',
      color: '#F5A623',
      bg: '#FFF8EB',
    },
    {
      title: t('onboarding.welcome.rule4Title'),
      desc: t('onboarding.welcome.rule4Desc'),
      icon: '🚩',
      color: '#E74C3C',
      bg: '#FFF0EE',
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
          <Shield size={24} color="#2F76BB" />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1A1A2E' }}>
          {t('onboarding.welcome.title')} 🎉
        </h1>
        <p style={{ fontSize: '14px', color: '#888', marginTop: '8px', lineHeight: 1.6 }}>
          {t('onboarding.welcome.rulesDesc')}
        </p>

        <div className="mt-8 mb-8 space-y-4">
          {RULES.map((rule) => (
            <div
              key={rule.title}
              className="flex gap-4 rounded-2xl p-4"
              style={{ background: rule.bg, border: `1px solid ${rule.color}20` }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white"
                style={{ fontSize: '20px' }}
              >
                {rule.icon}
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: rule.color }}>{rule.title}</p>
                <p style={{ fontSize: '12px', color: '#555', lineHeight: 1.5, marginTop: '2px' }}>
                  {rule.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void handleAccept()}
          disabled={accepting || loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-white"
          style={{
            background: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
            fontSize: '15px',
            fontWeight: 700,
            opacity: accepting || loading ? 0.75 : 1,
          }}
        >
          {accepting || loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Check size={18} />
          )}
          {t('onboarding.welcome.acceptRules')}
        </button>

        {error && (
          <p className="mt-3 text-center text-xs text-[#E24E59]" role="alert">
            {error}
          </p>
        )}

        <p className="mt-4 text-center" style={{ fontSize: '12px', color: '#BBB' }}>
          {t('onboarding.welcome.acceptDisclaimer')}
        </p>
      </div>
    </OnboardingStepLayout>
  );
}
