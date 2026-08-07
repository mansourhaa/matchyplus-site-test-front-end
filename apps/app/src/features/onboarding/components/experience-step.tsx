'use client';

import { EXPERIENCE_OPTIONS, SECTOR_OPTIONS } from '@/features/onboarding/constants';
import type { OnboardingProfile, ProfileExperience } from '@/features/onboarding/types';
import { ExperienceSection } from '@/features/profile/components/profile-edit-sections';
import { Briefcase, Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { OnboardingStepLayout, StepCard, StepCtaRow, StepProgress } from './onboarding-step-layout';

type ExperienceStepProps = {
  profile: OnboardingProfile | null;
  stepNumber: number;
  totalSteps: number;
  loading: boolean;
  onNext: (patch: {
    experience?: string;
    sector?: string;
    experiences: ProfileExperience[];
  }) => Promise<boolean>;
  onBack: () => void;
};

function Dropdown({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>{label}</label>
      <div className="relative mt-1">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl px-4 py-3"
          style={{
            border: `2px solid ${value ? '#2F76BB' : '#E0E0E0'}`,
            background: value ? '#F5F9FF' : '#FAFAFA',
          }}
          onClick={() => setOpen(!open)}
        >
          <span style={{ fontSize: '14px', color: value ? '#353535' : '#BBB' }}>
            {value || placeholder}
          </span>
          <ChevronDown
            size={16}
            color="#888"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </button>
        {open && (
          <div
            className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-xl bg-white shadow-xl"
            style={{ border: '1px solid #E0E0E0', maxHeight: '200px', overflowY: 'auto' }}
          >
            {options.map((opt) => (
              <button
                type="button"
                key={opt}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[#F0F7FF]"
                style={{ fontSize: '13px', color: '#353535' }}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {value === opt && <Check size={14} color="#2F76BB" />}
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ExperienceStep({
  profile,
  stepNumber,
  totalSteps,
  loading,
  onNext,
  onBack,
}: ExperienceStepProps) {
  const [experience, setExperience] = useState(profile?.experience ?? '');
  const [sector, setSector] = useState(profile?.sector ?? '');
  const [experiences, setExperiences] = useState<ProfileExperience[]>(profile?.experiences ?? []);
  const [error, setError] = useState<string | null>(null);

  const hydratedRef = useRef(Boolean(profile));
  useEffect(() => {
    if (hydratedRef.current || !profile) return;
    hydratedRef.current = true;
    setExperience(profile.experience ?? '');
    setSector(profile.sector ?? '');
    setExperiences(profile.experiences ?? []);
  }, [profile]);

  const submit = async (skip = false) => {
    setError(null);
    const saved = await onNext(
      skip
        ? { experiences }
        : {
            experience: experience || undefined,
            sector: sector || undefined,
            experiences,
          },
    );
    if (!saved) setError('Échec de la sauvegarde. Réessayez.');
  };

  return (
    <OnboardingStepLayout
      step={stepNumber}
      totalSteps={totalSteps}
      stepLabel="Parcours professionnel"
      onBack={onBack}
    >
      <div className="mx-auto w-full max-w-2xl">
        <StepProgress step={stepNumber} total={totalSteps} />

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E', marginBottom: '6px' }}>
          Parcours professionnel
        </h1>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>
          Partagez votre expérience pour attirer les bons profils.
        </p>

        <div className="space-y-6 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
          <StepCard
            title="Expérience générale"
            icon={<Briefcase size={16} color="white" />}
            description="Années et secteur d'activité"
          >
            <div className="space-y-4">
              <Dropdown
                label="Années d'expérience"
                value={experience}
                options={EXPERIENCE_OPTIONS}
                onChange={setExperience}
                placeholder="Choisir"
              />
              <Dropdown
                label="Secteur d'activité"
                value={sector}
                options={SECTOR_OPTIONS}
                onChange={setSector}
                placeholder="Choisir"
              />
            </div>
            <div
              className="mt-4 rounded-xl px-3 py-3"
              style={{ background: '#EEF5FF', border: '1px solid #C5D8F0' }}
            >
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#2F76BB' }}>Conseil Matchy+</p>
              <p style={{ fontSize: '11px', color: '#555', marginTop: '2px', lineHeight: 1.5 }}>
                Les profils avec un parcours complet reçoivent 3× plus de connexions.
              </p>
            </div>
          </StepCard>

          <div className="-mx-4 md:mx-0">
            <ExperienceSection
              values={experiences}
              onChange={setExperiences}
              onSave={async (next) => {
                setExperiences(next);
                return true;
              }}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-center text-xs text-[#E24E59]" role="alert">
            {error}
          </p>
        )}

        <StepCtaRow
          onBack={onBack}
          onContinue={() => void submit(false)}
          continueLabel={loading ? 'Enregistrement…' : 'Enregistrer et continuer'}
          disabled={loading}
          loading={loading}
        />
        <button
          type="button"
          onClick={() => void submit(true)}
          disabled={loading}
          className="mt-3 w-full py-2 text-center text-sm font-semibold text-[#888]"
        >
          Passer
        </button>
      </div>
    </OnboardingStepLayout>
  );
}
