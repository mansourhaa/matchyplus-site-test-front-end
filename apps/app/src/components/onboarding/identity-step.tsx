'use client';

import { useAppSelector } from '@/features/auth/hooks';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { identityStepSchema } from '@/features/onboarding/schemas';
import type { OnboardingProfile, ProfileType } from '@/features/onboarding/types';
import { Check, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { OnboardingStepLayout, StepCtaRow, StepProgress } from './onboarding-step-layout';

type IdentityStepProps = {
  profile: OnboardingProfile | null;
  stepNumber: number;
  totalSteps: number;
  loading: boolean;
  onNext: (patch: {
    name: string;
    job?: string;
    bio?: string;
    image?: string;
    profileType: ProfileType;
  }) => Promise<boolean>;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) return { firstName: trimmed, lastName: '' };
  return { firstName: trimmed.slice(0, spaceIndex), lastName: trimmed.slice(spaceIndex + 1) };
}

// Credentials (phone + password + OTP) already happened on /register — this step only
// ever runs with a session already open, matching matchy-plus-legacy's Inscription1.
export function IdentityStep({
  profile,
  stepNumber,
  totalSteps,
  loading,
  onNext,
}: IdentityStepProps) {
  const existingName = splitName(profile?.name ?? '');
  const [firstName, setFirstName] = useState(existingName.firstName);
  const [lastName, setLastName] = useState(existingName.lastName);
  const [job, setJob] = useState(profile?.job ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [image, setImage] = useState(profile?.image ?? '');
  const [profileType, setProfileType] = useState<ProfileType>(
    profile?.profile_type ?? 'INDIVIDUAL',
  );
  const [error, setError] = useState<string | null>(null);
  const [requiredTouched, setRequiredTouched] = useState(false);

  // `profile` is usually still null on first render — fetchOnboardingProfile is async —
  // so the useState initializers above only capture resumed progress when this step
  // happens to mount after that fetch already resolved. Once it arrives late, sync the
  // form once (not on every subsequent profile change, which would clobber in-progress
  // edits after a save).
  const hydratedRef = useRef(Boolean(profile));
  useEffect(() => {
    if (hydratedRef.current || !profile) return;
    hydratedRef.current = true;
    const { firstName: resumedFirstName, lastName: resumedLastName } = splitName(
      profile.name ?? '',
    );
    setFirstName(resumedFirstName);
    setLastName(resumedLastName);
    setJob(profile.job ?? '');
    setBio(profile.bio ?? '');
    setImage(profile.image ?? '');
    setProfileType(profile.profile_type ?? 'INDIVIDUAL');
  }, [profile]);

  const { user } = useAppSelector(selectAuth);
  const name = `${firstName} ${lastName}`.trim();
  const isJobRequired = profileType === 'INDIVIDUAL';
  // Only a phone-signup account ever needs a real profile photo — matching the old
  // app's Inscription1 (`requiresPhoto = isPhoneSignupFlow() || Boolean(data.phone)`).
  // An OAuth account already has a provider avatar concept and never collected a phone.
  const authProvider = user?.auth_provider ?? profile?.auth_provider ?? 'phone';
  const isPhotoRequired = authProvider === 'phone';
  const missingPhoto = requiredTouched && isPhotoRequired && !image;

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImage(await readFileAsDataUrl(file));
  };

  const handleNext = async () => {
    if (isPhotoRequired && !image) {
      setRequiredTouched(true);
      setError('La photo de profil est obligatoire.');
      return;
    }

    const parsed = identityStepSchema.safeParse({ name, job, bio, image, profileType });
    if (!parsed.success) {
      setRequiredTouched(true);
      setError(parsed.error.issues[0]?.message ?? 'Le prénom et le nom sont obligatoires.');
      return;
    }

    setRequiredTouched(false);
    setError(null);
    const saved = await onNext({
      name,
      job: job || undefined,
      bio: bio || undefined,
      image: image || undefined,
      profileType,
    });
    if (!saved) {
      setError('Échec de la sauvegarde. Réessayez.');
    }
  };

  return (
    <OnboardingStepLayout step={stepNumber} totalSteps={totalSteps} stepLabel="Votre identité">
      <div className="mx-auto w-full max-w-2xl">
        <StepProgress step={stepNumber} total={totalSteps} />

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E', marginBottom: '6px' }}>
          Votre identité
        </h1>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>
          Commençons par les informations de base.
        </p>

        <div className="space-y-6 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
          {/* Left: photo + profile type */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <div
                className="flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-4 transition-transform hover:scale-105"
                style={{ borderColor: missingPhoto ? '#E74C3C' : '#2F76BB', background: '#D5E6F5' }}
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User size={40} color="#2F76BB" />
                )}
              </div>
              <label
                className="absolute -right-2 -bottom-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 bg-white shadow-md"
                style={{ borderColor: '#61BCA6' }}
              >
                <Check size={16} color="#61BCA6" style={{ display: image ? 'block' : 'none' }} />
                {!image && <User size={14} color="#61BCA6" />}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
            </div>
            <p style={{ fontSize: '12px', color: '#AAA' }}>Photo de profil</p>
            {missingPhoto && (
              <p style={{ fontSize: '11px', color: '#E74C3C', marginTop: '4px' }}>
                La photo est obligatoire
              </p>
            )}

            <div className="mt-6 w-full">
              <p
                style={{ fontSize: '14px', fontWeight: 700, color: '#353535', marginBottom: '8px' }}
              >
                Je suis
              </p>
              <div className="flex gap-2">
                {(['PROVIDER', 'INDIVIDUAL'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setProfileType(type)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 transition-all"
                    style={{
                      background: profileType === type ? '#2F76BB' : 'white',
                      border: `2px solid ${profileType === type ? '#2F76BB' : '#E0E0E0'}`,
                    }}
                  >
                    {profileType === type && <Check size={14} color="white" />}
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: profileType === type ? 'white' : '#666',
                      }}
                    >
                      {type === 'PROVIDER' ? 'Employeur' : 'Employé'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: identity fields */}
          <div className="space-y-4">
            <div>
              <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                Prénom <span style={{ color: '#61BCA6' }}>*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Votre prénom"
                className="mt-1 w-full rounded-xl px-4 py-3 text-[#353535] transition-all outline-none"
                style={{
                  fontSize: '14px',
                  border: `2px solid ${firstName ? '#2F76BB' : '#E0E0E0'}`,
                  background: firstName ? '#F5F9FF' : '#FAFAFA',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                Nom <span style={{ color: '#61BCA6' }}>*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Votre nom de famille"
                className="mt-1 w-full rounded-xl px-4 py-3 text-[#353535] transition-all outline-none"
                style={{
                  fontSize: '14px',
                  border: `2px solid ${lastName ? '#2F76BB' : '#E0E0E0'}`,
                  background: lastName ? '#F5F9FF' : '#FAFAFA',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                Métier / Profession
                {isJobRequired ? (
                  <span style={{ color: '#61BCA6' }}> *</span>
                ) : (
                  <span style={{ color: '#888' }}> (facultatif)</span>
                )}
              </label>
              <input
                type="text"
                value={job}
                onChange={(event) => setJob(event.target.value)}
                placeholder="Ingénieur, designer, chauffeur..."
                className="mt-1 w-full rounded-xl px-4 py-3 text-[#353535] transition-all outline-none"
                style={{
                  fontSize: '14px',
                  border: `2px solid ${job ? '#2F76BB' : '#E0E0E0'}`,
                  background: job ? '#F5F9FF' : '#FAFAFA',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                À propos de vous
              </label>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value.slice(0, 250))}
                placeholder="Parlez de vous en quelques mots..."
                rows={3}
                className="mt-1 w-full resize-none rounded-xl px-4 py-3 text-[#353535] transition-all outline-none"
                style={{
                  fontSize: '14px',
                  border: `2px solid ${bio ? '#2F76BB' : '#E0E0E0'}`,
                  background: bio ? '#F5F9FF' : '#FAFAFA',
                }}
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4" style={{ fontSize: '12px', color: '#E74C3C', fontWeight: 600 }}>
            {error}
          </p>
        )}

        <StepCtaRow
          onContinue={handleNext}
          continueLabel="Enregistrer et continuer"
          disabled={loading}
          loading={loading}
        />

        <Link
          href="/login"
          className="mt-3 block w-full rounded-2xl py-3 text-center"
          style={{
            border: '1.5px solid #E0E0E0',
            fontSize: '14px',
            fontWeight: 600,
            color: '#555',
          }}
        >
          Connexion
        </Link>
      </div>
    </OnboardingStepLayout>
  );
}
