'use client';

import { EDUCATION_LEVELS } from '@/features/onboarding/constants';
import type { Education, OnboardingProfile } from '@/features/onboarding/types';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { OnboardingStepLayout, StepCard, StepCtaRow, StepProgress } from './onboarding-step-layout';

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
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addEducation = () => {
    if (!draft.school.trim()) return;
    setEducations([...educations, draft]);
    setDraft(EMPTY_EDUCATION);
    setShowForm(false);
  };

  const removeEducation = (index: number) => {
    setEducations(educations.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
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
      skipLabel="Passer"
      onSkip={onSkip}
    >
      <div className="mx-auto w-full max-w-2xl">
        <StepProgress step={stepNumber} total={totalSteps} />

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E', marginBottom: '6px' }}>
          Formation &amp; Éducation
        </h1>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>
          Ajoutez votre niveau d&apos;études et vos diplômes.
        </p>

        <div className="space-y-6 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
          {/* Left: education level */}
          <StepCard title="Niveau d'éducation">
            <select
              value={educationLevel}
              onChange={(event) => setEducationLevel(event.target.value)}
              className="w-full rounded-xl px-4 py-3 text-[#353535] outline-none"
              style={{ border: '2px solid #E0E0E0', background: '#FAFAFA', fontSize: '14px' }}
            >
              <option value="">Choisir niveau d&apos;éducation</option>
              {EDUCATION_LEVELS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </StepCard>

          {/* Right: diplomas/training */}
          <StepCard>
            <div className="mb-4 flex items-center justify-between">
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A2E' }}>
                Diplômes &amp; Formations
              </p>
              <span
                className="rounded-full px-2 py-0.5"
                style={{
                  background: '#EEF5FF',
                  fontSize: '11px',
                  color: '#2F76BB',
                  fontWeight: 700,
                }}
              >
                {educations.length}
              </span>
            </div>

            <div className="mb-4 space-y-3">
              {educations.length === 0 && !showForm && (
                <div className="flex flex-col items-center gap-2 py-6" style={{ color: '#CCC' }}>
                  <GraduationCap size={28} color="#DDD" />
                  <p style={{ fontSize: '12px' }}>Aucune formation pour l&apos;instant</p>
                </div>
              )}
              {educations.map((edu, index) => (
                <div
                  key={`${edu.school}-${index}`}
                  className="flex gap-3 rounded-xl p-3"
                  style={{ background: 'white', border: '1px solid #E8F0FA' }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: '#EEF5FF' }}
                  >
                    <GraduationCap size={18} color="#2F76BB" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      style={{ fontSize: '12px', fontWeight: 700, color: '#2F76BB' }}
                      className="truncate"
                    >
                      {edu.school}
                    </p>
                    <p style={{ fontSize: '12px', color: '#555' }}>
                      {[edu.degree, edu.field].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button type="button" className="shrink-0" onClick={() => removeEducation(index)}>
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
                  value={draft.school}
                  onChange={(event) => setDraft({ ...draft, school: event.target.value })}
                  placeholder="Établissement *"
                  className="w-full rounded-lg px-3 py-2 text-[#353535] outline-none"
                  style={{ border: '2px solid #E0E0E0', background: 'white', fontSize: '13px' }}
                />
                <input
                  type="text"
                  value={draft.degree}
                  onChange={(event) => setDraft({ ...draft, degree: event.target.value })}
                  placeholder="Diplôme"
                  className="w-full rounded-lg px-3 py-2 text-[#353535] outline-none"
                  style={{ border: '2px solid #E0E0E0', background: 'white', fontSize: '13px' }}
                />
                <input
                  type="text"
                  value={draft.field}
                  onChange={(event) => setDraft({ ...draft, field: event.target.value })}
                  placeholder="Domaine d'étude"
                  className="w-full rounded-lg px-3 py-2 text-[#353535] outline-none"
                  style={{ border: '2px solid #E0E0E0', background: 'white', fontSize: '13px' }}
                />
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
                    onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-[#353535] outline-none"
                    style={{ border: '2px solid #E0E0E0', background: 'white', fontSize: '13px' }}
                  />
                </div>
                <input
                  type="text"
                  value={draft.result}
                  onChange={(event) => setDraft({ ...draft, result: event.target.value })}
                  placeholder="Résultat / Mention"
                  className="w-full rounded-lg px-3 py-2 text-[#353535] outline-none"
                  style={{ border: '2px solid #E0E0E0', background: 'white', fontSize: '13px' }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addEducation}
                    disabled={!draft.school.trim()}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2"
                    style={{
                      background: '#2F76BB',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Enregistrer la formation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setDraft(EMPTY_EDUCATION);
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
                <Plus size={16} /> Ajouter une formation
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
