'use client';

import { PasswordRequirements } from '@/components/password-requirements';
import { PhoneInput } from '@/features/auth/components/phone-input';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { registerPhone, selectAuth, sendOtp, verifyOtp } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import { EXPERIENCE_OPTIONS } from '@/features/onboarding/constants';
import { identityStepSchema } from '@/features/onboarding/schemas';
import { patchOnboardingProfile } from '@/features/onboarding/store/onboarding-slice';
import type { OnboardingProfile, ProfileType } from '@/features/onboarding/types';
import { humanizeMediaError } from '@/features/profile/media-errors';
import {
  deleteProfileVideo,
  uploadProfilePhoto,
  uploadProfileVideo,
} from '@/features/profile/store/profile-slice';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { isPasswordPolicySatisfied } from '@/lib/password-policy';
import { DEFAULT_PHONE_COUNTRY, composeE164Phone, getPhoneCountry } from '@/lib/phone-countries';
import {
  Briefcase,
  Camera,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { FieldMicButton } from './field-mic-button';
import { OnboardingStepLayout, StepCtaRow, StepProgress } from './onboarding-step-layout';
import { VideoRecorderModal, buildVideoRecorderTr } from './video-recorder-modal';

/** Keep in sync with apps/api `PROFILE_PHOTO_MAX_BYTES` / `ALLOWED_PROFILE_PHOTO_MIMES`. */
const PROFILE_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
const PROFILE_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
const PROFILE_PHOTO_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

function isAllowedProfilePhoto(file: File): boolean {
  if (PROFILE_PHOTO_MIMES.has(file.type)) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

function ProfileSilhouette() {
  return (
    <svg width="60" height="60" viewBox="0 0 52 52" fill="none" aria-hidden>
      <circle cx="26" cy="18" r="10" fill="#2F76BB" />
      <path d="M6 50 Q6 34 26 34 Q46 34 46 50" fill="#2F76BB" />
    </svg>
  );
}

function YearsDropdown({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
        {t('onboarding.identity.yearsLabel')}
      </label>
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
            {value || t('onboarding.identity.yearsPlaceholder')}
          </span>
          <ChevronDown
            size={16}
            color="#888"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </button>
        {open && (
          <div
            className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl bg-white py-1"
            style={{ border: '1.5px solid #E0E0E0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
          >
            {EXPERIENCE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className="block w-full px-4 py-2.5 text-left"
                style={{
                  fontSize: '14px',
                  color: value === option ? '#2F76BB' : '#353535',
                  fontWeight: value === option ? 700 : 400,
                  background: value === option ? '#F5F9FF' : 'transparent',
                }}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
    profileType: ProfileType;
    experience?: string;
  }) => Promise<boolean>;
};

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
  const { t } = useI18n();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const existingName = splitName(profile?.name ?? '');
  const [firstName, setFirstName] = useState(existingName.firstName);
  const [lastName, setLastName] = useState(existingName.lastName);
  const [job, setJob] = useState(profile?.job ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [experience, setExperience] = useState(profile?.experience ?? '');
  const [image, setImage] = useState(profile?.image ?? '');
  const [profileType, setProfileType] = useState<ProfileType>(
    profile?.profile_type ?? 'INDIVIDUAL',
  );
  const [error, setError] = useState<string | null>(null);
  const [requiredTouched, setRequiredTouched] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Selected before auth — uploaded via multipart after register (never as base64 JSON).
  const pendingPhotoRef = useRef<File | null>(null);
  const localPhotoPreviewRef = useRef<string | null>(null);

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
    profile?.video ? t('onboarding.identity.videoPresentationLabel') : null,
  );
  const [videoUploaded, setVideoUploaded] = useState(Boolean(profile?.video));
  const [videoPendingLocal, setVideoPendingLocal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const pendingVideoRef = useRef<{ blob: Blob; filename: string } | null>(null);

  const country = getPhoneCountry(countryIso);
  const phone = composeE164Phone(countryIso, nationalNumber);
  const isPhoneValid = nationalNumber.length >= country.nationalLength;
  const passwordReady = isPasswordPolicySatisfied(password);

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
    setExperience(profile.experience ?? '');
    setImage(profile.image ?? '');
    setProfileType(profile.profile_type ?? 'INDIVIDUAL');
    setVideoLabel(profile.video ? t('onboarding.identity.videoPresentationLabel') : null);
    setVideoUploaded(Boolean(profile.video));
    setVideoPendingLocal(false);
  }, [profile, t]);

  const [hasPendingPhoto, setHasPendingPhoto] = useState(false);
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
  const hasPhoto = Boolean(image) || hasPendingPhoto;
  const missingPhoto = requiredTouched && isPhotoRequired && !hasPhoto;

  const clearLocalPhotoPreview = () => {
    if (localPhotoPreviewRef.current && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(localPhotoPreviewRef.current);
    }
    localPhotoPreviewRef.current = null;
  };

  useEffect(() => {
    return () => clearLocalPhotoPreview();
  }, []);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!isAllowedProfilePhoto(file)) {
      setError(t('onboarding.identity.errorPhotoType'));
      return;
    }
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      setError(t('onboarding.identity.errorPhotoTooLarge'));
      return;
    }

    setError(null);
    pendingPhotoRef.current = file;
    setHasPendingPhoto(true);
    if (typeof URL.createObjectURL === 'function') {
      clearLocalPhotoPreview();
      const preview = URL.createObjectURL(file);
      localPhotoPreviewRef.current = preview;
      setImage(preview);
    } else {
      setImage(file.name);
    }
  };

  const ensurePhotoUploaded = async (): Promise<boolean> => {
    const file = pendingPhotoRef.current;
    if (!file) return true;

    setIsUploadingPhoto(true);
    setError(null);
    const result = await dispatch(uploadProfilePhoto(file));
    setIsUploadingPhoto(false);

    if (!uploadProfilePhoto.fulfilled.match(result)) {
      setError(
        humanizeMediaError(result.error?.message) || t('onboarding.identity.errorPhotoUpload'),
      );
      return false;
    }

    pendingPhotoRef.current = null;
    setHasPendingPhoto(false);
    // Keep the local blob preview on screen — the stored `/uploads/photos/...` path
    // needs auth headers and would briefly break the <img> before we navigate away.
    dispatch(patchOnboardingProfile({ image: result.payload.image ?? null }));
    return true;
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
      setVideoUploaded(true);
      setVideoPendingLocal(false);
      pendingVideoRef.current = null;
      return true;
    }
    setVideoLabel(null);
    setVideoUploaded(false);
    setVideoPendingLocal(false);
    pendingVideoRef.current = null;
    setVideoError(
      humanizeMediaError(result.error?.message) || t('onboarding.identity.errorVideoUpload'),
    );
    return false;
  };

  const handleVideoReady = async (blob: Blob, blobUrl: string, filename: string) => {
    setShowVideoModal(false);
    setVideoError(null);
    try {
      if (!isAuthenticated) {
        pendingVideoRef.current = { blob, filename };
        setVideoLabel(filename);
        setVideoPendingLocal(true);
        setVideoUploaded(false);
        return;
      }
      await uploadVideoBlob(blob, filename);
    } finally {
      if (blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
    }
  };

  const flushPendingVideo = async () => {
    const pending = pendingVideoRef.current;
    if (!pending) return true;
    return uploadVideoBlob(pending.blob, pending.filename);
  };

  const clearLocalVideo = () => {
    setVideoLabel(null);
    setVideoError(null);
    setVideoPendingLocal(false);
    setVideoUploaded(false);
    pendingVideoRef.current = null;
  };

  const handleRemoveVideo = async () => {
    if (isUploadingVideo) return;
    if (isAuthenticated && (videoUploaded || profile?.video)) {
      setIsUploadingVideo(true);
      setVideoError(null);
      const result = await dispatch(deleteProfileVideo());
      setIsUploadingVideo(false);
      if (!deleteProfileVideo.fulfilled.match(result)) {
        setVideoError(
          humanizeMediaError(result.error?.message) || t('onboarding.identity.errorVideoDelete'),
        );
        return;
      }
      dispatch(patchOnboardingProfile({ video: null }));
    }
    clearLocalVideo();
  };

  const identityPatch = () => ({
    name,
    job: job || undefined,
    bio: bio || undefined,
    // Photo is persisted via multipart `/users/me/profile/photo`, not this JSON patch
    // (base64 in the body triggered Fastify 413 FST_ERR_CTP_BODY_TOO_LARGE).
    profileType,
    experience: profileType === 'INDIVIDUAL' && experience ? experience : undefined,
  });

  const photoPreview = useAuthenticatedMediaUrl(image || null);

  // Only ever checks phone/password, never the identity fields above — handleNext
  // validates those once before the first call, but the modal's "Renvoyer le code"
  // button calls this directly and must not re-run that validation on every resend.
  const requestOtp = async () => {
    if (!isPhoneValid) {
      setError(t('onboarding.identity.errorPhoneRequired', { length: country.nationalLength }));
      return;
    }
    if (!passwordReady) {
      setError(t('onboarding.identity.errorPasswordRequired'));
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
      setOtpError(t('onboarding.identity.errorOtpSend'));
      return;
    }
    setResendCooldown(30);
  };

  const handleNext = async () => {
    if (isPhotoRequired && !image && !pendingPhotoRef.current) {
      setRequiredTouched(true);
      setError(t('onboarding.identity.errorPhotoRequired'));
      return;
    }

    const parsed = identityStepSchema.safeParse({ name, job, bio, profileType });
    if (!parsed.success) {
      setRequiredTouched(true);
      setError(parsed.error.issues[0]?.message ?? t('onboarding.identity.errorNameRequired'));
      return;
    }

    setRequiredTouched(false);

    if (!isAuthenticated) {
      await requestOtp();
      return;
    }

    setError(null);
    if (pendingPhotoRef.current && !(await ensurePhotoUploaded())) return;
    const saved = await onNext(identityPatch());
    if (!saved) {
      setError(t('onboarding.identity.errorSave'));
    }
  };

  const handleVerifyOtp = async () => {
    if (otpVerifying) return;
    if (code.trim().length < 4) {
      setOtpError(t('onboarding.identity.errorOtpShort'));
      return;
    }

    setOtpError(null);
    setOtpVerifying(true);
    const verifyAction = await dispatch(verifyOtp({ phone, code }));
    if (!verifyOtp.fulfilled.match(verifyAction)) {
      setOtpVerifying(false);
      setOtpError(t('onboarding.identity.errorOtpInvalid'));
      return;
    }

    onRegistered?.();
    const registerAction = await dispatch(
      registerPhone({ phone, password, signupToken: verifyAction.payload.signupToken }),
    );
    if (!registerPhone.fulfilled.match(registerAction)) {
      setOtpVerifying(false);
      setOtpError(t('onboarding.identity.errorCreateAccount'));
      return;
    }

    setShowOtpModal(false);
    setOtpVerifying(false);
    // Only reachable now that registerPhone has actually succeeded — an authenticated
    // session (cookie) is required before uploadProfilePhoto's endpoint will accept it.
    if (pendingPhotoRef.current && !(await ensurePhotoUploaded())) return;
    // Optional video: a failed flush already clears the success label + sets videoError.
    await flushPendingVideo();
    const saved = await onNext(identityPatch());
    if (!saved) {
      setError(t('onboarding.identity.errorSave'));
    }
  };

  const stepContent = (
    <OnboardingStepLayout
      step={stepNumber}
      totalSteps={totalSteps}
      stepLabel={t('onboarding.identity.title')}
      onBack={() => router.push('/login')}
      backLabel={t('common.back')}
    >
      <div className="mx-auto w-full max-w-2xl">
        <StepProgress step={stepNumber} total={totalSteps} />

        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E', marginBottom: '6px' }}>
          {t('onboarding.identity.title')}
        </h1>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>
          {t('onboarding.identity.desc')}
        </p>

        <div className="space-y-6 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
          {/* Left: photo + profile type */}
          <div className="mb-6 flex flex-col items-center md:mb-0">
            <div className="relative mb-3">
              <div
                className="flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-4 transition-transform hover:scale-105"
                style={{
                  borderColor: missingPhoto ? '#E74C3C' : '#2F76BB',
                  background: '#D5E6F5',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview.url}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ProfileSilhouette />
                )}
              </div>
              <button
                type="button"
                className="absolute -right-2 -bottom-2 flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white shadow-md"
                style={{ borderColor: '#61BCA6' }}
                onClick={() => fileInputRef.current?.click()}
                aria-label={t('onboarding.identity.imageUploadDesc')}
              >
                <Camera size={16} color="#61BCA6" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={PROFILE_PHOTO_ACCEPT}
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <p style={{ fontSize: '12px', color: '#AAA' }}>{t('onboarding.identity.photoLabel')}</p>
            <p style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
              {t('onboarding.identity.photoHint')}
            </p>
            {missingPhoto && (
              <p style={{ fontSize: '11px', color: '#E74C3C', marginTop: '4px' }}>
                {t('onboarding.identity.photoRequired')}
              </p>
            )}
            {isUploadingPhoto && (
              <p
                className="mt-1 flex items-center gap-1"
                style={{ fontSize: '11px', color: '#2F76BB' }}
              >
                <Loader2 size={12} className="animate-spin" />
                {t('onboarding.identity.photoUploading')}
              </p>
            )}

            <div className="mt-6 w-full">
              <p
                style={{ fontSize: '14px', fontWeight: 700, color: '#353535', marginBottom: '8px' }}
              >
                {t('onboarding.identity.iAm')}
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
                      {type === 'PROVIDER'
                        ? t('onboarding.identity.employer')
                        : t('onboarding.identity.employee')}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Presentation video — Offering / INDIVIDUAL only (Matchy Inscription1) */}
            {profileType === 'INDIVIDUAL' && (
              <div className="mt-6 w-full">
                <div className="mb-1 flex items-center justify-between">
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#353535' }}>
                    {t('onboarding.identity.videoTitle')}
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
                    {t('onboarding.identity.videoMax')}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#AAA', marginBottom: '10px' }}>
                  {t('onboarding.identity.videoDesc')}
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
                        {t('onboarding.identity.videoRecordBtn')}
                      </p>
                      <p style={{ fontSize: '11px', color: '#AAA', marginTop: '1px' }}>
                        {t('onboarding.identity.videoRecordHint')}
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
                      <p style={{ fontSize: '10px', color: '#2A9177' }}>
                        {videoUploaded
                          ? t('onboarding.identity.videoAdded')
                          : videoPendingLocal
                            ? t('onboarding.identity.videoReady')
                            : t('onboarding.identity.videoSelected')}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isUploadingVideo}
                      onClick={() => void handleRemoveVideo()}
                      className="shrink-0"
                      aria-label={t('onboarding.identity.videoRemove')}
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
                    {t('onboarding.identity.videoUploading')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: identity fields */}
          <div className="space-y-4">
            <div>
              <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                {t('onboarding.identity.firstName')} <span style={{ color: '#61BCA6' }}>*</span>
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder={t('onboarding.identity.firstNamePlaceholder')}
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
                {t('onboarding.identity.lastName')} <span style={{ color: '#61BCA6' }}>*</span>
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder={t('onboarding.identity.lastNamePlaceholder')}
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
                    {t('onboarding.identity.phoneLabel')}{' '}
                    <span style={{ color: '#61BCA6' }}>*</span>
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
                    {t('onboarding.identity.passwordLabel')}{' '}
                    <span style={{ color: '#61BCA6' }}>*</span>
                  </label>
                  <div
                    className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{
                      border: `2px solid ${
                        password.length > 0 && !passwordReady
                          ? '#E74C3C'
                          : passwordReady
                            ? '#2F76BB'
                            : '#E0E0E0'
                      }`,
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
                  <PasswordRequirements password={password} />
                </div>
              </>
            )}

            <div>
              <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                {t('onboarding.identity.jobTitle')}
                {isJobRequired ? (
                  <span style={{ color: '#61BCA6' }}> *</span>
                ) : (
                  <span style={{ color: '#888' }}> {t('onboarding.identity.jobOptional')}</span>
                )}
              </label>
              <div className="mt-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2">
                    <Briefcase size={15} color={job ? '#2F76BB' : '#CCC'} />
                  </div>
                  <input
                    type="text"
                    value={job}
                    onChange={(event) => setJob(event.target.value)}
                    placeholder={t('onboarding.identity.jobProfessionPlaceholder')}
                    className="w-full rounded-xl py-3 text-[#353535] transition-all outline-none"
                    style={{
                      fontSize: '14px',
                      border: `2px solid ${job ? '#2F76BB' : '#E0E0E0'}`,
                      background: job ? '#F5F9FF' : '#FAFAFA',
                      paddingLeft: '36px',
                      paddingRight: '16px',
                    }}
                  />
                </div>
                <FieldMicButton
                  onResult={(text) => setJob(text)}
                  disabled={loading || otpSending}
                />
              </div>
            </div>

            {profileType === 'INDIVIDUAL' && (
              <div className="mt-4">
                <YearsDropdown value={experience} onChange={setExperience} />
              </div>
            )}

            <div>
              <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                {t('onboarding.identity.aboutLabel')}
              </label>
              <div className="relative mt-1">
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value.slice(0, 250))}
                  placeholder={t('onboarding.identity.aboutPlaceholder')}
                  className="w-full resize-none rounded-xl px-4 py-3 pr-12 text-[#353535] transition-all outline-none"
                  style={{
                    fontSize: '14px',
                    border: `2px solid ${bio ? '#2F76BB' : '#E0E0E0'}`,
                    background: bio ? '#F5F9FF' : '#FAFAFA',
                    minHeight: '100px',
                  }}
                />
                <div className="absolute top-2 right-2">
                  <FieldMicButton
                    small
                    onResult={(text) => {
                      if (text.length <= 250) setBio(text.slice(0, 250));
                    }}
                    disabled={loading || otpSending}
                  />
                </div>
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
            isAuthenticated
              ? t('onboarding.identity.saveContinue')
              : t('onboarding.identity.continueVerify')
          }
          disabled={loading || otpSending || isUploadingVideo}
          loading={loading || otpSending || isUploadingVideo}
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
          {t('onboarding.identity.login')}
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
