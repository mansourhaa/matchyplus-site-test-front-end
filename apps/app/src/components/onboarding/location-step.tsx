'use client';

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
  MapPin,
  MessageCircle,
  Moon,
  Phone,
  Rocket,
  Smile,
  Sun,
  Sunset,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

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

// Real flag icons, not emoji — country-flag emoji frequently fail to render as actual
// flags on Windows (shows blank boxes or letter codes instead), unlike macOS/iOS.
function LangFlag({ langKey, size = 18 }: { langKey: string; size?: number }) {
  const width = Math.round(size * 1.45);
  const wrapStyle = {
    width,
    height: size,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  } as const;
  const svgStyle = { display: 'block', width: '100%', height: '100%' } as const;

  if (langKey === 'fr') {
    return (
      <div style={wrapStyle}>
        <svg viewBox="0 0 3 2" style={svgStyle} aria-hidden>
          <rect width="1" height="2" fill="#002395" />
          <rect x="1" width="1" height="2" fill="#fff" />
          <rect x="2" width="1" height="2" fill="#ED2939" />
        </svg>
      </div>
    );
  }
  if (langKey === 'en') {
    return (
      <div style={wrapStyle}>
        <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" style={svgStyle} aria-hidden>
          <rect width="60" height="30" fill="#012169" />
          <g fill="#fff">
            <polygon points="0,0 60,30 60,25 5,0" />
            <polygon points="60,0 0,30 0,25 55,0" />
          </g>
          <g fill="#C8102E">
            <polygon points="0,0 60,30 60,27 3,0" />
            <polygon points="60,0 0,30 0,27 57,0" />
            <rect x="25" width="10" height="30" />
            <rect y="10" width="60" height="10" />
          </g>
        </svg>
      </div>
    );
  }
  if (langKey === 'de') {
    return (
      <div style={wrapStyle}>
        <svg viewBox="0 0 5 3" style={svgStyle} aria-hidden>
          <rect width="5" height="1" fill="#000" />
          <rect y="1" width="5" height="1" fill="#D00" />
          <rect y="2" width="5" height="1" fill="#FFCE00" />
        </svg>
      </div>
    );
  }
  if (langKey === 'es') {
    return (
      <div style={wrapStyle}>
        <svg viewBox="0 0 3 2" style={svgStyle} aria-hidden>
          <rect width="3" height="2" fill="#c60b1e" />
          <rect y="0.5" width="3" height="1" fill="#ffc400" />
        </svg>
      </div>
    );
  }
  if (langKey === 'it') {
    return (
      <div style={wrapStyle}>
        <svg viewBox="0 0 3 2" style={svgStyle} aria-hidden>
          <rect width="1" height="2" fill="#009246" />
          <rect x="1" width="1" height="2" fill="#fff" />
          <rect x="2" width="1" height="2" fill="#CE2B37" />
        </svg>
      </div>
    );
  }
  if (langKey === 'ar') {
    return (
      <div style={wrapStyle}>
        <svg viewBox="0 0 3 2" style={svgStyle} aria-hidden>
          <rect width="3" height="2" fill="#E70013" />
          <circle cx="1.5" cy="1" r="0.6" fill="#fff" />
          <circle cx="1.65" cy="1" r="0.48" fill="#E70013" />
          <path
            d="M1.62 0.62 L1.78 1 L1.62 1.38 L1.95 1.15 L2.05 1.4 L2.1 1.1 L2.35 1.05 L2.1 0.9 L2.05 0.6 L1.95 0.85 Z"
            fill="#fff"
          />
        </svg>
      </div>
    );
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

  const submit = async () => {
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
      <div className="mx-auto w-full max-w-2xl">
        <StepProgress step={stepNumber} total={totalSteps} />

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E', marginBottom: '6px' }}>
          Localisation &amp; Préférences
        </h1>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>
          Dernière étape ! Configurez votre zone de matching et vos disponibilités.
        </p>

        <div className="space-y-5 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
          {/* Left: location + availability */}
          <div className="space-y-5">
            <StepCard
              title="Ma localisation"
              description="Indispensable pour le matching géolocalisé"
            >
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ border: '2px solid #E0E0E0', background: '#FAFAFA' }}
              >
                <MapPin size={15} color={city ? '#2F76BB' : '#CCC'} />
                <input
                  type="text"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Votre ville (ex : Tunis, Sousse...)"
                  className="flex-1 bg-transparent text-[#353535] outline-none"
                  style={{ fontSize: '14px' }}
                />
              </div>
            </StepCard>

            {offerService && (
              <StepCard
                title="Mes disponibilités"
                description="Quand êtes-vous disponible pour des missions ?"
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
              title="Préférences de contact"
              description="Comment préférez-vous être contacté ?"
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
              title="Langues parlées"
              description="Sélectionnez toutes les langues que vous pratiquez"
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
          onContinue={submit}
          continueLabel={loading ? 'Synchronisation...' : 'Lancer Matchy+'}
          continueIcon={<Rocket size={18} />}
          disabled={loading}
          loading={loading}
        />

        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="mt-3 block w-full text-center"
          style={{ fontSize: '14px', color: '#BBB' }}
        >
          Passer et lancer
        </button>
      </div>
    </OnboardingStepLayout>
  );
}
