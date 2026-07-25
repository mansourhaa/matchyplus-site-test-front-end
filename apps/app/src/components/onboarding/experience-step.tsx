'use client';

import { EXPERIENCE_TYPES, SECTORS, YEARS_OPTIONS } from '@/features/onboarding/constants';
import type { OnboardingProfile, WorkExperience } from '@/features/onboarding/types';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { OnboardingStepLayout } from './onboarding-step-layout';

type ExperienceStepProps = {
  profile: OnboardingProfile | null;
  stepNumber: number;
  totalSteps: number;
  loading: boolean;
  onNext: (patch: {
    experience?: string;
    sector?: string;
    experiences: WorkExperience[];
  }) => Promise<boolean>;
  onBack: () => void;
  onSkip: () => void;
};

const EMPTY_EXPERIENCE: WorkExperience = {
  title: '',
  company: '',
  type: EXPERIENCE_TYPES[0],
  startDate: '',
  endDate: '',
  current: false,
};

export function ExperienceStep({
  profile,
  stepNumber,
  totalSteps,
  loading,
  onNext,
  onBack,
  onSkip,
}: ExperienceStepProps) {
  const [experience, setExperience] = useState(profile?.experience ?? '');
  const [sector, setSector] = useState(profile?.sector ?? '');
  const [experiences, setExperiences] = useState<WorkExperience[]>(profile?.experiences ?? []);
  const [draft, setDraft] = useState<WorkExperience>(EMPTY_EXPERIENCE);
  const [error, setError] = useState<string | null>(null);

  const addExperience = () => {
    if (!draft.title.trim() || !draft.company.trim()) return;
    setExperiences([...experiences, draft]);
    setDraft(EMPTY_EXPERIENCE);
  };

  const removeExperience = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const saved = await onNext({
      experience: experience || undefined,
      sector: sector || undefined,
      experiences,
    });
    if (!saved) {
      setError('Échec de la sauvegarde. Réessayez.');
    }
  };

  return (
    <OnboardingStepLayout
      step={stepNumber}
      totalSteps={totalSteps}
      stepLabel="Parcours professionnel"
      onBack={onBack}
    >
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1A1A2E' }}>
              Parcours professionnel
            </h1>
            <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginTop: '6px' }}>
              Partagez votre expérience pour attirer les bons profils.
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
            Années d&apos;expérience
          </label>
          <select
            value={experience}
            onChange={(event) => setExperience(event.target.value)}
            className="mt-2 w-full rounded-2xl px-4 py-3.5 text-[#353535] outline-none"
            style={{ border: '2px solid #2F76BB', background: '#F5F9FF', fontSize: '14px' }}
          >
            <option value="">Sélectionner</option>
            {YEARS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            Secteur d&apos;activité
          </label>
          <select
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            className="mt-2 w-full rounded-2xl px-4 py-3.5 text-[#353535] outline-none"
            style={{ border: '2px solid #2F76BB', background: '#F5F9FF', fontSize: '14px' }}
          >
            <option value="">Sélectionner</option>
            {SECTORS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            Expériences ({experiences.length} enregistrée{experiences.length > 1 ? 's' : ''})
          </label>

          {experiences.map((exp, index) => (
            <div
              key={`${exp.title}-${index}`}
              className="mt-2 flex items-center justify-between rounded-xl px-3 py-2.5"
              style={{ border: '1.5px solid #CFE0F2', background: 'white' }}
            >
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#353535' }}>{exp.title}</p>
                <p style={{ fontSize: '12px', color: '#888' }}>{exp.company}</p>
              </div>
              <button type="button" onClick={() => removeExperience(index)}>
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
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="Intitulé du poste *"
              className="w-full rounded-xl px-3 py-2 text-[#353535] outline-none"
              style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '13px' }}
            />
            <input
              type="text"
              value={draft.company}
              onChange={(event) => setDraft({ ...draft, company: event.target.value })}
              placeholder="Employeur *"
              className="w-full rounded-xl px-3 py-2 text-[#353535] outline-none"
              style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '13px' }}
            />
            <select
              value={draft.type}
              onChange={(event) => setDraft({ ...draft, type: event.target.value })}
              className="w-full rounded-xl px-3 py-2 text-[#353535] outline-none"
              style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '13px' }}
            >
              {EXPERIENCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
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
                disabled={draft.current}
                onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                className="w-full rounded-xl px-3 py-2 text-[#353535] outline-none"
                style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '13px' }}
              />
            </div>
            <label
              className="flex items-center gap-2"
              style={{ fontSize: '12px', color: '#667085' }}
            >
              <input
                type="checkbox"
                checked={draft.current}
                onChange={(event) => setDraft({ ...draft, current: event.target.checked })}
              />
              Poste actuel
            </label>
            <button
              type="button"
              onClick={addExperience}
              disabled={!draft.title.trim() || !draft.company.trim()}
              className="flex w-full items-center justify-center gap-1 rounded-xl py-2"
              style={{ background: '#2F76BB', color: 'white', fontSize: '12px', fontWeight: 700 }}
            >
              <Plus size={14} />
              Ajouter une expérience
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
