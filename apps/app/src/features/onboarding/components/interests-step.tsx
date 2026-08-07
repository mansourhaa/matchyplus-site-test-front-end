'use client';

import {
  GOAL_CATEGORIES,
  INTERESTS_SUGGESTIONS,
  MAX_INTERESTS,
  SERVICE_TYPES,
} from '@/features/onboarding/constants';
import { interestsStepSchema } from '@/features/onboarding/schemas';
import type { OnboardingProfile } from '@/features/onboarding/types';
import { Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { OnboardingStepLayout, StepCard, StepCtaRow, StepProgress } from './onboarding-step-layout';

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
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same late-arriving-profile hydration fix as identity-step: fetchOnboardingProfile
  // is async, so a user resuming at this step can mount before it resolves.
  const hydratedRef = useRef(Boolean(profile));
  useEffect(() => {
    if (hydratedRef.current || !profile) return;
    hydratedRef.current = true;
    setInterests(profile.interests ?? []);
    setSelectedGoals(profile.selected_goals ?? []);
    setOfferService(profile.offer_service ?? false);
    setServiceType(profile.service_type ?? '');
    setPrice(profile.price ?? '');
  }, [profile]);

  // "Offrir un service" only applies to INDIVIDUAL (Employé) profiles — matching the
  // old app's Inscription2, which hides this card entirely for Employeur.
  const isIndividual = (profile?.profile_type ?? 'INDIVIDUAL') === 'INDIVIDUAL';

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

  const handleNext = async () => {
    const effectiveOfferService = isIndividual && offerService;
    const parsed = interestsStepSchema.safeParse({
      interests,
      selectedGoals,
      offerService: effectiveOfferService,
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
      offerService: effectiveOfferService,
      serviceType: effectiveOfferService ? serviceType : undefined,
      price: effectiveOfferService ? price : undefined,
    });
    if (!saved) {
      setError('Échec de la sauvegarde. Réessayez.');
    }
  };

  const suggestions = INTERESTS_SUGGESTIONS.filter((s) => !interests.includes(s)).slice(0, 4);

  return (
    <OnboardingStepLayout step={stepNumber} totalSteps={totalSteps} stepLabel="Vos objectifs">
      <div className="mx-auto w-full max-w-2xl">
        <StepProgress step={stepNumber} total={totalSteps} />

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E', marginBottom: '6px' }}>
          Vos objectifs
        </h1>
        <p
          className="flex flex-wrap items-center gap-1.5"
          style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}
        >
          <span>Dites-nous ce que vous cherchez sur</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-matchy.svg"
            alt="Matchy+"
            height={16}
            style={{ height: 16, width: 'auto', display: 'inline-block' }}
          />
          <span>.</span>
        </p>

        <div className="space-y-8 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
          {/* Left: interests + offer service */}
          <div className="space-y-6">
            <StepCard
              title="Centres d'intérêts ou services"
              description={`Max ${MAX_INTERESTS} — vos compétences et domaines d'activité.`}
            >
              <div className="mb-3 flex gap-2">
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
                  className="flex-1 rounded-xl px-3 py-2 text-[#353535] outline-none"
                  style={{ border: '1.5px solid #E0E0E0', background: 'white', fontSize: '13px' }}
                />
                <button
                  type="button"
                  onClick={() => interestInput.trim() && addInterest(interestInput)}
                  disabled={interests.length >= MAX_INTERESTS}
                  className="rounded-xl px-4 py-2"
                  style={{
                    background: '#E8F7F3',
                    color: '#61BCA6',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  Ajouter
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <span
                    key={interest}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                    style={{
                      background: '#EEF5FF',
                      border: '1px solid #C5D8F0',
                      fontSize: '13px',
                      color: '#2F76BB',
                      fontWeight: 600,
                    }}
                  >
                    {interest}
                    <button type="button" onClick={() => removeInterest(interest)}>
                      <X size={12} color="#2F76BB" />
                    </button>
                  </span>
                ))}
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addInterest(suggestion)}
                    className="rounded-full px-3 py-1.5"
                    style={{ border: '1.5px dashed #D0D0D0', fontSize: '12px', color: '#AAA' }}
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: '#61BCA6', marginTop: '8px' }}>
                {MAX_INTERESTS - interests.length} emplacement(s) disponible(s)
              </p>
            </StepCard>

            {isIndividual && (
              <div
                className="rounded-2xl p-5"
                style={{ background: '#F9FAFC', border: '1px solid #F0F0F0' }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A2E' }}>
                      Offrir un service ?
                    </p>
                    <p style={{ fontSize: '12px', color: '#888' }}>
                      Élargissez votre activité autour de vous.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={offerService}
                    dir="ltr"
                    onClick={() => setOfferService(!offerService)}
                    className="relative shrink-0"
                    style={{ width: '48px', height: '28px' }}
                  >
                    <div
                      className="absolute inset-0 rounded-full transition-colors"
                      style={{ background: offerService ? '#2F76BB' : '#E0E0E0' }}
                    />
                    <div
                      className="absolute top-1 left-0 h-6 w-6 rounded-full bg-white shadow transition-transform"
                      style={{ transform: offerService ? 'translateX(22px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>

                {offerService && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label style={{ fontSize: '12px', color: '#888' }}>Type de service</label>
                      <div className="relative mt-1">
                        <button
                          type="button"
                          onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5"
                          style={{
                            border: '1.5px solid #E0E0E0',
                            background: 'white',
                            fontSize: '13px',
                            color: serviceType ? '#353535' : '#BBB',
                          }}
                        >
                          <span>{serviceType || 'Choisir un type de service'}</span>
                          <ChevronDown size={16} color="#888" />
                        </button>
                        {showServiceDropdown && (
                          <div
                            className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl bg-white py-1"
                            style={{
                              border: '1.5px solid #E0E0E0',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                            }}
                          >
                            {SERVICE_TYPES.map((type) => (
                              <button
                                key={type}
                                type="button"
                                className="block w-full px-3 py-2 text-left"
                                style={{
                                  fontSize: '13px',
                                  color: serviceType === type ? '#2F76BB' : '#353535',
                                  fontWeight: serviceType === type ? 700 : 400,
                                  background: serviceType === type ? '#F5F9FF' : 'transparent',
                                }}
                                onClick={() => {
                                  setServiceType(type);
                                  setShowServiceDropdown(false);
                                }}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#888' }}>
                        Prix approximatif (DT)
                      </label>
                      <div
                        className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
                        style={{ border: '1.5px solid #E0E0E0', background: 'white' }}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          value={price}
                          onChange={(event) =>
                            setPrice(event.target.value.replace(/[^0-9.,]/g, ''))
                          }
                          placeholder="Montant"
                          className="flex-1 bg-transparent text-[#353535] outline-none"
                          style={{ fontSize: '13px' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#2F76BB' }}>
                          DT
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: goals */}
          <StepCard
            title="Que cherchez-vous ?"
            description="Dites-nous ce dont vous avez besoin près de chez vous"
          >
            <div className="space-y-5">
              {GOAL_CATEGORIES.map((category) => (
                <div key={category.label}>
                  <div className="mb-2 flex items-center gap-2">
                    <span style={{ fontSize: '18px' }}>{category.emoji}</span>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#555' }}>
                      {category.label}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {category.options.map((option) => {
                      const isSelected = selectedGoals.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleGoal(option)}
                          className="rounded-full px-3 py-1.5 transition-all"
                          style={{
                            fontSize: '12px',
                            fontWeight: isSelected ? 700 : 400,
                            background: isSelected ? '#2F76BB' : 'white',
                            color: isSelected ? 'white' : '#666',
                            border: isSelected ? 'none' : '1.5px solid #E0E0E0',
                          }}
                        >
                          {isSelected && <Check size={11} className="mr-1 inline" />}
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </StepCard>
        </div>

        {error && (
          <p className="mt-4" style={{ fontSize: '12px', color: '#E74C3C', fontWeight: 600 }}>
            {error}
          </p>
        )}

        <StepCtaRow
          onBack={onBack}
          onContinue={handleNext}
          continueLabel={loading ? 'Synchronisation...' : 'Lancer Matchy+'}
          disabled={loading}
          loading={loading}
        />
      </div>
    </OnboardingStepLayout>
  );
}
