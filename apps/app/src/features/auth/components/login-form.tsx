'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { HeaderBackButton } from '@/components/matchy/header-back-button';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { loginPhone, selectAuth } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import { landingPath } from '@/lib/landing';
import { DEFAULT_PHONE_COUNTRY, composeE164Phone, getPhoneCountry } from '@/lib/phone-countries';
import { resolvePostAuthDestination } from '@/lib/post-auth-routing';
import { ChevronRight, Eye, EyeOff, Loader2, Lock, Phone } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AuthLayout } from './auth-layout';
import { PhoneInput } from './phone-input';

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
function loginPhoneErrorMessage(code: string | undefined, t: (key: string) => string): string {
  if (code === 'phone_not_verified') {
    return t('auth.loginForm.errorPhoneNotVerified');
  }
  if (code === 'oauth_only_account') {
    return t('auth.loginForm.errorOauthOnlyAccount');
  }
  if (code === 'mobile_session_unavailable') {
    return t('auth.loginForm.errorMobileSessionUnavailable');
  }
  if (code === 'account_banned') {
    return t('auth.loginForm.errorAccountBanned');
  }
  if (code === 'account_inactive') {
    return t('auth.loginForm.errorAccountInactive');
  }
  return t('auth.loginForm.errorLoginFailed');
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { t, locale } = useI18n();
  const {
    loading,
    error: authError,
    isAuthenticated,
    sessionChecked,
    user,
  } = useAppSelector(selectAuth);

  const stepParam = searchParams.get('step');
  const localStep = stepParam === 'phone' ? 'phone' : 'login';

  const [countryIso, setCountryIso] = useState(DEFAULT_PHONE_COUNTRY.iso);
  const [nationalNumber, setNationalNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const country = getPhoneCountry(countryIso);
  const phone = composeE164Phone(countryIso, nationalNumber);
  const reasonParam = searchParams.get('reason');
  const sessionExpiredNotice =
    reasonParam === 'session_expired' ? t('common.errors.unauthorized') : null;
  const error = localError || authError || sessionExpiredNotice;

  // Cap cold start: proxy may bounce to /connexion before Preferences hydrate + mirror
  // cookie sync. Once authcheck confirms a session, leave /connexion for the app,
  // EXCEPT when onboarding is incomplete or user requested switch=true (AUTH-001:
  // an unfinished onboarding must not trap /connexion in a redirect bounce to /inscription).
  useEffect(() => {
    if (!sessionChecked || !isAuthenticated || !user) return;
    if (user.onboarding_completed && searchParams.get('switch') !== 'true') {
      router.replace(resolvePostAuthDestination(searchParams.get('next'), true));
      router.refresh();
    }
  }, [sessionChecked, isAuthenticated, user, router, searchParams]);

  const goToPhoneStep = () => {
    router.push('/connexion?step=phone');
  };
  const handleBackToLogin = () => {
    router.push('/connexion');
    setLocalError(null);
  };
  const handleBackToLanding = () => {
    window.location.href = landingPath('/', locale);
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
      setLocalError(loginPhoneErrorMessage(resultAction.error.message, t));
    }
  };

  const handleSocialAuth = (provider: 'google' | 'linkedin') => {
    setLocalError(null);
    window.location.href = getOAuthRedirectUrl(provider);
  };

  const formContent = (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8">
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1A1A2E' }}>
          {localStep === 'login'
            ? t('auth.loginForm.welcomeTitle')
            : t('auth.loginForm.phoneStepTitle')}
        </h1>
        <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginTop: '6px' }}>
          {localStep === 'login'
            ? t('auth.loginForm.welcomeDesc')
            : t('auth.loginForm.phoneStepDesc')}
        </p>
      </div>

      {isAuthenticated && user && !user.onboarding_completed && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-xs">
          <p className="font-semibold">{t('auth.loginForm.incompleteOnboardingNotice')}</p>
          <div className="mt-2 flex items-center justify-between">
            <Link
              href="/inscription"
              className="font-bold text-[#2F76BB] underline hover:text-[#255e96]"
            >
              {t('auth.loginForm.resumeOnboarding')}
            </Link>
          </div>
        </div>
      )}

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
              {t('auth.loginForm.signInDivider')}
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
              {t('auth.loginForm.phoneNumberOption')}
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
              {t('auth.loginForm.continueWithLinkedIn')}
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
              {t('auth.loginForm.continueWithGoogle')}
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
              {t('auth.loginForm.signUpDivider')}
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
              onClick={() =>
                router.push(resolvePostAuthDestination(searchParams.get('next'), false))
              }
              className="w-full rounded-2xl py-3.5 text-white"
              style={{
                background: matchyBrand.gradient,
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              {t('auth.loginForm.createAccount')}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
              {t('auth.loginForm.countryCodeLabel')}
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
            <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
              {t('auth.password')}
            </label>
            <div
              className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-3.5"
              style={{ border: '2px solid #2F76BB', background: '#F5F9FF' }}
            >
              <Lock size={16} color="#61BCA6" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('auth.loginForm.passwordPlaceholder')}
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

          <div className="mb-4 text-right">
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams();
                if (countryIso) params.set('country', countryIso);
                if (nationalNumber) params.set('national', nationalNumber);
                router.push(`/reset-password?${params.toString()}`);
              }}
              style={{ fontSize: '12px', fontWeight: 700, color: '#2F76BB' }}
            >
              {t('auth.forgotPassword')}
            </button>
          </div>

          {error && (
            <p className="mb-3 text-center" style={{ fontSize: '12px', color: '#E24E59' }}>
              {error}
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
                  ? matchyBrand.gradient
                  : '#D5D5D5',
              fontSize: '14px',
              fontWeight: 700,
              transition: 'background 0.2s',
            }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {t('auth.loginForm.continueButton')}
          </button>
        </div>
      )}

      <p
        className="mt-8 text-center"
        style={{ fontSize: '11px', color: '#BBBBBB', lineHeight: 1.6 }}
      >
        {t('auth.loginForm.acceptTermsPrefix')}{' '}
        <Link href="/terms-of-service" className="text-[#2F76BB] hover:underline">
          {t('legal.termsOfService')}
        </Link>{' '}
        {t('auth.loginForm.acceptTermsMiddle')}{' '}
        <Link href="/privacy-policy" className="text-[#2F76BB] hover:underline">
          {t('legal.privacyPolicy')}
        </Link>
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
            <HeaderBackButton
              onClick={localStep === 'phone' ? handleBackToLogin : handleBackToLanding}
              label={t('common.back')}
            />
          </div>
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
            <HeaderBackButton
              onClick={localStep === 'phone' ? handleBackToLogin : handleBackToLanding}
              label={t('common.back')}
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center px-7 py-8">{formContent}</div>
      </div>
    </AuthLayout>
  );
}
