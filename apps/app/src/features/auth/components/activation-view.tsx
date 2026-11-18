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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    setSubmitting(true);
    try {
      const result = await dispatch(
        confirmActivation({
          token: token.trim(),
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
        if (message === 'invalid_activation_token') {
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
                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={submitting || activatedSuccess}
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
