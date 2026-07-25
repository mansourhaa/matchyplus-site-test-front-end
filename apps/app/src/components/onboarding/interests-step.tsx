'use client';

import {
  GOAL_CATEGORIES,
  INTERESTS_SUGGESTIONS,
  MAX_INTERESTS,
  SERVICE_TYPES,
} from '@/features/onboarding/constants';
import { interestsStepSchema } from '@/features/onboarding/schemas';
import type { OnboardingProfile } from '@/features/onboarding/types';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { OnboardingStepLayout } from './onboarding-step-layout';

type InterestsStepProps = {
  profile: OnboardingProfile | null;
  stepNumber: number;
  totalSteps: number;
  loading: boolean;
  onNext: (patch: {
    interests: string[];
    selectedGoals: string[];
    offerService: boolean;
    serviceType?: string;
    price?: string;
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

export function InterestsStep({
  profile,
  stepNumber,
  totalSteps,
  loading,
  onNext,
  onBack,
}: InterestsStepProps) {
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [interestInput, setInterestInput] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(profile?.selected_goals ?? []);
  const [offerService, setOfferService] = useState(profile?.offer_service ?? false);
  const [serviceType, setServiceType] = useState(profile?.service_type ?? '');
  const [price, setPrice] = useState(profile?.price ?? '');
  const [error, setError] = useState<string | null>(null);

  const addInterest = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || interests.length >= MAX_INTERESTS || interests.includes(trimmed)) return;
    setInterests([...interests, trimmed]);
    setInterestInput('');
  };

  const removeInterest = (value: string) => {
    setInterests(interests.filter((interest) => interest !== value));
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals((current) =>
      current.includes(goal) ? current.filter((value) => value !== goal) : [...current, goal],
    );
  };

  const handleSubmit = async () => {
    const parsed = interestsStepSchema.safeParse({
      interests,
      selectedGoals,
      offerService,
      serviceType: serviceType || undefined,
      price: price || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Complétez les champs obligatoires.');
      return;
    }

    setError(null);
    const saved = await onNext({
      interests,
      selectedGoals,
      offerService,
      serviceType: offerService ? serviceType : undefined,
      price: offerService ? price : undefined,
    });
    if (!saved) {
      setError('Échec de la sauvegarde. Réessayez.');
    }
  };

  const suggestions = INTERESTS_SUGGESTIONS.filter((s) => !interests.includes(s)).slice(0, 4);

  return (
    <OnboardingStepLayout
      step={stepNumber}
      totalSteps={totalSteps}
      stepLabel="Vos objectifs"
      onBack={onBack}
    >
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8">
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1A1A2E' }}>Vos objectifs</h1>
          <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginTop: '6px' }}>
            Dites-nous ce que vous cherchez sur Matchy+.
          </p>
        </div>

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            Centres d&apos;intérêts ou services (max {MAX_INTERESTS})
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={interestInput}
              onChange={(event) => setInterestInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addInterest(interestInput);
                }
              }}
              placeholder="Ajouter un intérêt..."
              disabled={interests.length >= MAX_INTERESTS}
              className="flex-1 rounded-2xl px-4 py-2.5 text-[#353535] outline-none"
              style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '14px' }}
            />
            <button
              type="button"
              onClick={() => addInterest(interestInput)}
              disabled={interests.length >= MAX_INTERESTS}
              className="rounded-2xl px-4 py-2.5"
              style={{ background: '#2F76BB', color: 'white', fontSize: '13px', fontWeight: 700 }}
            >
              Ajouter
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {interests.map((interest) => (
              <Chip
                key={interest}
                label={`${interest} ×`}
                selected
                onClick={() => removeInterest(interest)}
              />
            ))}
            {suggestions.map((suggestion) => (
              <Chip
                key={suggestion}
                label={suggestion}
                selected={false}
                onClick={() => addInterest(suggestion)}
              />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            Que cherchez-vous ?
          </label>
          {GOAL_CATEGORIES.map((category) => (
            <div key={category.label} className="mt-3">
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#353535' }}>
                {category.emoji} {category.label}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {category.options.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    selected={selectedGoals.includes(option)}
                    onClick={() => toggleGoal(option)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <label className="flex items-center justify-between">
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#353535' }}>
              Offrir un service ?
            </span>
            <input
              type="checkbox"
              checked={offerService}
              onChange={(event) => setOfferService(event.target.checked)}
            />
          </label>
        </div>

        {offerService && (
          <div
            className="mb-4 space-y-3 rounded-2xl p-3"
            style={{ background: '#F7FBFF', border: '1px solid #DCEAF8' }}
          >
            <div>
              <label style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>
                Type de service
              </label>
              <select
                value={serviceType}
                onChange={(event) => setServiceType(event.target.value)}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-[#353535] outline-none"
                style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '14px' }}
              >
                <option value="">Choisir un type de service</option>
                {SERVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>
                Prix approximatif (DT)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={price}
                onChange={(event) => setPrice(event.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="Montant"
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-[#353535] outline-none"
                style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '14px' }}
              />
            </div>
          </div>
        )}

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
          {loading && <Loader2 size={16} className="animate-spin" />}
          Enregistrer et continuer
        </button>
      </div>
    </OnboardingStepLayout>
  );
}
