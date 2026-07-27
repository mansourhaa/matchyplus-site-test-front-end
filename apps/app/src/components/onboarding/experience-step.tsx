'use client';

import { EXPERIENCE_TYPES, SECTORS, YEARS_OPTIONS } from '@/features/onboarding/constants';
import type { OnboardingProfile, WorkExperience } from '@/features/onboarding/types';
import { Briefcase, Clock, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { OnboardingStepLayout, StepCard, StepCtaRow, StepProgress } from './onboarding-step-layout';

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
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addExperience = () => {
    if (!draft.title.trim() || !draft.company.trim()) return;
    setExperiences([...experiences, draft]);
    setDraft(EMPTY_EXPERIENCE);
    setShowForm(false);
  };

  const removeExperience = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
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
      skipLabel="Passer"
      onSkip={onSkip}
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
          {/* Left: years + sector */}
          <StepCard title="Expérience générale">
            <div className="space-y-5">
              <div>
                <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                  Années d&apos;expérience
                </label>
                <select
                  value={experience}
                  onChange={(event) => setExperience(event.target.value)}
                  className="mt-1 w-full rounded-xl px-4 py-3 text-[#353535] outline-none"
                  style={{ border: '2px solid #E0E0E0', background: '#FAFAFA', fontSize: '14px' }}
                >
                  <option value="">Choisir années d&apos;expérience</option>
                  {YEARS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                  Secteur d&apos;activité
                </label>
                <select
                  value={sector}
                  onChange={(event) => setSector(event.target.value)}
                  className="mt-1 w-full rounded-xl px-4 py-3 text-[#353535] outline-none"
                  style={{ border: '2px solid #E0E0E0', background: '#FAFAFA', fontSize: '14px' }}
                >
                  <option value="">Choisir secteur d&apos;activité</option>
                  {SECTORS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </StepCard>

          {/* Right: experiences list */}
          <StepCard>
            <div className="mb-4 flex items-center justify-between">
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A2E' }}>Expériences</p>
              <span
                className="rounded-full px-2 py-0.5"
                style={{
                  background: '#EEF5FF',
                  fontSize: '11px',
                  color: '#2F76BB',
                  fontWeight: 700,
                }}
              >
                {experiences.length} enregistrée{experiences.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="mb-4 space-y-3">
              {experiences.length === 0 && !showForm && (
                <div className="flex flex-col items-center gap-2 py-6" style={{ color: '#CCC' }}>
                  <Clock size={28} color="#DDD" />
                  <p style={{ fontSize: '12px' }}>Aucune expérience pour l&apos;instant</p>
                </div>
              )}
              {experiences.map((exp, index) => (
                <div
                  key={`${exp.title}-${index}`}
                  className="flex gap-3 rounded-xl p-3"
                  style={{ background: 'white', border: '1px solid #E8F0FA' }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: '#EEF5FF' }}
                  >
                    <Briefcase size={18} color="#2F76BB" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      style={{ fontSize: '13px', fontWeight: 700, color: '#2F76BB' }}
                      className="truncate"
                    >
                      {exp.title}
                    </p>
                    <p style={{ fontSize: '12px', color: '#555' }}>
                      {exp.company}
                      {exp.type ? ` · ${exp.type}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0"
                    onClick={() => removeExperience(index)}
                  >
                    <Trash2 size={14} color="#AAA" />
                  </button>
                </div>
              ))}
            </div>

            {showForm ? (
              <div
                className="space-y-2 rounded-xl p-3"
                style={{ background: '#F9FAFC', border: '1px solid #F0F0F0' }}
              >
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Intitulé du poste *"
                  className="w-full rounded-lg px-3 py-2 text-[#353535] outline-none"
                  style={{ border: '2px solid #E0E0E0', background: 'white', fontSize: '13px' }}
                />
                <input
                  type="text"
                  value={draft.company}
                  onChange={(event) => setDraft({ ...draft, company: event.target.value })}
                  placeholder="Employeur *"
                  className="w-full rounded-lg px-3 py-2 text-[#353535] outline-none"
                  style={{ border: '2px solid #E0E0E0', background: 'white', fontSize: '13px' }}
                />
                <select
                  value={draft.type}
                  onChange={(event) => setDraft({ ...draft, type: event.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-[#353535] outline-none"
                  style={{ border: '2px solid #E0E0E0', background: 'white', fontSize: '13px' }}
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
                    className="w-full rounded-lg px-3 py-2 text-[#353535] outline-none"
                    style={{ border: '2px solid #E0E0E0', background: 'white', fontSize: '13px' }}
                  />
                  <input
                    type="month"
                    value={draft.endDate}
                    disabled={draft.current}
                    onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-[#353535] outline-none"
                    style={{ border: '2px solid #E0E0E0', background: 'white', fontSize: '13px' }}
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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addExperience}
                    disabled={!draft.title.trim() || !draft.company.trim()}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2"
                    style={{
                      background: '#2F76BB',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Enregistrer l&apos;expérience
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setDraft(EMPTY_EXPERIENCE);
                    }}
                    className="rounded-lg px-4 py-2"
                    style={{ color: '#888', fontSize: '12px' }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 transition-all hover:bg-[#F0F7FF]"
                style={{
                  border: '2px dashed #D0DCE8',
                  color: '#2F76BB',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: 'white',
                }}
              >
                <Plus size={16} /> Ajouter une expérience
              </button>
            )}
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
          continueLabel="Enregistrer et continuer"
          disabled={loading}
          loading={loading}
        />

        <button
          type="button"
          onClick={onSkip}
          className="mt-3 block w-full text-center"
          style={{ fontSize: '14px', color: '#BBB' }}
        >
          Passer
        </button>
      </div>
    </OnboardingStepLayout>
  );
}
