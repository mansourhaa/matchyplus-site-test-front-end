'use client';

import { EDUCATION_LEVELS } from '@/features/onboarding/constants';
import type { Education, OnboardingProfile } from '@/features/onboarding/types';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { OnboardingStepLayout } from './onboarding-step-layout';

type EducationStepProps = {
  profile: OnboardingProfile | null;
  stepNumber: number;
  totalSteps: number;
  loading: boolean;
  onNext: (patch: { educationLevel?: string; educations: Education[] }) => Promise<boolean>;
  onBack: () => void;
  onSkip: () => void;
};

const EMPTY_EDUCATION: Education = {
  school: '',
  degree: '',
  field: '',
  startDate: '',
  endDate: '',
  result: '',
};

export function EducationStep({
  profile,
  stepNumber,
  totalSteps,
  loading,
  onNext,
  onBack,
  onSkip,
}: EducationStepProps) {
  const [educationLevel, setEducationLevel] = useState(profile?.education_level ?? '');
  const [educations, setEducations] = useState<Education[]>(profile?.educations ?? []);
  const [draft, setDraft] = useState<Education>(EMPTY_EDUCATION);
  const [error, setError] = useState<string | null>(null);

  const addEducation = () => {
    if (!draft.school.trim()) return;
    setEducations([...educations, draft]);
    setDraft(EMPTY_EDUCATION);
  };

  const removeEducation = (index: number) => {
    setEducations(educations.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const saved = await onNext({ educationLevel: educationLevel || undefined, educations });
    if (!saved) {
      setError('Échec de la sauvegarde. Réessayez.');
    }
  };

  return (
    <OnboardingStepLayout
      step={stepNumber}
      totalSteps={totalSteps}
      stepLabel="Formation & Éducation"
      onBack={onBack}
    >
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1A1A2E' }}>
              Formation &amp; Éducation
            </h1>
            <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginTop: '6px' }}>
              Ajoutez votre niveau d&apos;études et vos diplômes.
            </p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            style={{ fontSize: '12px', fontWeight: 700, color: '#2F76BB', whiteSpace: 'nowrap' }}
          >
            Passer
          </button>
        </div>

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            Niveau d&apos;éducation
          </label>
          <select
            value={educationLevel}
            onChange={(event) => setEducationLevel(event.target.value)}
            className="mt-2 w-full rounded-2xl px-4 py-3.5 text-[#353535] outline-none"
            style={{ border: '2px solid #2F76BB', background: '#F5F9FF', fontSize: '14px' }}
          >
            <option value="">Sélectionner</option>
            {EDUCATION_LEVELS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            Diplômes &amp; Formations ({educations.length})
          </label>

          {educations.map((edu, index) => (
            <div
              key={`${edu.school}-${index}`}
              className="mt-2 flex items-center justify-between rounded-xl px-3 py-2.5"
              style={{ border: '1.5px solid #CFE0F2', background: 'white' }}
            >
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#353535' }}>{edu.school}</p>
                <p style={{ fontSize: '12px', color: '#888' }}>
                  {[edu.degree, edu.field].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button type="button" onClick={() => removeEducation(index)}>
                <Trash2 size={16} color="#E24E59" />
              </button>
            </div>
          ))}

          <div
            className="mt-3 space-y-2 rounded-2xl p-3"
            style={{ background: '#F7FBFF', border: '1px solid #DCEAF8' }}
          >
            <input
              type="text"
              value={draft.school}
              onChange={(event) => setDraft({ ...draft, school: event.target.value })}
              placeholder="Établissement *"
              className="w-full rounded-xl px-3 py-2 text-[#353535] outline-none"
              style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '13px' }}
            />
            <input
              type="text"
              value={draft.degree}
              onChange={(event) => setDraft({ ...draft, degree: event.target.value })}
              placeholder="Diplôme"
              className="w-full rounded-xl px-3 py-2 text-[#353535] outline-none"
              style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '13px' }}
            />
            <input
              type="text"
              value={draft.field}
              onChange={(event) => setDraft({ ...draft, field: event.target.value })}
              placeholder="Domaine d'étude"
              className="w-full rounded-xl px-3 py-2 text-[#353535] outline-none"
              style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '13px' }}
            />
            <div className="flex gap-2">
              <input
                type="month"
                value={draft.startDate}
                onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                className="w-full rounded-xl px-3 py-2 text-[#353535] outline-none"
                style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '13px' }}
              />
              <input
                type="month"
                value={draft.endDate}
                onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                className="w-full rounded-xl px-3 py-2 text-[#353535] outline-none"
                style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '13px' }}
              />
            </div>
            <input
              type="text"
              value={draft.result}
              onChange={(event) => setDraft({ ...draft, result: event.target.value })}
              placeholder="Résultat / Mention"
              className="w-full rounded-xl px-3 py-2 text-[#353535] outline-none"
              style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '13px' }}
            />
            <button
              type="button"
              onClick={addEducation}
              disabled={!draft.school.trim()}
              className="flex w-full items-center justify-center gap-1 rounded-xl py-2"
              style={{ background: '#2F76BB', color: 'white', fontSize: '12px', fontWeight: 700 }}
            >
              <Plus size={14} />
              Ajouter une formation
            </button>
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
          {loading && <Loader2 size={16} className="animate-spin" />}
          Enregistrer et continuer
        </button>
      </div>
    </OnboardingStepLayout>
  );
}
