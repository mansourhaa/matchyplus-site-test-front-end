'use client';

import { EDUCATION_OPTIONS } from '@/features/onboarding/constants';
import type { OnboardingProfile, ProfileEducation } from '@/features/onboarding/types';
import { EducationSection } from '@/features/profile/components/profile-edit-sections';
import { Check, ChevronDown, GraduationCap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { OnboardingStepLayout, StepCard, StepCtaRow, StepProgress } from './onboarding-step-layout';

type EducationStepProps = {
  profile: OnboardingProfile | null;
  stepNumber: number;
  totalSteps: number;
  loading: boolean;
  onNext: (patch: { educationLevel?: string; educations: ProfileEducation[] }) => Promise<boolean>;
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

export function EducationStep({
  profile,
  stepNumber,
  totalSteps,
  loading,
  onNext,
  onBack,
}: EducationStepProps) {
  const [educationLevel, setEducationLevel] = useState(profile?.education_level ?? '');
  const [educations, setEducations] = useState<ProfileEducation[]>(profile?.educations ?? []);
  const [error, setError] = useState<string | null>(null);

  const hydratedRef = useRef(Boolean(profile));
  useEffect(() => {
    if (hydratedRef.current || !profile) return;
    hydratedRef.current = true;
    setEducationLevel(profile.education_level ?? '');
    setEducations(profile.educations ?? []);
  }, [profile]);

  const submit = async (skip = false) => {
    setError(null);
    const saved = await onNext(
      skip
        ? { educations }
        : {
            educationLevel: educationLevel || undefined,
            educations,
          },
    );
    if (!saved) setError('Échec de la sauvegarde. Réessayez.');
  };

  return (
    <OnboardingStepLayout
      step={stepNumber}
      totalSteps={totalSteps}
      stepLabel="Formation & Éducation"
      onBack={onBack}
    >
      <div className="mx-auto w-full max-w-2xl">
        <StepProgress step={stepNumber} total={totalSteps} />

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E', marginBottom: '6px' }}>
          Formation &amp; Éducation
        </h1>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>
          Ajoutez votre niveau et vos formations pour compléter votre profil.
        </p>

        <div className="space-y-6 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
          <StepCard
            title="Niveau d'études"
            icon={<GraduationCap size={16} color="white" />}
            description="Diplôme le plus élevé"
          >
            <Dropdown
              label="Niveau"
              value={educationLevel}
              options={EDUCATION_OPTIONS}
              onChange={setEducationLevel}
              placeholder="Choisir"
            />
          </StepCard>

          <div className="-mx-4 md:mx-0">
            <EducationSection
              values={educations}
              onChange={setEducations}
              onSave={async (next) => {
                setEducations(next);
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
