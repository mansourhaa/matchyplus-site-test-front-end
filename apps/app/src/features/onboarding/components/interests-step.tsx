'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { formatRole } from '@/features/matching/lib/format-role';
import {
  GOAL_CATEGORIES,
  INTERESTS_SUGGESTIONS,
  MAX_INTERESTS,
  SERVICE_TYPES,
} from '@/features/onboarding/constants';
import { interestsStepSchema } from '@/features/onboarding/schemas';
import type { OnboardingProfile } from '@/features/onboarding/types';
import { type OnboardingSuggestions, videoInterests } from '@/features/onboarding/video-analysis';
import { Briefcase, Check, ChevronDown, HandHeart, Search, Sparkles, Users, X } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { OnboardingStepLayout, StepCard, StepCtaRow, StepProgress } from './onboarding-step-layout';

/** Goal group icons, as in the 2.0.8 demo (no emoji). */
const GOAL_GROUP_ICONS: Record<string, ReactNode> = {
  'Trouver du travail': <Briefcase size={16} color="#2F76BB" />,
  'Services & missions': <Users size={16} color="#2F76BB" />,
};

type InterestsStepProps = {
  /** Fields found in the profile video (identity step); used only for empty fields. */
  aiSuggestions?: OnboardingSuggestions | null;
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
  onSaveDraft?: (patch: Partial<OnboardingProfile>) => void;
};

/** Goals: what the person saved, or for a new step a default from the profile type —
 * someone offering services is looking for work, someone looking for a service is hiring. */
function initialGoals(
  profile: OnboardingProfile | null | undefined,
  isNewStep: boolean,
  isIndividual: boolean,
): string[] {
  if (profile?.selected_goals?.length || !isNewStep) return profile?.selected_goals ?? [];
  return [isIndividual ? 'Trouver un job' : "Recruter quelqu'un"];
}

/** Goals pre-filled from the video analysis (the most the profile type allows). */
function videoGoals(isIndividual: boolean, homeService: boolean): string[] {
  const goals = isIndividual
    ? ['Trouver un job', 'Proposer mes services', 'Travailler comme prestataire']
    : ["Recruter quelqu'un", 'Demander un service', 'Trouver un prestataire'];
  return homeService ? [...goals, 'Service à domicile'] : goals;
}

