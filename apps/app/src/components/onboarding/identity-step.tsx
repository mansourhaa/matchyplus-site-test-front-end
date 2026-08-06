'use client';

import { PhoneInput } from '@/components/auth/phone-input';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { registerPhone, selectAuth, sendOtp, verifyOtp } from '@/features/auth/store/auth-slice';
import { identityStepSchema } from '@/features/onboarding/schemas';
import { patchOnboardingProfile } from '@/features/onboarding/store/onboarding-slice';
import type { OnboardingProfile, ProfileType } from '@/features/onboarding/types';
import { humanizeMediaError } from '@/features/profile/media-errors';
import { uploadProfileVideo } from '@/features/profile/store/profile-slice';
import { DEFAULT_PHONE_COUNTRY, composeE164Phone, getPhoneCountry } from '@/lib/phone-countries';
import { Check, Eye, EyeOff, Loader2, Lock, ShieldCheck, User, Video, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { FieldMicButton } from './field-mic-button';
import { OnboardingStepLayout, StepCtaRow, StepProgress } from './onboarding-step-layout';
import { VideoRecorderModal, buildVideoRecorderTr } from './video-recorder-modal';

type IdentityStepProps = {
  profile: OnboardingProfile | null;
  stepNumber: number;
  totalSteps: number;
  loading: boolean;
  // False only for a brand-new visitor who hasn't created an account yet — this step
  // then also collects phone + password + OTP before it can save anything (see
  // handleNext below). True for every other case (OAuth account, resumed phone
  // signup, already-authenticated-but-incomplete profile).
  isAuthenticated: boolean;
  // Called right before attempting registerPhone (not after) — lets the wizard raise
  // its guard before isAuthenticated has any chance to flip, so it can skip its own
  // redundant fetch-on-authenticated effect and step-navigation (a GET racing the
  // upcoming identity save could resolve after it and overwrite the just-saved fields
  // with the still-empty brand-new profile). Calling this only after registerPhone
  // resolves would leave a gap — React doesn't guarantee that state change and this
  // one land in the same render, since they're separated by an await.
  onRegistered?: () => void;
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

// For an already-authenticated user, this step behaves exactly like matchy-plus-legacy's
// Inscription1. For a brand-new visitor (isAuthenticated=false) it also collects phone +
// password + OTP first — there is no separate credentials screen anymore.
export function IdentityStep({
  profile,
  stepNumber,
  totalSteps,
  loading,
  isAuthenticated,
  onRegistered,
  onNext,
}: IdentityStepProps) {
  const dispatch = useAppDispatch();
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

  // Credentials — only rendered/validated when !isAuthenticated. Single password field,
  // no confirmation.
  const [countryIso, setCountryIso] = useState(DEFAULT_PHONE_COUNTRY.iso);
  const [nationalNumber, setNationalNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [code, setCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [videoLabel, setVideoLabel] = useState<string | null>(
    profile?.video ? 'Vidéo de présentation' : null,
  );
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const pendingVideoRef = useRef<{ blob: Blob; filename: string } | null>(null);

  const country = getPhoneCountry(countryIso);
  const phone = composeE164Phone(countryIso, nationalNumber);
  const isPhoneValid = nationalNumber.length >= country.nationalLength;
  const passwordReady = password.length >= 6;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendCooldown]);

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
    setVideoLabel(profile.video ? 'Vidéo de présentation' : null);
  }, [profile]);

  const { user } = useAppSelector(selectAuth);
  const name = `${firstName} ${lastName}`.trim();
  const isJobRequired = profileType === 'INDIVIDUAL';
  // Only a phone-signup account ever needs a real profile photo — matching the old
  // app's Inscription1 (`requiresPhoto = isPhoneSignupFlow() || Boolean(data.phone)`).
  // An OAuth account already has a provider avatar concept and never collected a phone.
  // While !isAuthenticated, this is unconditionally a fresh phone signup — the only kind
  // of account reachable without a session — so user/profile.auth_provider is ignored
  // entirely rather than trusted: a stale rehydrated OAuth `user` left over in Redux from
  // a previous session must not waive the photo requirement for this new signup.
  const authProvider = isAuthenticated
    ? (user?.auth_provider ?? profile?.auth_provider ?? 'phone')
    : 'phone';
  const isPhotoRequired = authProvider === 'phone';
  const missingPhoto = requiredTouched && isPhotoRequired && !image;

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImage(await readFileAsDataUrl(file));
  };

  const uploadVideoBlob = async (blob: Blob, filename: string) => {
    setIsUploadingVideo(true);
    setVideoError(null);
    const type = blob.type || 'video/webm';
    const file = new File([blob], filename, { type });
    const result = await dispatch(uploadProfileVideo(file));
    setIsUploadingVideo(false);
    if (uploadProfileVideo.fulfilled.match(result)) {
      dispatch(patchOnboardingProfile({ video: result.payload.video ?? null }));
      setVideoLabel(filename);
      pendingVideoRef.current = null;
      return true;
    }
    setVideoError(humanizeMediaError(result.error?.message) || 'Échec de l’upload vidéo.');
    return false;
  };

  const handleVideoReady = async (blob: Blob, _blobUrl: string, filename: string) => {
    setShowVideoModal(false);
    setVideoLabel(filename);
    if (!isAuthenticated) {
      pendingVideoRef.current = { blob, filename };
      return;
    }
    await uploadVideoBlob(blob, filename);
  };

  const flushPendingVideo = async () => {
    const pending = pendingVideoRef.current;
    if (!pending) return;
    await uploadVideoBlob(pending.blob, pending.filename);
  };

  const identityPatch = () => ({
    name,
    job: job || undefined,
    bio: bio || undefined,
    image: image || undefined,
    profileType,
  });

  // Only ever checks phone/password, never the identity fields above — handleNext
  // validates those once before the first call, but the modal's "Renvoyer le code"
  // button calls this directly and must not re-run that validation on every resend.
  const requestOtp = async () => {
    if (!isPhoneValid) {
      setError(`Le numéro de téléphone est obligatoire (${country.nationalLength} chiffres).`);
      return;
    }
    if (!passwordReady) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setError(null);
    setOtpError(null);
    setCode('');
    setShowOtpModal(true);
    setOtpSending(true);
    const sendAction = await dispatch(sendOtp({ phone }));
    setOtpSending(false);

    if (!sendOtp.fulfilled.match(sendAction)) {
      setOtpError("Impossible d'envoyer le code. Vérifiez votre numéro.");
      return;
    }
    setResendCooldown(30);
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

    if (!isAuthenticated) {
      await requestOtp();
      return;
    }

    setError(null);
    const saved = await onNext(identityPatch());
    if (!saved) {
      setError('Échec de la sauvegarde. Réessayez.');
    }
  };

  const handleVerifyOtp = async () => {
    if (otpVerifying) return;
    if (code.trim().length < 4) {
      setOtpError('Entrez le code à 6 chiffres.');
      return;
    }

    setOtpError(null);
    setOtpVerifying(true);
    const verifyAction = await dispatch(verifyOtp({ phone, code }));
    if (!verifyOtp.fulfilled.match(verifyAction)) {
      setOtpVerifying(false);
      setOtpError('Code incorrect.');
      return;
    }

    onRegistered?.();
    const registerAction = await dispatch(
      registerPhone({ phone, password, signupToken: verifyAction.payload.signupToken }),
    );
    if (!registerPhone.fulfilled.match(registerAction)) {
      setOtpVerifying(false);
      setOtpError('Impossible de créer le compte.');
      return;
    }

    setShowOtpModal(false);
    setOtpVerifying(false);
    await flushPendingVideo();
    const saved = await onNext(identityPatch());
    if (!saved) {
      setError('Échec de la sauvegarde. Réessayez.');
    }
  };

  const stepContent = (
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

            {/* Presentation video — Employé / INDIVIDUAL only (Matchy Inscription1) */}
            {profileType === 'INDIVIDUAL' && (
              <div className="mt-6 w-full">
                <div className="mb-1 flex items-center justify-between">
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#353535' }}>
                    Vidéo présentation
                  </p>
                  <span
                    className="rounded-full px-2 py-0.5"
                    style={{
                      background: '#E8F0FA',
                      color: '#2F76BB',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}
                  >
                    20s max
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#AAA', marginBottom: '10px' }}>
                  Enregistrez une courte vidéo de présentation ou importez depuis votre appareil
                </p>

                {!videoLabel ? (
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(true)}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 transition-all hover:shadow-sm"
                    style={{ border: '2px dashed #D0D0D0', background: 'white' }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: 'linear-gradient(135deg, #61BCA6, #2F76BB)' }}
                    >
                      <Video size={18} color="white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#2F76BB' }}>
                        Enregistrer ou importer
                      </p>
                      <p style={{ fontSize: '11px', color: '#AAA', marginTop: '1px' }}>
                        Caméra ou import · 20s max
                      </p>
                    </div>
                    <Video size={16} color="#61BCA6" />
                  </button>
                ) : (
                  <div
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3"
                    style={{ border: '2px solid #61BCA6', background: '#E8F7F3' }}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ background: '#61BCA6' }}
                    >
                      <Video size={16} color="white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate"
                        style={{ fontSize: '13px', fontWeight: 600, color: '#61BCA6' }}
                      >
                        {videoLabel}
                      </p>
                      <p style={{ fontSize: '10px', color: '#2A9177' }}>Vidéo ajoutée ✓</p>
                    </div>
                    <button
                      type="button"
                      disabled={isUploadingVideo}
                      onClick={() => {
                        setVideoLabel(null);
                        setVideoError(null);
                        pendingVideoRef.current = null;
                      }}
                      className="shrink-0"
                      aria-label="Supprimer la vidéo"
                    >
                      <X size={16} color="#AAA" />
                    </button>
                  </div>
                )}

                {videoError && (
                  <p style={{ fontSize: '12px', color: '#E74C3C', marginTop: '6px' }}>
                    {videoError}
                  </p>
                )}
                {isUploadingVideo && (
                  <p style={{ fontSize: '12px', color: '#2F76BB', marginTop: '6px' }}>
                    Upload de la vidéo...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: identity fields */}
          <div className="space-y-4">
            <div>
              <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                Prénom <span style={{ color: '#61BCA6' }}>*</span>
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Votre prénom"
                  className="w-full rounded-xl px-4 py-3 text-[#353535] transition-all outline-none"
                  style={{
                    fontSize: '14px',
                    border: `2px solid ${firstName ? '#2F76BB' : '#E0E0E0'}`,
                    background: firstName ? '#F5F9FF' : '#FAFAFA',
                  }}
                />
                <FieldMicButton
                  onResult={(text) => setFirstName(text)}
                  disabled={loading || otpSending}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                Nom <span style={{ color: '#61BCA6' }}>*</span>
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Votre nom de famille"
                  className="w-full rounded-xl px-4 py-3 text-[#353535] transition-all outline-none"
                  style={{
                    fontSize: '14px',
                    border: `2px solid ${lastName ? '#2F76BB' : '#E0E0E0'}`,
                    background: lastName ? '#F5F9FF' : '#FAFAFA',
                  }}
                />
                <FieldMicButton
                  onResult={(text) => setLastName(text)}
                  disabled={loading || otpSending}
                />
              </div>
            </div>

            {!isAuthenticated && (
              <>
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
                      disabled={loading || otpSending}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                    Mot de passe <span style={{ color: '#61BCA6' }}>*</span>
                  </label>
                  <div
                    className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{
                      border: `2px solid ${password.length > 0 && password.length < 6 ? '#E74C3C' : password.length >= 6 ? '#2F76BB' : '#E0E0E0'}`,
                      background: password ? '#F5F9FF' : '#FAFAFA',
                    }}
                  >
                    <Lock size={16} color="#61BCA6" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      disabled={loading || otpSending}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
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
                  {password.length > 0 && password.length < 6 && (
                    <p style={{ fontSize: '11px', color: '#E74C3C', marginTop: '4px' }}>
                      Au moins 6 caractères
                    </p>
                  )}
                </div>
              </>
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
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={job}
                  onChange={(event) => setJob(event.target.value)}
                  placeholder="Ingénieur, designer, chauffeur..."
                  className="w-full rounded-xl px-4 py-3 text-[#353535] transition-all outline-none"
                  style={{
                    fontSize: '14px',
                    border: `2px solid ${job ? '#2F76BB' : '#E0E0E0'}`,
                    background: job ? '#F5F9FF' : '#FAFAFA',
                  }}
                />
                <FieldMicButton
                  onResult={(text) => setJob(text)}
                  disabled={loading || otpSending}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                À propos de vous
              </label>
              <div className="mt-1 flex items-start gap-2">
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value.slice(0, 250))}
                  placeholder="Parlez de vous en quelques mots..."
                  rows={3}
                  className="w-full resize-none rounded-xl px-4 py-3 text-[#353535] transition-all outline-none"
                  style={{
                    fontSize: '14px',
                    border: `2px solid ${bio ? '#2F76BB' : '#E0E0E0'}`,
                    background: bio ? '#F5F9FF' : '#FAFAFA',
                  }}
                />
                <FieldMicButton
                  onResult={(text) =>
                    setBio((prev) => `${prev ? `${prev} ` : ''}${text}`.slice(0, 250))
                  }
                  disabled={loading || otpSending}
                />
              </div>
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
          continueLabel={
            isAuthenticated ? 'Enregistrer et continuer' : 'Continuer et vérifier par SMS'
          }
          disabled={loading || otpSending}
          loading={loading || otpSending}
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

  return (
    <>
      {showOtpModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center px-4"
          style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }}
          onClick={() => {
            if (!otpVerifying) setShowOtpModal(false);
          }}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-white p-6"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                if (!otpVerifying) setShowOtpModal(false);
              }}
              disabled={otpVerifying}
              className="absolute top-4 right-4"
              aria-label="Fermer"
            >
              <X size={20} color="#9AA5B4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #61BCA6, #2F76BB)' }}
              >
                <ShieldCheck size={26} color="white" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1A1A2E' }}>
                Vérifiez votre numéro
              </h2>
              <p style={{ fontSize: '13px', color: '#888', marginTop: '6px' }}>
                Entrez le code envoyé au{' '}
                <span style={{ fontWeight: 700, color: '#2F76BB' }}>{phone}</span>
              </p>
            </div>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                setOtpError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleVerifyOtp();
              }}
              placeholder="------"
              className="mt-5 w-full rounded-xl py-3 text-center outline-none"
              style={{
                border: `2px solid ${otpError ? '#E74C3C' : code.length >= 4 ? '#2F76BB' : '#E0E0E0'}`,
                background: '#F8FBFF',
                fontSize: '24px',
                fontWeight: 700,
                letterSpacing: '10px',
                color: '#1A1A2E',
              }}
            />

            {otpError && (
              <p className="mt-2 text-center" style={{ fontSize: '12px', color: '#E74C3C' }}>
                {otpError}
              </p>
            )}

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={otpVerifying || code.trim().length < 4}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white"
              style={{
                background:
                  otpVerifying || code.trim().length < 4
                    ? '#AFC4DA'
                    : 'linear-gradient(90deg, #61BCA6, #2F76BB)',
                fontSize: '15px',
                fontWeight: 700,
              }}
            >
              {otpVerifying ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Confirmer
            </button>

            <button
              type="button"
              onClick={() => void requestOtp()}
              disabled={otpSending || otpVerifying || resendCooldown > 0}
              className="mt-3 w-full rounded-xl py-2"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: resendCooldown > 0 || otpSending || otpVerifying ? '#AAA' : '#2F76BB',
                background: 'transparent',
              }}
            >
              {otpSending
                ? 'Envoi...'
                : resendCooldown > 0
                  ? `Renvoyer (${resendCooldown}s)`
                  : 'Renvoyer le code'}
            </button>
          </div>
        </div>
      )}

      {showVideoModal && (
        <VideoRecorderModal
          onVideoReady={handleVideoReady}
          onClose={() => setShowVideoModal(false)}
          tr={buildVideoRecorderTr('fr', 'fr-FR')}
        />
      )}

      {stepContent}
    </>
  );
}
