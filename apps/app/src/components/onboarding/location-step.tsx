'use client';

import {
  CONTACT_OPTIONS,
  DAYS,
  LANGUAGE_OPTIONS,
  TIME_SLOTS,
} from '@/features/onboarding/constants';
import { locationStepSchema } from '@/features/onboarding/schemas';
import type { OnboardingProfile } from '@/features/onboarding/types';
import { Loader2, Rocket } from 'lucide-react';
import { useState } from 'react';

import { OnboardingStepLayout } from './onboarding-step-layout';

type LocationStepProps = {
  profile: OnboardingProfile | null;
  stepNumber: number;
  totalSteps: number;
  loading: boolean;
  onFinish: (patch: {
    city?: string;
    availabilityDays: string[];
    availabilityHours: string[];
    contactModes: string[];
    languages: string[];
  }) => Promise<boolean>;
  onBack: () => void;
};

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1.5"
      style={{
        border: `1.5px solid ${selected ? '#2F76BB' : '#E8E8E8'}`,
        background: selected ? '#F3F8FF' : 'white',
        color: selected ? '#2F76BB' : '#667085',
        fontSize: '13px',
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );
}

export function LocationStep({
  profile,
  stepNumber,
  totalSteps,
  loading,
  onFinish,
  onBack,
}: LocationStepProps) {
  const [city, setCity] = useState(profile?.city ?? '');
  const [availabilityDays, setAvailabilityDays] = useState<string[]>(
    profile?.availability_days ?? [],
  );
  const [availabilityHours, setAvailabilityHours] = useState<string[]>(
    profile?.availability_hours ?? [],
  );
  const [contactModes, setContactModes] = useState<string[]>(profile?.contact_modes ?? []);
  const [languages, setLanguages] = useState<string[]>(profile?.languages ?? []);
  const [error, setError] = useState<string | null>(null);

  const offerService = profile?.offer_service ?? false;

  const toggle = (list: string[], setList: (value: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleSubmit = async () => {
    const parsed = locationStepSchema.safeParse({
      city,
      offerService,
      availabilityDays,
      availabilityHours,
      contactModes,
      languages,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Sélectionnez au moins un jour.');
      return;
    }

    setError(null);
    const finished = await onFinish({
      city: city || undefined,
      availabilityDays,
      availabilityHours,
      contactModes,
      languages,
    });
    if (!finished) {
      setError('Échec de la finalisation. Réessayez.');
    }
  };

  return (
    <OnboardingStepLayout
      step={stepNumber}
      totalSteps={totalSteps}
      stepLabel="Localisation & Préférences"
      onBack={onBack}
    >
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8">
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1A1A2E' }}>
            Localisation &amp; Préférences
          </h1>
          <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginTop: '6px' }}>
            Dernière étape ! Configurez votre zone et vos disponibilités.
          </p>
        </div>

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>Ville</label>
          <input
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Tunis, Sfax, Sousse..."
            className="mt-2 w-full rounded-2xl px-4 py-3.5 text-[#353535] outline-none"
            style={{ border: '2px solid #2F76BB', background: '#F5F9FF', fontSize: '15px' }}
          />
        </div>

        {offerService && (
          <div className="mb-4">
            <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
              Mes disponibilités
            </label>
            <p style={{ fontSize: '12px', color: '#AAA', marginTop: '2px' }}>
              Quand êtes-vous disponible pour des missions ?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <Chip
                  key={day.short}
                  label={day.long}
                  selected={availabilityDays.includes(day.short)}
                  onClick={() => toggle(availabilityDays, setAvailabilityDays, day.short)}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIME_SLOTS.map((slot) => (
                <Chip
                  key={slot.value}
                  label={slot.label}
                  selected={availabilityHours.includes(slot.value)}
                  onClick={() => toggle(availabilityHours, setAvailabilityHours, slot.value)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            Préférences de contact
          </label>
          <p style={{ fontSize: '12px', color: '#AAA', marginTop: '2px' }}>
            Comment préférez-vous être contacté ?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CONTACT_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={contactModes.includes(option.value)}
                onClick={() => toggle(contactModes, setContactModes, option.value)}
              />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            Langues parlées
          </label>
          <p style={{ fontSize: '12px', color: '#AAA', marginTop: '2px' }}>
            Sélectionnez toutes les langues que vous pratiquez
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={`${option.flag} ${option.label}`}
                selected={languages.includes(option.value)}
                onClick={() => toggle(languages, setLanguages, option.value)}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="mb-3 text-center" style={{ fontSize: '12px', color: '#E24E59' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white"
          style={{
            background: !loading ? 'linear-gradient(90deg, #61BCA6, #2F76BB)' : '#D5D5D5',
            fontSize: '14px',
            fontWeight: 700,
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
          Lancer Matchy+
        </button>
      </div>
    </OnboardingStepLayout>
  );
}
