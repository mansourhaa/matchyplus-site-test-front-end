'use client';

import { FlagIcon } from '@/components/matchy/flag-icon';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useLocationGate } from '@/features/location/location-context';
import {
  CONTACT_OPTIONS,
  DAYS,
  LANGUAGE_OPTIONS,
  TIME_SLOTS,
} from '@/features/onboarding/constants';
import { locationStepSchema } from '@/features/onboarding/schemas';
import type { OnboardingProfile } from '@/features/onboarding/types';
import {
  Check,
  Clock,
  Coffee,
  Globe,
  MessageCircle,
  Moon,
  Phone,
  Rocket,
  Smile,
  Sun,
  Sunset,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { OnboardingStepLayout, StepCard, StepCtaRow, StepProgress } from './onboarding-step-layout';

const CONTACT_ICONS: Record<string, ReactNode> = {
  phone: <Phone size={15} />,
  whatsapp: <MessageCircle size={15} />,
  person: <Coffee size={15} />,
};

const TIME_ICONS: Record<string, ReactNode> = {
  morning: <Sun size={14} />,
  afternoon: <Sunset size={14} />,
  evening: <Moon size={14} />,
  flexible: <Smile size={14} />,
};

function LangFlag({ langKey, size = 18 }: { langKey: string; size?: number }) {
  if (
    langKey === 'fr' ||
    langKey === 'en' ||
    langKey === 'ar' ||
    langKey === 'de' ||
    langKey === 'es' ||
    langKey === 'it'
  ) {
    return <FlagIcon locale={langKey} size={size} />;
  }
  if (langKey === 'ar-dialect') {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          flexShrink: 0,
          background: 'linear-gradient(135deg, #61BCA6, #2F76BB)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MessageCircle size={size * 0.65} color="white" />
      </div>
    );
  }
  return <Globe size={size * 0.85} />;
}

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

