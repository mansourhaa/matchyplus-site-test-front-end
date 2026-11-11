'use client';

import { useAppDispatch } from '@/features/auth/hooks';
import { confirmActivation } from '@/features/auth/store/auth-slice';
import type { ActivationPreviewResponse } from '@/features/auth/types';
import { useI18n } from '@/features/i18n/i18n-provider';
import { api, getApiErrorCode } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media-url';
import { resolvePostAuthDestination } from '@/lib/post-auth-routing';
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  MapPin,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AuthLayout } from './auth-layout';

export function ActivationView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const dispatch = useAppDispatch();
  const { t, dir } = useI18n();

  const [loadingPreview, setLoadingPreview] = useState(true);
  const [preview, setPreview] = useState<ActivationPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activatedSuccess, setActivatedSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!token.trim()) {
      const timer = window.setTimeout(() => {
        if (!isMounted) return;
        setPreviewError(t('auth.activation.errorMissingToken'));
        setLoadingPreview(false);
      }, 0);
      return () => {
        isMounted = false;
        window.clearTimeout(timer);
      };
    }

    async function loadPreview() {
      try {
        const response = await api.get<ActivationPreviewResponse>('/auth/activation/preview', {
          params: { token: token.trim() },
        });
        if (isMounted) {
          setPreview(response.data);
          setPreviewError(null);
        }
      } catch (err) {
        if (!isMounted) return;
        const code = getApiErrorCode(err);
        if (code === 'invalid_activation_token') {
          setPreviewError(t('auth.activation.errorExpiredToken'));
        } else if (code === 'account_banned') {
          setPreviewError(t('auth.activation.errorBanned'));
        } else {
          setPreviewError(t('auth.activation.errorGeneric'));
        }
      } finally {
        if (isMounted) {
          setLoadingPreview(false);
        }
      }
    }

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, [token, t]);

  // Security requirements checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPolicySatisfied = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (!isPolicySatisfied) {
      setSubmitError(t('auth.activation.policyNotSatisfied'));
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError(t('auth.activation.passwordsDoNotMatch'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await dispatch(
        confirmActivation({
          token: token.trim(),
          password,
        }),
      );

      if (confirmActivation.fulfilled.match(result)) {
        setActivatedSuccess(true);
        const destination = resolvePostAuthDestination(
          searchParams.get('next'),
          Boolean(result.payload.user.onboarding_completed),
        );
        setTimeout(() => {
          router.push(destination);
        }, 1200);
      } else {
        const message = (result.payload as string | undefined) ?? result.error.message;
        if (message === 'weak_password') {
          setSubmitError(t('auth.activation.errorWeakPassword'));
        } else if (message === 'invalid_activation_token') {
          setSubmitError(t('auth.activation.errorExpiredToken'));
        } else {
          setSubmitError(t('auth.activation.errorGeneric'));
        }
      }
    } catch {
      setSubmitError(t('auth.activation.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-10 lg:px-14" dir={dir}>
        <div className="mx-auto w-full max-w-md">
          {/* Loading state */}
          {loadingPreview && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2F76BB]">
                <Loader2 className="animate-spin" size={28} />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {t('auth.activation.loadingTitle')}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {t('auth.activation.loadingSubtitle')}
              </p>
            </div>
          )}

          {/* Error state */}
          {!loadingPreview && previewError && (
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-500 shadow-xs">
                <AlertTriangle size={30} />
              </div>
              <h1 className="text-xl font-extrabold text-slate-900">
                {t('auth.activation.errorTitle')}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{previewError}</p>
              <div className="mt-6 flex w-full flex-col gap-2">
                <Link
                  href="/connexion"
                  className="flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-bold text-white transition hover:opacity-95 shadow-xs"
                  style={{ background: '#2F76BB' }}
                >
                  {t('auth.activation.backToLogin')}
                </Link>
              </div>
            </div>
          )}

          {/* Active form state */}
          {!loadingPreview && !previewError && preview && (
            <div>
              {/* Header */}
              <div className="mb-6 text-center">
                <div
                  className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold"
                  style={{
                    background: 'rgba(97, 188, 166, 0.15)',
                    color: '#288771',
                    border: '1px solid rgba(97, 188, 166, 0.3)',
                  }}
                >
                  <ShieldCheck size={14} />
                  {t('auth.activation.badge')}
                </div>
                <h1 className="text-2xl font-extrabold text-[#1A1A2E]">
                  {t('auth.activation.welcomeTitle', { name: preview.name })}
                </h1>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {t('auth.activation.welcomeDesc')}
                </p>
              </div>

              {/* Profile Summary Card with Displayed Avatar */}
              <div
                className="mb-6 rounded-2xl border p-4 shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, #F9FBFE 0%, #FFFFFF 100%)',
                  borderColor: '#D0E4F7',
                }}
              >
                <div className="flex items-center gap-3.5">
                  {preview.image && !imageLoadError ? (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-md ring-2 ring-[#2F76BB]/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveMediaUrl(preview.image) ?? preview.image}
                        alt={preview.name}
                        className="h-full w-full object-cover"
                        onError={() => setImageLoadError(true)}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-bold text-white shadow-md"
                      style={{
                        background: 'linear-gradient(135deg, #61BCA6 0%, #2F76BB 100%)',
                      }}
                    >
                      <UserIcon size={24} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{preview.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {preview.job && (
                        <span className="flex items-center gap-1 font-semibold text-[#2F76BB]">
                          <Award size={13} />
                          {preview.job}
                        </span>
                      )}
                      {preview.city && (
                        <span className="flex items-center gap-1">
                          <MapPin size={13} className="text-[#61BCA6]" />
                          {preview.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {preview.phone && (
                  <div className="mt-3.5 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    <Phone size={13} className="text-slate-400" />
                    <span>{t('auth.activation.loginIdentifier')} </span>
                    <span className="font-semibold text-slate-800">{preview.phone}</span>
                  </div>
                )}
              </div>

              {/* Success notification */}
              {activatedSuccess && (
                <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                  <CheckCircle size={20} className="shrink-0 text-emerald-600" />
                  <div className="text-xs">
                    <p className="font-bold">{t('auth.activation.successTitle')}</p>
                    <p className="text-emerald-700">{t('auth.activation.redirecting')}</p>
                  </div>
                </div>
              )}

              {/* Error banner */}
              {submitError && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-600">
                  {submitError}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="activation-password"
                    className="text-xs font-semibold text-slate-700"
                  >
                    {t('auth.activation.newPasswordLabel')}
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input
                      id="activation-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      disabled={submitting || activatedSuccess}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={t('auth.activation.newPasswordPlaceholder')}
                      className="w-full rounded-2xl border py-3 pr-11 pl-10 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#2F76BB] focus:ring-2 focus:ring-[#2F76BB]/15"
                      style={{ background: '#F5F7FA', borderColor: '#D0E4F7' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="activation-confirm-password"
                    className="text-xs font-semibold text-slate-700"
                  >
                    {t('auth.activation.confirmPasswordLabel')}
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <KeyRound size={16} />
                    </div>
                    <input
                      id="activation-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      disabled={submitting || activatedSuccess}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder={t('auth.activation.confirmPasswordPlaceholder')}
                      className="w-full rounded-2xl border py-3 pr-11 pl-10 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-[#2F76BB] focus:ring-2 focus:ring-[#2F76BB]/15"
                      style={{ background: '#F5F7FA', borderColor: '#D0E4F7' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                      aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Security checklist */}
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5 text-xs">
                  <p className="mb-2 font-semibold text-slate-700">
                    {t('auth.activation.securityRequirements')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-white ${
                          hasMinLength ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      >
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className={hasMinLength ? 'font-medium text-emerald-800' : 'text-slate-500'}>
                        {t('auth.activation.minCharacters')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-white ${
                          hasUppercase ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      >
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className={hasUppercase ? 'font-medium text-emerald-800' : 'text-slate-500'}>
                        {t('auth.activation.uppercaseLetter')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-white ${
                          hasLowercase ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      >
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className={hasLowercase ? 'font-medium text-emerald-800' : 'text-slate-500'}>
                        {t('auth.activation.lowercaseLetter')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-white ${
                          hasNumber ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      >
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span className={hasNumber ? 'font-medium text-emerald-800' : 'text-slate-500'}>
                        {t('auth.activation.oneDigit')}
                      </span>
                    </div>
                  </div>
                  {confirmPassword.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-200/60 pt-2.5">
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-white ${
                          passwordsMatch ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                      >
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span
                        className={
                          passwordsMatch
                            ? 'font-medium text-emerald-800'
                            : 'font-medium text-amber-700'
                        }
                      >
                        {passwordsMatch
                          ? t('auth.activation.passwordsMatch')
                          : t('auth.activation.passwordsDoNotMatch')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={submitting || !isPolicySatisfied || !passwordsMatch || activatedSuccess}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-md transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t('auth.activation.activatingButton')}
                    </>
                  ) : (
                    t('auth.activation.activateButton')
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-500">
                <Link href="/connexion" className="font-bold text-[#2F76BB] hover:underline">
                  {t('auth.activation.backToLogin')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
