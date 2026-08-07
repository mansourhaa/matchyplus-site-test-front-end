'use client';

import { OnboardingStepLayout } from '@/features/onboarding/components/onboarding-step-layout';
import { Check, Loader2, Shield } from 'lucide-react';
import { useState } from 'react';

type WelcomeStepProps = {
  loading: boolean;
  onAccept: () => Promise<boolean>;
};

const RULES = [
  {
    title: 'Sois Toi-Même',
    desc: 'Assure-toi que tes photos, ton âge et tes informations personnelles sont fidèles à toi-même.',
    icon: '🪪',
    color: '#2F76BB',
    bg: '#EEF5FF',
  },
  {
    title: 'Ta Sécurité Avant Tout',
    desc: 'Ne partage pas tes informations personnelles avec quelqu’un de suspect.',
    icon: '🔒',
    color: '#61BCA6',
    bg: '#E8F7F3',
  },
  {
    title: 'Sois Professionnel',
    desc: 'Traite les autres membres avec respect, exactement comme tu aimerais être traité.',
    icon: '🤝',
    color: '#F5A623',
    bg: '#FFF8EB',
  },
  {
    title: 'Sois Actif',
    desc: 'N’hésite pas à signaler les comportements irrespectueux pour maintenir une communauté saine.',
    icon: '🚩',
    color: '#E74C3C',
    bg: '#FFF0EE',
  },
] as const;

export function WelcomeStep({ loading, onAccept }: WelcomeStepProps) {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (accepting || loading) return;
    setAccepting(true);
    setError(null);
    const ok = await onAccept();
    if (!ok) {
      setError('Échec de la finalisation. Réessayez.');
      setAccepting(false);
    }
  };

  return (
    <OnboardingStepLayout step={0} totalSteps={0} stepLabel="Bienvenue" hideProgress>
      <div className="mx-auto w-full max-w-md">
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: '#EEF5FF' }}
        >
          <Shield size={24} color="#2F76BB" />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1A1A2E' }}>
          Bienvenue sur Matchy+ 🎉
        </h1>
        <p style={{ fontSize: '14px', color: '#888', marginTop: '8px', lineHeight: 1.6 }}>
          Voici les règles de la communauté. Merci de les respecter pour une expérience au top.
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
          J&apos;accepte les règles
        </button>

        {error && (
          <p className="mt-3 text-center text-xs text-[#E24E59]" role="alert">
            {error}
          </p>
        )}

        <p className="mt-4 text-center" style={{ fontSize: '12px', color: '#BBB' }}>
          En acceptant, vous reconnaissez avoir lu et compris ces règles.
        </p>
      </div>
    </OnboardingStepLayout>
  );
}
