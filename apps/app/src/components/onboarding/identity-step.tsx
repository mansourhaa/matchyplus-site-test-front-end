'use client';

import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { registerPhone, selectAuth, sendOtp, verifyOtp } from '@/features/auth/store/auth-slice';
import { identityStepSchema } from '@/features/onboarding/schemas';
import type { OnboardingProfile, ProfileType } from '@/features/onboarding/types';
import { DEFAULT_PHONE_COUNTRY, composeE164Phone, getPhoneCountry } from '@/lib/phone-countries';
import { Check, Eye, EyeOff, Lock, User } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { PhoneInput } from '../auth/phone-input';
import { OnboardingStepLayout, StepCtaRow, StepProgress } from './onboarding-step-layout';

type IdentityStepProps = {
  profile: OnboardingProfile | null;
  stepNumber: number;
  totalSteps: number;
  loading: boolean;
  isAuthenticated: boolean;
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

export function IdentityStep({
  profile,
  stepNumber,
  totalSteps,
  loading,
  isAuthenticated,
  onNext,
}: IdentityStepProps) {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);

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

  const [countryIso, setCountryIso] = useState(DEFAULT_PHONE_COUNTRY.iso);
  const [nationalNumber, setNationalNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const country = getPhoneCountry(countryIso);
  const phone = composeE164Phone(countryIso, nationalNumber);
  const isPhoneValid = nationalNumber.length >= country.nationalLength;
  const isBusy = loading || auth.loading;
  const name = `${firstName} ${lastName}`.trim();
  const isJobRequired = profileType === 'INDIVIDUAL';

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImage(await readFileAsDataUrl(file));
  };

  const handleSendCode = async () => {
    if (!isPhoneValid) {
      setError(`Le numéro de téléphone est obligatoire (${country.nationalLength} chiffres).`);
      return;
    }

    setError(null);
    const resultAction = await dispatch(sendOtp({ phone }));
    if (sendOtp.fulfilled.match(resultAction)) {
      setOtpSent(true);
    } else {
      setError("Impossible d'envoyer le code. Vérifiez votre numéro.");
    }
  };

  const handleEditPhone = () => {
    setOtpSent(false);
    setCode('');
    setError(null);
  };

  const handleNext = async () => {
    const parsed = identityStepSchema.safeParse({ name, job, bio, image, profileType });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Le prénom et le nom sont obligatoires.');
      return;
    }

    if (!isAuthenticated) {
      if (!otpSent) {
        setError('Vérifiez votre numéro de téléphone avec le code SMS.');
        return;
      }
      if (code.trim().length < 4) {
        setError('Entrez le code à 6 chiffres.');
        return;
      }
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
        return;
      }

      setError(null);
      // verifyOtp only proves phone ownership and returns a one-time signup grant — it
      // never creates the account or a session by itself (OTP is not a login mechanism).
      // registerPhone consumes that grant, together with the password collected here, to
      // actually create the account and open the session.
      const verifyResult = await dispatch(verifyOtp({ phone, code }));
      if (!verifyOtp.fulfilled.match(verifyResult)) {
        setError('Code incorrect.');
        return;
      }

      const registerResult = await dispatch(
        registerPhone({ phone, password, name, signupToken: verifyResult.payload.signupToken }),
      );
      if (!registerPhone.fulfilled.match(registerResult)) {
        setError('Impossible de créer le compte.');
        return;
      }

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
      return;
    }

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
          {isAuthenticated ? 'Votre identité' : 'Créer un compte'}
        </h1>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>
          {isAuthenticated
            ? 'Commençons par les informations de base.'
            : 'Rejoignez Matchy+ avec votre numéro de téléphone.'}
        </p>

        <div className="space-y-6 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
          {/* Left: photo + profile type */}
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <div
                className="flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-4 transition-transform hover:scale-105"
                style={{ borderColor: '#2F76BB', background: '#D5E6F5' }}
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

            {!isAuthenticated && (
              <div>
                <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                  Numéro de téléphone <span style={{ color: '#61BCA6' }}>*</span>
                </label>
                <div className="mt-1">
                  <PhoneInput
                    countryIso={countryIso}
                    nationalNumber={nationalNumber}
                    onCountryChange={setCountryIso}
                    onNationalNumberChange={setNationalNumber}
                    disabled={isBusy || otpSent}
                  />
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isBusy || !isPhoneValid}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all"
                    style={{
                      background: '#EAF3FB',
                      color: '#2F76BB',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Vérifier le numéro par SMS
                  </button>
                ) : (
                  <div className="mt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                        Code reçu par SMS
                      </label>
                      <button
                        type="button"
                        onClick={handleEditPhone}
                        style={{ fontSize: '12px', fontWeight: 700, color: '#2F76BB' }}
                      >
                        Modifier le numéro
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(event) =>
                        setCode(event.target.value.replace(/\D/g, '').slice(0, 10))
                      }
                      placeholder="123456"
                      className="w-full rounded-xl px-4 py-3 text-center text-[#1A1A2E] outline-none"
                      style={{
                        border: `2px solid ${code.length >= 4 ? '#2F76BB' : '#E0E0E0'}`,
                        background: '#F8FBFF',
                        fontSize: '20px',
                        fontWeight: 700,
                        letterSpacing: '6px',
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {!isAuthenticated && (
              <div>
                <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                  Mot de passe <span style={{ color: '#61BCA6' }}>*</span>
                </label>
                <div
                  className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{
                    border: `2px solid ${password ? '#2F76BB' : '#E0E0E0'}`,
                    background: password ? '#F5F9FF' : '#FAFAFA',
                  }}
                >
                  <Lock size={16} color="#61BCA6" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Au moins 6 caractères"
                    className="flex-1 bg-transparent text-[#353535] outline-none"
                    style={{ fontSize: '14px' }}
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? (
                      <EyeOff size={18} color="#7A7A7A" />
                    ) : (
                      <Eye size={18} color="#7A7A7A" />
                    )}
                  </button>
                </div>
              </div>
            )}

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
          disabled={isBusy}
          loading={isBusy}
        />

        {!isAuthenticated && (
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
        )}
      </div>
    </OnboardingStepLayout>
  );
}