export function InterestsStep({
  profile,
  stepNumber,
  totalSteps,
  loading,
  onNext,
  onBack,
  onSaveDraft,
  aiSuggestions = null,
}: InterestsStepProps) {
  const { t, locale } = useI18n();
  const isIndividual = (profile?.profile_type ?? 'INDIVIDUAL') === 'INDIVIDUAL';
  const isNewStep = !profile?.interests?.length && !profile?.selected_goals?.length;

  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [interestInput, setInterestInput] = useState('');
  const [lastRemovedInterest, setLastRemovedInterest] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    initialGoals(profile, isNewStep, isIndividual),
  );
  const [offerService, setOfferService] = useState(
    isNewStep ? isIndividual : (profile?.offer_service ?? false),
  );
  // « Je cherche un prestataire » (PROVIDER): the same card becomes « Chercher un prestataire »
  // (service type + budget), as in the 2.0.8 demo. Saved in service_type / price, without
  // offer_service. On by default for a new step, like « Offrir un service ».
  const [seekService, setSeekService] = useState(
    isNewStep ? !isIndividual : !isIndividual && Boolean(profile?.service_type),
  );
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
    setSelectedGoals(initialGoals(profile, isNewStep, isIndividual));
    setOfferService(isNewStep ? isIndividual : (profile.offer_service ?? false));
    setSeekService(isNewStep ? !isIndividual : !isIndividual && Boolean(profile.service_type));
    setServiceType(profile.service_type ?? '');
    setPrice(profile.price ?? '');
  }, [profile, isNewStep, isIndividual]);

  // AI autofill from the profile video (identity step), only where the person left it empty:
  // the price, and the job heard in the video as the first interest (as in the 2.0.8 demo).
  // After a page-language switch, that interest follows the language.
  const appliedSuggestionsRef = useRef<OnboardingSuggestions | null>(null);
  const goalsTouchedRef = useRef(false);
  const appliedInterestsRef = useRef<string[]>([]);
  useEffect(() => {
    const suggestions = aiSuggestions;
    if (!suggestions || !hydratedRef.current || appliedSuggestionsRef.current === suggestions) {
      return;
    }
    appliedSuggestionsRef.current = suggestions;
    const previous = appliedInterestsRef.current;
    const next = videoInterests(suggestions, locale);
    appliedInterestsRef.current = next;
    setPrice((current) => current || suggestions.price || '');
    setInterests((current) => {
      // Same analysis, other page language: the interests it added (not removed since)
      // follow the language, in the same order.
      if (previous.length && current.some((entry) => previous.includes(entry))) {
        return current
          .map((entry) => {
            const index = previous.indexOf(entry);
            return index === -1 ? entry : next[index];
          })
          .filter((entry): entry is string => Boolean(entry));
      }
      return current.length ? current : next.slice(0, MAX_INTERESTS);
    });
    // Goals the person has not touched yet: every goal of their profile type, and home
    // service when the job heard in the video is one.
    if (!goalsTouchedRef.current && isNewStep) {
      setSelectedGoals(videoGoals(isIndividual, Boolean(suggestions.homeService)));
    }
    // Service type: the job heard in the video (provider), or the service asked for in the
    // voice message (« Je cherche un prestataire »).
    setServiceType((current) => current || suggestions.serviceType || '');
    if (isIndividual) {
      if (suggestions.offerService && isNewStep) setOfferService(true);
    } else if (suggestions.serviceType && isNewStep) {
      setSeekService(true);
    }
  }, [aiSuggestions, profile, isIndividual, isNewStep, locale]);

  const addInterest = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setInterests((current) => {
      if (
        current.length >= MAX_INTERESTS ||
        current.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())
      ) {
        return current;
      }
      return [...current, trimmed];
    });
    setLastRemovedInterest((prev) =>
      prev && prev.toLowerCase() === trimmed.toLowerCase() ? null : prev,
    );
    setInterestInput('');
  };

  const removeInterest = (value: string) => {
    setLastRemovedInterest(value);
    setInterests((current) =>
      current.filter((interest) => interest.toLowerCase() !== value.toLowerCase()),
    );
  };

  const toggleGoal = (goal: string) => {
    goalsTouchedRef.current = true;
    setSelectedGoals((current) =>
      current.includes(goal) ? current.filter((value) => value !== goal) : [...current, goal],
    );
  };

  const serviceCardOn = isIndividual ? offerService : seekService;
  // What the service card saves: provider → offer (type, price);
  // « Je cherche un prestataire » → type + budget (price), offer_service stays false.
  // Card off → '' (not undefined): JSON.stringify drops undefined keys, so the API would
  // keep the previous service_type / price in the database.
  const serviceCardPatch = () => {
    const effectiveOfferService = isIndividual && offerService;
    const cardOn = effectiveOfferService || (!isIndividual && seekService);
    return {
      offerService: effectiveOfferService,
      serviceType: cardOn ? serviceType : '',
      price: cardOn ? price : '',
    };
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
      setError(parsed.error.issues[0]?.message ?? t('onboarding.interests.error'));
      return;
    }

    setError(null);
    const saved = await onNext({ interests, selectedGoals, ...serviceCardPatch() });
    if (!saved) {
      setError(t('onboarding.interests.errorSubmit'));
    }
  };

  // Show a short suggestion row, but put a just-removed catalog tag first so deleting
  // an interest immediately returns it to the visible suggestions (instead of staying
  // buried past .slice(0, 4)).
  const unusedSuggestions = [
    ...(aiSuggestions?.proposals?.job ?? []),
    ...INTERESTS_SUGGESTIONS,
  ].filter(
    (suggestion) => !interests.some((entry) => entry.toLowerCase() === suggestion.toLowerCase()),
  );
  const suggestions = [
    ...unusedSuggestions.filter(
      (suggestion) =>
        !!lastRemovedInterest && suggestion.toLowerCase() === lastRemovedInterest.toLowerCase(),
    ),
    ...unusedSuggestions.filter(
      (suggestion) =>
        !lastRemovedInterest || suggestion.toLowerCase() !== lastRemovedInterest.toLowerCase(),
    ),
  ].slice(0, 4);

  const handleBack = () => {
    const card = serviceCardPatch();
    onSaveDraft?.({
      interests,
      selected_goals: selectedGoals,
      offer_service: card.offerService,
      service_type: card.serviceType,
      price: card.price,
    });
    onBack();
  };

  return (
    <OnboardingStepLayout
      step={stepNumber}
      totalSteps={totalSteps}
      stepLabel={t('onboarding.interests.title')}
      onBack={handleBack}
      backLabel={t('common.back')}
    >
      <div className="mx-auto w-full max-w-2xl">
        <StepProgress step={stepNumber} total={totalSteps} />

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E', marginBottom: '6px' }}>
          {t('onboarding.interests.title')}
        </h1>
        <p
          className="flex flex-wrap items-center gap-1.5"
          style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}
        >
          <span>{t('onboarding.interests.desc')}</span>
        </p>

        <div className="space-y-8 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
          {/* Left: interests + offer service */}
          <div className="space-y-6">
            <StepCard
              icon={<Sparkles size={16} color="white" />}
              title={t('onboarding.interests.interestsTitle')}
              description={t('onboarding.interests.interestsDesc', { slots: MAX_INTERESTS })}
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
                  placeholder={t('onboarding.interests.addInterest')}
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
                  {t('onboarding.interests.addBtn')}
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
                {t('onboarding.interests.slotsAvailable', {
                  slots: MAX_INTERESTS - interests.length,
                })}
              </p>
            </StepCard>

            <div
              className="rounded-2xl p-5"
              style={{ background: '#F9FAFC', border: '1px solid #F0F0F0' }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #61BCA6, #2F76BB)' }}
                >
                  {isIndividual ? (
                    <HandHeart size={16} color="white" />
                  ) : (
                    <Search size={16} color="white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A2E' }}>
                    {isIndividual
                      ? t('onboarding.interests.offerServiceTitle')
                      : t('onboarding.interests.seekServiceTitle')}
                  </p>
                  <p style={{ fontSize: '12px', color: '#888' }}>
                    {isIndividual
                      ? t('onboarding.interests.offerServiceDesc')
                      : t('onboarding.interests.seekServiceDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={serviceCardOn}
                  dir="ltr"
                  onClick={() =>
                    isIndividual ? setOfferService(!offerService) : setSeekService(!seekService)
                  }
                  className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none"
                  style={{ background: serviceCardOn ? '#2F76BB' : '#E0E0E0' }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
                    style={{ transform: serviceCardOn ? 'translateX(20px)' : 'translateX(0px)' }}
                  />
                </button>
              </div>

              {serviceCardOn && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label style={{ fontSize: '12px', color: '#888' }}>
                      {t('onboarding.interests.serviceTypeLabel')}
                    </label>
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
                        <span>
                          {formatRole(serviceType, t) ||
                            t('onboarding.interests.serviceTypePlaceholder')}
                        </span>
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
                              {formatRole(type, t)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888' }}>
                      {isIndividual
                        ? t('onboarding.interests.priceLabel')
                        : t('onboarding.interests.budgetLabel')}
                    </label>
                    <div
                      className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
                      style={{ border: '1.5px solid #E0E0E0', background: 'white' }}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        value={price}
                        onChange={(event) => setPrice(event.target.value.replace(/[^0-9.,]/g, ''))}
                        placeholder={t('onboarding.interests.pricePlaceholder')}
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
          </div>

          {/* Right: goals */}
          <StepCard
            icon={<Briefcase size={16} color="white" />}
            title={t('onboarding.interests.goalsTitle')}
            description={t('onboarding.interests.goalsDesc')}
          >
            <div className="space-y-5">
              {GOAL_CATEGORIES.map((category) => {
                const groupKey =
                  category.label === 'Trouver du travail'
                    ? 'work'
                    : category.label === 'Services & missions'
                      ? 'services'
                      : null;
                const categoryLabel = groupKey
                  ? t(`onboarding.interests.goalsGroups.${groupKey}`)
                  : category.label;

                return (
                  <div key={category.label}>
                    <div className="mb-2 flex items-center gap-2">
                      {GOAL_GROUP_ICONS[category.label] ?? (
                        <span style={{ fontSize: '18px' }}>{category.emoji}</span>
                      )}
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#555' }}>
                        {categoryLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {category.options.map((option) => {
                        const isSelected = selectedGoals.includes(option);
                        const goalKeyMap: Record<string, string> = {
                          "Recruter quelqu'un": 'recruit',
                          'Trouver un job': 'findJob',
                          'Proposer mes services': 'offerServices',
                          'Travailler comme prestataire': 'workAsProvider',
                          'Demander un service': 'requestService',
                          'Trouver un prestataire': 'findProvider',
                          'Rencontrer des personnes près de moi': 'meetNearby',
                          'Trouver des missions': 'findMissions',
                          'Découvrir des idées et opportunités': 'discoverOpportunities',
                          'Service à domicile': 'homeService',
                        };
                        const goalKey = goalKeyMap[option];
                        const optionLabel = goalKey
                          ? t(`onboarding.interests.goalsOptions.${goalKey}`)
                          : option;

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
                            {optionLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </StepCard>
        </div>

        {error && (
          <p className="mt-4" style={{ fontSize: '12px', color: '#E74C3C', fontWeight: 600 }}>
            {error}
          </p>
        )}

        <StepCtaRow
          onBack={handleBack}
          onContinue={handleNext}
          continueLabel={
            loading
              ? t('onboarding.interests.syncing')
              : stepNumber === totalSteps
                ? t('onboarding.interests.ctaFinish')
                : t('onboarding.interests.ctaContinue')
          }
          disabled={loading}
          loading={loading}
        />
      </div>
    </OnboardingStepLayout>
  );
}
