'use client';

import { useAppDispatch } from '@/features/auth/hooks';
import { confirmActivation } from '@/features/auth/store/auth-slice';
import type { ActivationPreviewResponse } from '@/features/auth/types';
import { api, getApiErrorCode } from '@/lib/api';
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

  const [loadingPreview, setLoadingPreview] = useState(true);
  const [preview, setPreview] = useState<ActivationPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
        setPreviewError(
          'Aucun jeton d’activation trouvé. Veuillez vérifier le lien reçu par SMS ou WhatsApp.',
        );
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
          setPreviewError(
            'Ce lien d’activation est invalide ou a expiré (durée de validité : 14 jours). Contactez l’équipe Matchy+ pour recevoir un nouveau lien.',
          );
        } else if (code === 'account_banned') {
          setPreviewError('Ce compte a été suspendu par la modération.');
        } else {
          setPreviewError(
            'Impossible de charger les données de votre compte. Veuillez vérifier votre connexion et réessayer.',
          );
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
  }, [token]);

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
      setSubmitError('Le mot de passe doit respecter l’ensemble des critères de sécurité.');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Les mots de passe saisis ne correspondent pas.');
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
          setSubmitError('Le mot de passe ne respecte pas les critères de sécurité.');
        } else if (message === 'invalid_activation_token') {
          setSubmitError('Le jeton d’activation est invalide ou a expiré.');
        } else {
          setSubmitError('Une erreur est survenue lors de l’activation de votre compte.');
        }
      }
    } catch {
      setSubmitError('Une erreur réseau inattendue s’est produite.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md py-4">
        {/* Loading state */}
        {loadingPreview && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2F76BB]">
              <Loader2 className="animate-spin" size={28} />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              Vérification de votre lien d&apos;activation...
            </p>
            <p className="mt-1 text-xs text-slate-400">Veuillez patienter quelques instants</p>
          </div>
        )}

        {/* Error state */}
        {!loadingPreview && previewError && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-500 shadow-xs">
              <AlertTriangle size={30} />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">Lien inaccessible</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{previewError}</p>
            <div className="mt-6 flex w-full flex-col gap-2">
              <Link
                href="/connexion"
                className="flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-bold text-white transition hover:opacity-95"
                style={{ background: '#2F76BB' }}
              >
                Retour à la connexion
              </Link>
            </div>
          </div>
        )}

        {/* Active form state */}
        {!loadingPreview && !previewError && preview && (
          <div>
            {/* Header */}
            <div className="mb-5 text-center">
              <div
                className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold"
                style={{
                  background: 'rgba(97, 188, 166, 0.15)',
                  color: '#288771',
                  border: '1px solid rgba(97, 188, 166, 0.3)',
                }}
              >
                <ShieldCheck size={14} />
                Activation du profil Matchy+
              </div>
              <h1 className="text-2xl font-extrabold text-[#1A1A2E]">
                Bienvenue, {preview.name} !
              </h1>
              <p className="mt-1.5 text-xs text-slate-500">
                Votre profil a été pré-enregistré. Choisissez votre mot de passe pour finaliser
                l&apos;accès à votre espace.
              </p>
            </div>

            {/* Profile Summary Card */}
            <div
              className="mb-5 rounded-2xl border p-4 shadow-xs"
              style={{
                background: 'linear-gradient(135deg, #F9FBFE 0%, #FFFFFF 100%)',
                borderColor: '#D0E4F7',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-white"
                  style={{ background: '#2F76BB' }}
                >
                  <UserIcon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{preview.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {preview.job && (
                      <span className="flex items-center gap-1 font-semibold text-[#2F76BB]">
                        <Award size={12} />
                        {preview.job}
                      </span>
                    )}
                    {preview.city && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-[#61BCA6]" />
                        {preview.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {preview.phone && (
                <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
                  <Phone size={12} className="text-slate-400" />
                  <span>Identifiant de connexion : </span>
                  <span className="font-semibold text-slate-800">{preview.phone}</span>
                </div>
              )}
            </div>

            {/* Success notification */}
            {activatedSuccess && (
              <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <CheckCircle size={20} className="shrink-0 text-emerald-600" />
                <div className="text-xs">
                  <p className="font-bold">Compte activé avec succès !</p>
                  <p className="text-emerald-700">Redirection vers votre espace en cours...</p>
                </div>
              </div>
            )}

            {/* Error banner */}
            {submitError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                {submitError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="activation-password"
                  className="text-xs font-semibold text-slate-700"
                >
                  Nouveau mot de passe
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
                    placeholder="Créez un mot de passe sécurisé"
                    className="w-full rounded-2xl border py-3 pr-11 pl-10 text-sm outline-none transition focus:border-[#2F76BB] focus:ring-2 focus:ring-[#2F76BB]/15"
                    style={{ background: '#F5F7FA', borderColor: '#D0E4F7' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="activation-confirm-password"
                  className="text-xs font-semibold text-slate-700"
                >
                  Confirmez le mot de passe
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
                    placeholder="Répétez votre mot de passe"
                    className="w-full rounded-2xl border py-3 pr-11 pl-10 text-sm outline-none transition focus:border-[#2F76BB] focus:ring-2 focus:ring-[#2F76BB]/15"
                    style={{ background: '#F5F7FA', borderColor: '#D0E4F7' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Security checklist */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                <p className="mb-2 font-semibold text-slate-600">Exigences de sécurité :</p>
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
                      8 caractères minimum
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
                      1 lettre majuscule
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
                      1 lettre minuscule
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
                      1 chiffre
                    </span>
                  </div>
                </div>
                {confirmPassword.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-200/60 pt-2">
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
                        ? 'Les mots de passe correspondent'
                        : 'Les mots de passe ne correspondent pas encore'}
                    </span>
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting || !isPolicySatisfied || !passwordsMatch || activatedSuccess}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: '#2F76BB' }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Activation en cours...
                  </>
                ) : (
                  'Activer mon compte et continuer'
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              Vous avez déjà un mot de passe ?{' '}
              <Link href="/connexion" className="font-bold text-[#2F76BB] hover:underline">
                Se connecter
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
