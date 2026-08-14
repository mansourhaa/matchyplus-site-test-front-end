'use client';

import { PasswordRequirements } from '@/components/password-requirements';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import {
  confirmPasswordReset,
  loginPhone,
  requestPasswordReset,
  selectAuth,
} from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import { landingPath } from '@/lib/landing';
import { isPasswordPolicySatisfied } from '@/lib/password-policy';
import { DEFAULT_PHONE_COUNTRY, composeE164Phone, getPhoneCountry } from '@/lib/phone-countries';
import { resolvePostAuthDestination } from '@/lib/post-auth-routing';
import { ArrowLeft, ChevronRight, Eye, EyeOff, Loader2, Lock, Phone } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AuthLayout } from './auth-layout';
import { MatchyLogo } from './matchy-logo';
import { PhoneInput } from './phone-input';

function FlagFr() {
  return (
    <svg width="18" height="13" viewBox="0 0 3 2" className="rounded-sm">
      <rect width="1" height="2" fill="#002395" />
      <rect x="1" width="1" height="2" fill="#FFFFFF" />
      <rect x="2" width="1" height="2" fill="#ED2939" />
    </svg>
  );
}

function FlagEn() {
  return (
    <svg width="18" height="13" viewBox="0 0 50 30" className="rounded-sm">
      <rect width="50" height="30" fill="#012169" />
      <path d="M0 0 L50 30 M0 30 L50 0" stroke="#FFF" strokeWidth="6" />
      <path d="M0 0 L50 30 M0 30 L50 0" stroke="#C8102E" strokeWidth="2" />
      <path d="M25 0 V30 M0 15 H50" stroke="#FFF" strokeWidth="10" />
      <path d="M25 0 V30 M0 15 H50" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

function FlagAr() {
  return (
    <svg width="18" height="13" viewBox="0 0 120 80" className="rounded-sm">
      <rect width="120" height="80" fill="#E71F19" />
      <circle cx="60" cy="40" r="20" fill="#FFF" />
      <circle cx="64" cy="40" r="16" fill="#E71F19" />
      <circle cx="60" cy="40" r="16" fill="#FFF" />
      <path d="M 64,32 A 8,8 0 1,0 64,48 A 8,8 0 1,0 64,32 Z" fill="#E71F19" />
    </svg>
  );
}

function getFlag(locale: string) {
  if (locale === 'fr') return <FlagFr />;
  if (locale === 'en') return <FlagEn />;
  return <FlagAr />;
}

function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-1.5 rounded-lg px-2 py-1"
        style={{ background: '#F5F7FA', border: '1px solid #E0E0E0' }}
      >
        {getFlag(locale)}
        <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>{locale.toUpperCase()}</span>
      </button>
      {open && (
        <div
          className="absolute top-9 right-0 z-50 overflow-hidden rounded-xl shadow-lg"
          style={{ background: 'white', border: '1px solid #F0F0F0', minWidth: 90 }}
        >
          {(['fr', 'en', 'ar'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 hover:bg-[#F5F7FA]"
              style={{
                fontSize: 12,
                fontWeight: locale === l ? 700 : 400,
                color: locale === l ? '#2F76BB' : '#555',
                background: locale === l ? '#EEF5FF' : 'white',
              }}
            >
              {getFlag(l)}
              <span>{l.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4" fill="#007BB5" />
      <rect x="3" y="8" width="3.5" height="9" fill="white" />
      <circle cx="4.75" cy="5" r="1.75" fill="white" />
      <path
        d="M9 8h3.5v1.7c.6-1.1 1.8-1.7 3-1.7C17.4 8 19 9.3 19 12v5h-3.5v-4.5c0-1-.6-1.7-1.7-1.7-1.1 0-1.8.7-1.8 1.7V17H9V8z"
        fill="white"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M19.6 10.2c0-.7-.1-1.4-.2-2H10v3.8h5.4a4.6 4.6 0 01-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"
        fill="#4285F4"
      />
      <path
        d="M10 20c2.7 0 5-0.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H1.1v2.5C2.7 17.8 6.1 20 10 20z"
        fill="#34A853"
      />
      <path
        d="M4.4 11.9A6 6 0 014.1 10c0-.7.1-1.3.3-1.9V5.6H1.1A10 10 0 000 10c0 1.6.4 3.1 1.1 4.4l3.3-2.5z"
        fill="#FBBC05"
      />
      <path
        d="M10 3.9c1.5 0 2.8.5 3.9 1.5L16.6 3C15 1.4 12.7.5 10 .5 6.1.5 2.7 2.7 1.1 6l3.3 2.5C5.2 5.7 7.4 3.9 10 3.9z"
        fill="#EA4335"
      />
    </svg>
  );
}

function getOAuthRedirectUrl(provider: 'google' | 'linkedin') {
  return `${process.env.NEXT_PUBLIC_API_URL}/auth/oauth/${provider}`;
}

// Mirrors the API's login-phone error codes (see services/phone-authentication.ts) —
// phone_not_verified and oauth_only_account each get an actionable message; anything
// else (including a plain wrong password) falls back to the generic one, so a caller
// can't distinguish "wrong password" from "unknown phone number".
function loginPhoneErrorMessage(code: string | undefined): string {
  if (code === 'phone_not_verified') {
    return "Ce numéro de téléphone n'a pas encore été vérifié.";
  }
  if (code === 'oauth_only_account') {
    return 'Ce compte se connecte avec Google ou LinkedIn, pas avec un mot de passe.';
  }
  if (code === 'mobile_session_unavailable') {
    return "Session mobile indisponible. Vérifiez la configuration de l'application.";
  }
  return 'Connexion échouée. Vérifiez votre numéro et votre mot de passe';
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const {
    loading,
    error: authError,
    isAuthenticated,
    sessionChecked,
    user,
  } = useAppSelector(selectAuth);

  const [localStep, setLocalStep] = useState<'login' | 'phone'>(
    searchParams.get('step') === 'phone' ? 'phone' : 'login',
  );

  const [countryIso, setCountryIso] = useState(DEFAULT_PHONE_COUNTRY.iso);
  const [nationalNumber, setNationalNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Phone login is always phone + password — OTP is never a login mechanism itself,
  // only proof of phone ownership for signup, phone-link, or password reset (see
  // doc/features/authentication.md).
  const [resetMode, setResetMode] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetRequestLoading, setResetRequestLoading] = useState(false);
  const [resetSubmitLoading, setResetSubmitLoading] = useState(false);
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  const country = getPhoneCountry(countryIso);
  const phone = composeE164Phone(countryIso, nationalNumber);
  const error = localError || authError;

  // Cap cold start: proxy may bounce to /login before Preferences hydrate + mirror
  // cookie sync. Once authcheck confirms a session, leave /login for the app.
  useEffect(() => {
    if (!sessionChecked || !isAuthenticated || !user) return;
    router.replace(resolvePostAuthDestination(searchParams.get('next'), user.onboarding_completed));
    router.refresh();
  }, [sessionChecked, isAuthenticated, user, router, searchParams]);

  const goToPhoneStep = () => {
    router.push('/login?step=phone');
    setLocalStep('phone');
  };
  const handleBackToLogin = () => {
    router.push('/login');
    setLocalStep('login');
    setLocalError(null);
    setResetMode(false);
    setResetInfo(null);
  };

  const goToPostAuthDestination = (onboardingCompleted: boolean) => {
    router.push(resolvePostAuthDestination(searchParams.get('next'), onboardingCompleted));
    router.refresh();
  };

  const handlePhoneLogin = async () => {
    if (nationalNumber.length < country.nationalLength || password.length < 6) return;

    setLocalError(null);
    const resultAction = await dispatch(loginPhone({ phone, password }));
    if (loginPhone.fulfilled.match(resultAction)) {
      goToPostAuthDestination(resultAction.payload.user.onboarding_completed);
    } else {
      setLocalError(loginPhoneErrorMessage(resultAction.error.message));
    }
  };

  const handleSocialAuth = (provider: 'google' | 'linkedin') => {
    setLocalError(null);
    window.location.href = getOAuthRedirectUrl(provider);
  };

  const handleRequestReset = async () => {
    if (nationalNumber.length < country.nationalLength) {
      setLocalError(`Entrez un numéro de téléphone valide (${country.nationalLength} chiffres)`);
      return;
    }

    setLocalError(null);
    setResetInfo(null);
    setResetRequestLoading(true);
    try {
      await dispatch(requestPasswordReset({ phone })).unwrap();
      // The API always returns success here regardless of whether this phone has a
      // password-based account (anti-enumeration) — the copy must stay conditional
      // ("if an account exists") rather than promising an SMS that may not be sent.
      setResetInfo(
        "Si un compte avec mot de passe existe pour ce numéro, un code de réinitialisation vient d'être envoyé par SMS.",
      );
      setResetMode(true);
    } catch {
      setLocalError("Impossible d'envoyer le code de réinitialisation");
    } finally {
      setResetRequestLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (
      nationalNumber.length < country.nationalLength ||
      !resetCode.trim() ||
      !isPasswordPolicySatisfied(newResetPassword)
    ) {
      setLocalError(
        `Entrez un numéro valide (${country.nationalLength} chiffres), le code et un nouveau mot de passe conforme aux règles de sécurité`,
      );
      return;
    }

    setLocalError(null);
    setResetSubmitLoading(true);
    try {
      await dispatch(
        confirmPasswordReset({ phone, code: resetCode, newPassword: newResetPassword }),
      ).unwrap();
      setPassword(newResetPassword);
      setNewResetPassword('');
      setResetCode('');
      setResetMode(false);
      setResetInfo('Mot de passe mis à jour. Vous pouvez maintenant vous connecter.');
    } catch {
      setLocalError('Échec de la réinitialisation');
    } finally {
      setResetSubmitLoading(false);
    }
  };

  const formContent = (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8">
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1A1A2E' }}>
          {localStep === 'login' ? 'Bienvenue 👋' : 'Connexion par téléphone'}
        </h1>
        <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginTop: '6px' }}>
          {localStep === 'login'
            ? 'Identifiez-vous pour rester au courant de ce qui se passe dans votre sphère professionnelle.'
            : 'Entrez votre numéro de téléphone et votre mot de passe pour continuer.'}
        </p>
      </div>

      {localStep === 'login' ? (
        <div className="space-y-4">
          <div className="my-2 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#F0F0F0]" />
            <span
              className="mb-2 rounded-full px-3 py-1"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#2F76BB',
                background: '#F3F8FF',
                border: '1px solid #E6F2FF',
              }}
            >
              Connectez-vous
            </span>
            <div className="h-px flex-1 bg-[#F0F0F0]" />
          </div>

          <button
            onClick={goToPhoneStep}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 transition-all hover:shadow-md"
            style={{ border: '1.5px solid #2F76BB', background: 'white' }}
          >
            <Phone size={18} color="#61BCA6" />
            <span
              className="flex-1 text-left"
              style={{ fontSize: '14px', fontWeight: 600, color: '#353535' }}
            >
              Numéro de téléphone
            </span>
            <ChevronRight size={16} color="#CCC" />
          </button>

          <button
            onClick={() => handleSocialAuth('linkedin')}
            disabled={loading}
            className="flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 transition-all hover:shadow-md"
            style={{ border: '1.5px solid #0077B5', background: 'white' }}
          >
            <LinkedInIcon />
            <span
              className="flex-1 text-left"
              style={{ fontSize: '14px', fontWeight: 600, color: '#353535' }}
            >
              Continuer avec LinkedIn
            </span>
            <ChevronRight size={16} color="#CCC" />
          </button>

          <button
            onClick={() => handleSocialAuth('google')}
            disabled={loading}
            className="flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 transition-all hover:shadow-md"
            style={{ border: '1.5px solid #2F76BB', background: 'white' }}
          >
            <GoogleIcon />
            <span
              className="flex-1 text-left"
              style={{ fontSize: '14px', fontWeight: 600, color: '#353535' }}
            >
              Continuer avec Google
            </span>
            <ChevronRight size={16} color="#CCC" />
          </button>

          <div className="my-2 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#F0F0F0]" />
            <span
              className="mb-2 rounded-full px-3 py-1"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#2F76BB',
                background: '#F3F8FF',
                border: '1px solid #E6F2FF',
              }}
            >
              Inscrivez-vous
            </span>
            <div className="h-px flex-1 bg-[#F0F0F0]" />
          </div>

          {error && (
            <p className="mb-1 text-center" style={{ fontSize: '12px', color: '#E24E59' }}>
              {error}
            </p>
          )}

          <div className="mt-2">
            <button
              onClick={() => router.push('/onboarding')}
              className="w-full rounded-2xl py-3.5 text-white"
              style={{
                background: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              Créer un compte
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
              Indicatif pays
            </label>
            <PhoneInput
              countryIso={countryIso}
              nationalNumber={nationalNumber}
              onCountryChange={setCountryIso}
              onNationalNumberChange={setNationalNumber}
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>Mot de passe</label>
            <div
              className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-3.5"
              style={{ border: '2px solid #2F76BB', background: '#F5F9FF' }}
            >
              <Lock size={16} color="#61BCA6" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Votre mot de passe"
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

          <div className="mb-4">
            <button
              type="button"
              onClick={handleRequestReset}
              disabled={resetRequestLoading}
              style={{ fontSize: '12px', fontWeight: 700, color: '#2F76BB' }}
            >
              {resetRequestLoading ? 'Envoyer le code...' : 'Mot de passe oublié ?'}
            </button>
          </div>

          {resetMode && (
            <div
              className="mb-4 space-y-3 rounded-2xl p-3"
              style={{ background: '#F7FBFF', border: '1px solid #DCEAF8' }}
            >
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>
                  Code de réinitialisation
                </label>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(event) =>
                    setResetCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  className="mt-1 w-full rounded-xl px-4 py-2.5 text-[#353535] outline-none"
                  style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '14px' }}
                  placeholder="123456"
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newResetPassword}
                  onChange={(event) => setNewResetPassword(event.target.value)}
                  className="mt-1 w-full rounded-xl px-4 py-2.5 text-[#353535] outline-none"
                  style={{ border: '1.5px solid #CFE0F2', background: 'white', fontSize: '14px' }}
                  placeholder="Nouveau mot de passe"
                />
                <PasswordRequirements password={newResetPassword} />
              </div>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={resetSubmitLoading}
                className="w-full rounded-xl py-2.5 text-white"
                style={{ background: '#2F76BB', fontSize: '13px', fontWeight: 700 }}
              >
                {resetSubmitLoading
                  ? 'Réinitialiser le mot de passe...'
                  : 'Réinitialiser le mot de passe'}
              </button>
            </div>
          )}

          {error && (
            <p className="mb-3 text-center" style={{ fontSize: '12px', color: '#E24E59' }}>
              {error}
            </p>
          )}

          {resetInfo && (
            <p className="mb-3 text-center" style={{ fontSize: '12px', color: '#2F76BB' }}>
              {resetInfo}
            </p>
          )}

          <button
            onClick={handlePhoneLogin}
            disabled={
              loading || nationalNumber.length < country.nationalLength || password.length < 6
            }
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white"
            style={{
              background:
                nationalNumber.length >= country.nationalLength && password.length >= 6 && !loading
                  ? 'linear-gradient(90deg, #61BCA6, #2F76BB)'
                  : '#D5D5D5',
              fontSize: '14px',
              fontWeight: 700,
              transition: 'background 0.2s',
            }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Continuer
          </button>
        </div>
      )}

      <p
        className="mt-8 text-center"
        style={{ fontSize: '11px', color: '#BBBBBB', lineHeight: 1.6 }}
      >
        En continuant, vous acceptez nos{' '}
        <a href={landingPath('/terms-of-service')} className="text-[#2F76BB] hover:underline">
          Conditions d&apos;utilisation
        </a>{' '}
        et notre{' '}
        <a href={landingPath('/privacy-policy')} className="text-[#2F76BB] hover:underline">
          Politique de confidentialité
        </a>
      </p>
    </div>
  );

  return (
    <AuthLayout
      activeFeature={0}
      panelImage="https://images.unsplash.com/photo-1633545515526-ce9cd7fc67d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800"
      hideVideoFeature
    >
      {/* Desktop */}
      <div className="hidden h-full flex-col bg-white md:flex">
        <div
          className="flex items-center justify-between px-10 py-5"
          style={{ borderBottom: '1px solid #F5F5F5' }}
        >
          <div className="flex items-center gap-2">
            {localStep === 'phone' && (
              <button
                type="button"
                onClick={handleBackToLogin}
                className="flex items-center gap-1 rounded-lg px-2 py-1"
                style={{
                  border: '1px solid #E8E8E8',
                  color: '#667085',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <ArrowLeft size={14} />
                Retour
              </button>
            )}
            <MatchyLogo size="sm" />
          </div>
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-10 py-10">
          {formContent}
        </div>
      </div>

      {/* Mobile */}
      <div
        className="flex flex-col overflow-y-auto bg-white md:hidden"
        style={{ minHeight: '100dvh' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-2">
            {localStep === 'phone' && (
              <button
                type="button"
                onClick={handleBackToLogin}
                className="flex items-center gap-1 rounded-lg px-2 py-1"
                style={{
                  border: '1px solid #E8E8E8',
                  color: '#667085',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <ArrowLeft size={14} />
                Retour
              </button>
            )}
            <MatchyLogo size="sm" />
          </div>
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 flex-col justify-center px-7 py-8">{formContent}</div>
      </div>
    </AuthLayout>
  );
}