export function LocationStep({
  profile,
  stepNumber,
  totalSteps,
  loading,
  onFinish,
  onBack,
}: LocationStepProps) {
  const { t } = useI18n();
  const { requestBrowserLocation } = useLocationGate();
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
  // Stays true until navigate-away so the CTA does not flicker idle between PATCH /
  // complete / auth handoff (Redux `loading` clears after each thunk).
  const [finishing, setFinishing] = useState(false);

  const hydratedRef = useRef(Boolean(profile));
  useEffect(() => {
    if (hydratedRef.current || !profile) return;
    hydratedRef.current = true;

    // Defer state updates to avoid synchronous cascading renders
    setTimeout(() => {
      setCity(profile.city ?? '');
      setAvailabilityDays(profile.availability_days ?? []);
      setAvailabilityHours(profile.availability_hours ?? []);
      setContactModes(profile.contact_modes ?? []);
      setLanguages(profile.languages ?? []);
    }, 0);
  }, [profile]);

  const offerService = profile?.offer_service ?? false;

  const toggle = (list: string[], setList: (value: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const submit = async () => {
    if (finishing || loading) return;

    const parsed = locationStepSchema.safeParse({
      city,
      offerService,
      availabilityDays,
      availabilityHours,
      contactModes,
      languages,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('onboarding.location.errorDays'));
      return;
    }

    setError(null);
    setFinishing(true);
    // Start the browser/native geolocation prompt from this click (user gesture) before
    // any awaits — same pattern as legacy Bienvenue Accept. Fire-and-forget so finish
    // APIs are not blocked; LocationProvider persists coords across /home.
    void requestBrowserLocation();

    const finished = await onFinish({
      city: city || undefined,
      availabilityDays,
      availabilityHours,
      contactModes,
      languages,
    });
    if (!finished) {
      setFinishing(false);
      setError(t('onboarding.location.errorSubmit'));
    }
  };

  const busy = loading || finishing;

  return (
    <OnboardingStepLayout
      step={stepNumber}
      totalSteps={totalSteps}
      stepLabel={t('onboarding.location.title')}
      onBack={onBack}
    >
      <div className="mx-auto w-full max-w-2xl">
        <StepProgress step={stepNumber} total={totalSteps} />

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E', marginBottom: '6px' }}>
          {t('onboarding.location.title')}
        </h1>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>
          {t('onboarding.location.desc')}
        </p>

        <div className="space-y-5 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
          {/* Left: location + availability */}
          <div className="space-y-5">
            {/* Ma localisation removed as requested */}

            {offerService && (
              <StepCard
                title={t('onboarding.location.availTitle')}
                description={t('onboarding.location.availDesc')}
                icon={<Clock size={16} color="white" />}
              >
                <div className="mb-4 grid grid-cols-7 gap-1">
                  {DAYS.map((day) => {
                    const selected = availabilityDays.includes(day.short);
                    return (
                      <button
                        key={day.short}
                        type="button"
                        onClick={() => toggle(availabilityDays, setAvailabilityDays, day.short)}
                        className="flex aspect-square flex-col items-center justify-center rounded-xl transition-all"
                        style={{
                          background: selected
                            ? 'linear-gradient(135deg, #61BCA6, #2F76BB)'
                            : 'white',
                          border: `2px solid ${selected ? '#2F76BB' : '#E0E0E0'}`,
                          fontSize: '10px',
                          fontWeight: selected ? 700 : 400,
                          color: selected ? 'white' : '#888',
                        }}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const selected = availabilityHours.includes(slot.value);
                    return (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => toggle(availabilityHours, setAvailabilityHours, slot.value)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all"
                        style={{
                          background: selected ? '#E8F7F3' : 'white',
                          border: `2px solid ${selected ? '#61BCA6' : '#E0E0E0'}`,
                        }}
                      >
                        <span style={{ color: selected ? '#2A9177' : '#AAA' }}>
                          {TIME_ICONS[slot.value]}
                        </span>
                        <div className="text-left">
                          <p
                            style={{
                              fontSize: '12px',
                              fontWeight: selected ? 700 : 400,
                              color: selected ? '#2A9177' : '#555',
                            }}
                          >
                            {slot.label}
                          </p>
                          <p style={{ fontSize: '10px', color: '#AAA' }}>{slot.hint}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </StepCard>
            )}
          </div>

          {/* Right: contact preferences + languages */}
          <div className={`space-y-5 ${!offerService ? 'md:col-span-2' : ''}`}>
            <StepCard
              title={t('onboarding.location.contactTitle')}
              description={t('onboarding.location.contactDesc')}
              icon={<Phone size={16} color="white" />}
            >
              <div className="space-y-2">
                {CONTACT_OPTIONS.map((option) => {
                  const selected = contactModes.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggle(contactModes, setContactModes, option.value)}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all"
                      style={{
                        background: selected ? 'linear-gradient(90deg, #E8F7F3, #EEF5FF)' : 'white',
                        border: `2px solid ${selected ? '#61BCA6' : '#E0E0E0'}`,
                      }}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: selected
                            ? 'linear-gradient(135deg, #61BCA6, #2F76BB)'
                            : '#F5F5F5',
                        }}
                      >
                        <span style={{ color: selected ? 'white' : '#AAA' }}>
                          {CONTACT_ICONS[option.value]}
                        </span>
                      </div>
                      <span
                        className="flex-1 text-left"
                        style={{
                          fontSize: '13px',
                          fontWeight: selected ? 700 : 400,
                          color: selected ? '#2A9177' : '#555',
                        }}
                      >
                        {option.label}
                      </span>
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                        style={{
                          background: selected ? '#61BCA6' : 'white',
                          border: `2px solid ${selected ? '#61BCA6' : '#D0D0D0'}`,
                        }}
                      >
                        {selected && <Check size={11} color="white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </StepCard>

            <StepCard
              title={t('onboarding.location.langTitle')}
              description={t('onboarding.location.langDesc')}
              icon={<Globe size={16} color="white" />}
            >
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((option) => {
                  const selected = languages.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggle(languages, setLanguages, option.value)}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-2 transition-all"
                      style={{
                        background: selected
                          ? 'linear-gradient(135deg, #61BCA6, #2F76BB)'
                          : 'white',
                        border: `2px solid ${selected ? '#2F76BB' : '#E0E0E0'}`,
                        color: selected ? 'white' : '#555',
                        fontSize: '12px',
                        fontWeight: selected ? 700 : 400,
                      }}
                    >
                      <LangFlag langKey={option.value} size={18} />
                      <span>{option.label}</span>
                      {selected && <Check size={11} color="white" />}
                    </button>
                  );
                })}
              </div>
            </StepCard>
          </div>
        </div>

        {error && (
          <p className="mt-6 text-center" style={{ fontSize: '12px', color: '#E24E59' }}>
            {error}
          </p>
        )}

        <StepCtaRow
          onBack={onBack}
          onContinue={() => void submit()}
          continueLabel={
            busy ? t('onboarding.location.syncing') : t('onboarding.location.ctaFinish')
          }
          continueIcon={<Rocket size={18} />}
          disabled={busy}
          loading={busy}
        />

        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="mt-3 block w-full text-center disabled:opacity-50"
          style={{ fontSize: '14px', color: '#BBB' }}
        >
          {t('onboarding.location.skipAndLaunch')}
        </button>
      </div>
    </OnboardingStepLayout>
  );
}
