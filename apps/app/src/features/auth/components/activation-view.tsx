'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { HeaderBackButton } from '@/components/matchy/header-back-button';
import { useAppDispatch } from '@/features/auth/hooks';
import { confirmActivation, sendActivationOtp } from '@/features/auth/store/auth-slice';
import type { ActivationPreviewResponse } from '@/features/auth/types';
import { useI18n } from '@/features/i18n/i18n-provider';
import { api, getApiErrorCode } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media-url';
import { resolvePostAuthDestination } from '@/lib/post-auth-routing';
import {
  AlertTriangle,
  Award,
  CheckCircle,
  Loader2,
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

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activatedSuccess, setActivatedSuccess] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendCooldown]);

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

  const handleSendOtp = async () => {
    if (otpSending || activatedSuccess) return;
    setSubmitError(null);
    setOtpSending(true);
    try {
      const result = await dispatch(sendActivationOtp({ token: token.trim() }));
      if (sendActivationOtp.fulfilled.match(result)) {
        setOtpSent(true);
        setOtpCode('');
        setResendCooldown(30);
      } else {
        const message = result.error.message;
        if (message === 'invalid_activation_token') {
          setSubmitError(t('auth.activation.errorExpiredToken'));
        } else if (message === 'otp_resend_too_soon') {
          setSubmitError(t('auth.loginForm.errorOtpResendTooSoon'));
        } else {
          setSubmitError(t('onboarding.identity.errorOtpSend'));
        }
      }
    } catch {
      setSubmitError(t('onboarding.identity.errorOtpSend'));
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!otpSent) {
      await handleSendOtp();
      return;
    }
    if (otpCode.trim().length < 4) {
      setSubmitError(t('onboarding.identity.errorOtpShort'));
      return;
    }
    setSubmitError(null);

    setSubmitting(true);
    try {
      const result = await dispatch(
        confirmActivation({
          token: token.trim(),
          code: otpCode.trim(),
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
        if (message === 'invalid_otp') {
          setSubmitError(t('onboarding.identity.errorOtpInvalid'));
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

  const isCtaDisabled =
    otpSending || submitting || activatedSuccess || (otpSent && otpCode.trim().length < 4);

  const handleBackToLogin = () => {
    router.push('/connexion');
  };

  const mainContent = (
    <div className="mx-auto w-full max-w-sm" dir={dir}>
      {/* Loading state */}
      {loadingPreview && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: '#F3F8FF', color: '#2F76BB' }}
          >
            <Loader2 className="animate-spin" size={28} />
          </div>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E' }}>
            {t('auth.activation.loadingTitle')}
          </p>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
            {t('auth.activation.loadingSubtitle')}
          </p>
        </div>
      )}

      {/* Error state */}
      {!loadingPreview && previewError && (
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-[#E24E59]">
            <AlertTriangle size={30} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1A1A2E' }}>
            {t('auth.activation.errorTitle')}
          </h1>
          <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginTop: '8px' }}>
            {previewError}
          </p>
          <div className="mt-6 w-full">
            <Link
              href="/connexion"
              className="flex w-full items-center justify-center rounded-2xl py-3.5 text-white transition-opacity hover:opacity-95"
              style={{ background: matchyBrand.gradient, fontSize: '14px', fontWeight: 700 }}
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
          <div className="mb-6">
            <div
              className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#2F76BB',
                background: '#F3F8FF',
                border: '1px solid #E6F2FF',
              }}
            >
              <ShieldCheck size={14} color="#61BCA6" />
              {t('auth.activation.badge')}
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1A1A2E', lineHeight: 1.2 }}>
              {t('auth.activation.welcomeTitle', { name: preview.name })}
            </h1>
            <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginTop: '6px' }}>
              {t('auth.activation.welcomeDesc')}
            </p>
          </div>

          {/* Profile Summary Card */}
          <div
            className="mb-6 rounded-2xl p-4"
            style={{
              background: '#F8FBFF',
              border: '1.5px solid #E6F2FF',
            }}
          >
            <div className="flex items-center gap-3.5">
              {preview.image && !imageLoadError ? (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-sm ring-2 ring-[#2F76BB]/20">
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
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-bold text-white shadow-sm"
                  style={{ background: matchyBrand.gradient }}
                >
                  <UserIcon size={24} />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate" style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E' }}>
                  {preview.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  {preview.job && (
                    <span className="flex items-center gap-1 font-semibold text-[#2F76BB]">
                      <Award size={13} />
                      {preview.job}
                    </span>
                  )}
                  {preview.city && (
                    <span className="flex items-center gap-1 text-[#666]">
                      <MapPin size={13} className="text-[#61BCA6]" />
                      {preview.city}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {preview.phone && (
              <div
                className="mt-3.5 flex items-center gap-1.5 pt-3 text-xs"
                style={{ borderTop: '1px solid #E6F2FF', color: '#666' }}
              >
                <Phone size={13} color="#61BCA6" />
                <span>{t('auth.activation.loginIdentifier')} </span>
                <span className="font-bold text-[#1A1A2E]" dir="ltr">
                  {preview.phone}
                </span>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {otpSent && (
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="activation-otp-code"
                    style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}
                  >
                    {t('auth.activation.otpCodeLabel')}
                  </label>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || otpSending}
                    onClick={handleSendOtp}
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: resendCooldown > 0 ? '#9CA3AF' : '#2F76BB',
                    }}
                  >
                    {resendCooldown > 0
                      ? t('onboarding.identity.otpResendCooldown', { seconds: resendCooldown })
                      : t('onboarding.identity.otpResend')}
                  </button>
                </div>
                <div
                  className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-3.5"
                  style={{ border: '2px solid #2F76BB', background: '#F5F9FF' }}
                >
                  <ShieldCheck size={16} color="#61BCA6" />
                  <input
                    id="activation-otp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpCode}
                    disabled={submitting || activatedSuccess}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="flex-1 bg-transparent tracking-widest text-[#353535] outline-none"
                    style={{ fontSize: '16px', fontWeight: 700 }}
                  />
                </div>
              </div>
            )}

            {submitError && (
              <p className="text-center" style={{ fontSize: '12px', color: '#E24E59' }}>
                {submitError}
              </p>
            )}

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isCtaDisabled}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white disabled:cursor-not-allowed"
              style={{
                background: isCtaDisabled ? '#D5D5D5' : matchyBrand.gradient,
                fontSize: '14px',
                fontWeight: 700,
                transition: 'background 0.2s',
              }}
            >
              {otpSending || submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {otpSending
                    ? t('auth.activation.sendingOtpButton')
                    : t('auth.activation.activatingButton')}
                </>
              ) : otpSent ? (
                t('auth.activation.activateButton')
              ) : (
                t('auth.loginForm.sendOtpButton')
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/connexion"
              className="font-semibold text-[#2F76BB] hover:underline"
              style={{ fontSize: '13px' }}
            >
              {t('auth.activation.backToLogin')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AuthLayout
      activeFeature={0}
      panelImage="https://images.unsplash.com/photo-1633545515526-ce9cd7fc67d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800"
      hideVideoFeature
    >
      <div className="flex min-h-dvh flex-1 flex-col bg-white md:min-h-0 md:h-full">
        <div className="flex items-center justify-between px-5 pt-5 pb-2 md:border-b md:border-[#F5F5F5] md:px-10 md:py-5">
          <div className="flex items-center gap-2">
            <HeaderBackButton
              onClick={handleBackToLogin}
              label={t('common.back')}
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center overflow-y-auto px-7 py-8 md:items-center md:px-10 md:py-10">
          {mainContent}
        </div>
      </div>
    </AuthLayout>
  );
}
