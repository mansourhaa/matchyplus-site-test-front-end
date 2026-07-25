'use client';

import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { sendOtpSchema } from '@/features/auth/schemas';
import { registerPhone, selectAuth, sendOtp } from '@/features/auth/store/auth-slice';
import { identityStepSchema } from '@/features/onboarding/schemas';
import type { OnboardingProfile, ProfileType } from '@/features/onboarding/types';
import { DEFAULT_PHONE_COUNTRY, composeE164Phone, getPhoneCountry } from '@/lib/phone-countries';
import { Eye, EyeOff, Loader2, Lock, Upload, User } from 'lucide-react';
import { useState } from 'react';

import { PhoneInput } from '../auth/phone-input';
import { OnboardingStepLayout } from './onboarding-step-layout';

type IdentityStepProps = {
  profile: OnboardingProfile | null;
  stepNumber: number;
  totalSteps: number;
  loading: boolean;
  isAuthenticated: boolean;
  onNext: (patch: {
    name?: string;
    job: string;
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

  const [name, setName] = useState(profile?.name ?? '');
  const [job, setJob] = useState(profile?.job ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [image, setImage] = useState(profile?.image ?? '');
  const [profileType, setProfileType] = useState<ProfileType>(
    profile?.profile_type ?? 'INDIVIDUAL',
  );
  const [error, setError] = useState<string | null>(null);

  // Account bootstrap fields — only relevant when !isAuthenticated (a fresh "Créer un
  // compte" visit). Mirrors register-form.tsx's send-code-then-register-with-code flow.
  const [countryIso, setCountryIso] = useState(DEFAULT_PHONE_COUNTRY.iso);
  const [nationalNumber, setNationalNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');

  const country = getPhoneCountry(countryIso);
  const phone = composeE164Phone(countryIso, nationalNumber);
  const isPhoneAndPasswordValid =
    nationalNumber.length >= country.nationalLength && password.length >= 6;
  const isBusy = loading || auth.loading;

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImage(await readFileAsDataUrl(file));
  };

  const handleSendCode = async () => {
    const parsed = sendOtpSchema.safeParse({ phone });
    if (!parsed.success || !isPhoneAndPasswordValid) {
      setError(
        `Entrez un numéro de téléphone valide (${country.nationalLength} chiffres) et un mot de passe (6 caractères minimum).`,
      );
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

  const handleSubmit = async () => {
    const parsed = identityStepSchema.safeParse({ name, job, bio, image, profileType });
    if (!parsed.success) {
      setError('Le nom et la profession sont obligatoires.');
      return;
    }

    if (!isAuthenticated) {
      if (!otpSent || code.trim().length < 4) {
        setError('Entrez le code reçu par SMS.');
        return;
      }

      setError(null);
      const registerResult = await dispatch(registerPhone({ phone, password, code, name }));
      if (!registerPhone.fulfilled.match(registerResult)) {
        setError('Code invalide ou expiré.');
        return;
      }

      // The account now exists and is authenticated — onNext's PATCH call will
      // succeed from here on. `name` was already sent via registerPhone.
      const saved = await onNext({
        job,
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
      job,
      bio: bio || undefined,
      image: image || undefined,
      profileType,
    });
    if (!saved) {
      setError('Échec de la sauvegarde. Réessayez.');
    }
  };

  const showSendCodeButton = !isAuthenticated && !otpSent;

  return (
    <OnboardingStepLayout step={stepNumber} totalSteps={totalSteps} stepLabel="Votre identité">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8">
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1A1A2E' }}>
            {isAuthenticated ? 'Votre identité' : 'Créer un compte'}
          </h1>
          <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginTop: '6px' }}>
            {isAuthenticated
              ? 'Commençons par les informations de base.'
              : 'Rejoignez Matchy+ avec votre numéro de téléphone.'}
          </p>
        </div>

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            Photo de profil
          </label>
          <label
            className="mt-2 flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3.5"
            style={{ border: '2px dashed #2F76BB', background: '#F5F9FF' }}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: '#E8F0FA' }}
              >
                <User size={20} color="#2F76BB" />
              </div>
            )}
            <span
              className="flex flex-1 items-center gap-2"
              style={{ fontSize: '13px', fontWeight: 600, color: '#353535' }}
            >
              <Upload size={14} />
              {image ? 'Changer la photo' : 'Choisir une photo'}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        </div>

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>Je suis</label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setProfileType('INDIVIDUAL')}
              className="flex-1 rounded-2xl py-2.5"
              style={{
                border: `1.5px solid ${profileType === 'INDIVIDUAL' ? '#2F76BB' : '#E8E8E8'}`,
                background: profileType === 'INDIVIDUAL' ? '#F3F8FF' : 'white',
                fontSize: '13px',
                fontWeight: 700,
                color: profileType === 'INDIVIDUAL' ? '#2F76BB' : '#667085',
              }}
            >
              Employé
            </button>
            <button
              type="button"
              onClick={() => setProfileType('PROVIDER')}
              className="flex-1 rounded-2xl py-2.5"
              style={{
                border: `1.5px solid ${profileType === 'PROVIDER' ? '#2F76BB' : '#E8E8E8'}`,
                background: profileType === 'PROVIDER' ? '#F3F8FF' : 'white',
                fontSize: '13px',
                fontWeight: 700,
                color: profileType === 'PROVIDER' ? '#2F76BB' : '#667085',
              }}
            >
              Employeur
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>Nom complet</label>
          <div
            className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-3.5"
            style={{ border: '2px solid #2F76BB', background: '#F5F9FF' }}
          >
            <input
              type="text"
              value={name}
              disabled={!isAuthenticated && otpSent}
              onChange={(event) => setName(event.target.value)}
              placeholder="Votre nom complet"
              className="flex-1 bg-transparent text-[#353535] outline-none"
              style={{ fontSize: '15px' }}
            />
          </div>
        </div>

        {!isAuthenticated && (
          <>
            <div className="mb-4">
              <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                Numéro de téléphone
              </label>
              <PhoneInput
                countryIso={countryIso}
                nationalNumber={nationalNumber}
                onCountryChange={setCountryIso}
                onNationalNumberChange={setNationalNumber}
                disabled={isBusy || otpSent}
              />
            </div>

            <div className="mb-4">
              <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                Mot de passe
              </label>
              <div
                className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-3.5"
                style={{ border: '2px solid #2F76BB', background: '#F5F9FF' }}
              >
                <Lock size={16} color="#61BCA6" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  disabled={otpSent}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Au moins 6 caractères"
                  className="flex-1 bg-transparent text-[#353535] outline-none"
                  style={{ fontSize: '15px' }}
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

            {otpSent && (
              <>
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={handleEditPhone}
                    style={{ fontSize: '12px', fontWeight: 700, color: '#2F76BB' }}
                  >
                    Modifier le numéro
                  </button>
                </div>

                <div className="mb-4">
                  <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                    Code reçu par SMS
                  </label>
                  <div
                    className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-3.5"
                    style={{ border: '2px solid #2F76BB', background: '#F5F9FF' }}
                  >
                    <input
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(event) =>
                        setCode(event.target.value.replace(/\D/g, '').slice(0, 10))
                      }
                      placeholder="123456"
                      className="flex-1 bg-transparent text-[#353535] outline-none"
                      style={{ fontSize: '15px' }}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            Métier / Profession
          </label>
          <div
            className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-3.5"
            style={{ border: '2px solid #2F76BB', background: '#F5F9FF' }}
          >
            <input
              type="text"
              value={job}
              onChange={(event) => setJob(event.target.value)}
              placeholder="Ingénieur, designer, chauffeur..."
              className="flex-1 bg-transparent text-[#353535] outline-none"
              style={{ fontSize: '15px' }}
            />
          </div>
        </div>

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            À propos de vous
          </label>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value.slice(0, 250))}
            placeholder="Parlez de vous en quelques mots..."
            rows={3}
            className="mt-2 w-full resize-none rounded-2xl px-4 py-3.5 text-[#353535] outline-none"
            style={{ border: '2px solid #2F76BB', background: '#F5F9FF', fontSize: '14px' }}
          />
          <p className="mt-1 text-right" style={{ fontSize: '11px', color: '#AAA' }}>
            {bio.length}/250
          </p>
        </div>

        {error && (
          <p className="mb-3 text-center" style={{ fontSize: '12px', color: '#E24E59' }}>
            {error}
          </p>
        )}

        <button
          onClick={showSendCodeButton ? handleSendCode : handleSubmit}
          disabled={isBusy || (showSendCodeButton && !isPhoneAndPasswordValid)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white"
          style={{
            background: !isBusy ? 'linear-gradient(90deg, #61BCA6, #2F76BB)' : '#D5D5D5',
            fontSize: '14px',
            fontWeight: 700,
          }}
        >
          {isBusy && <Loader2 size={16} className="animate-spin" />}
          {showSendCodeButton ? 'Envoyer le code' : 'Enregistrer et continuer'}
        </button>
      </div>
    </OnboardingStepLayout>
  );
}
