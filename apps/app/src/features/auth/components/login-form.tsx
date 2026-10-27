'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { HeaderBackButton } from '@/components/matchy/header-back-button';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { loginPhone, logout, selectAuth } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import { landingPath } from '@/lib/landing';
import { isNativeMobileClient } from '@/lib/native';
import { DEFAULT_PHONE_COUNTRY, composeE164Phone, getPhoneCountry } from '@/lib/phone-countries';
import { resolvePostAuthDestination } from '@/lib/post-auth-routing';
import {
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Phone,
  User as UserIcon,
} from 'lucide-react';
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const country = getPhoneCountry(countryIso);
  const phone = composeE164Phone(countryIso, nationalNumber);
  const reasonParam = searchParams.get('reason');
  const sessionExpiredNotice =
    reasonParam === 'session_expired' ? t('common.errors.unauthorized') : null;
  const error = localError || authError || sessionExpiredNotice;

  const hasIncompleteCookie =
    typeof document !== 'undefined' && document.cookie.includes('matchy_onboarding_incomplete=1');

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
    const params = new URLSearchParams();
    params.set('step', 'phone');
    if (
      searchParams.get('switch') === 'true' ||
      hasIncompleteCookie ||
      (isAuthenticated && !user?.onboarding_completed)
    ) {
      params.set('switch', 'true');
    }
    router.push(`/connexion?${params.toString()}`);
  };
  const handleBackToLogin = () => {
    const params = new URLSearchParams();
    if (
      searchParams.get('switch') === 'true' ||
      hasIncompleteCookie ||
      (isAuthenticated && !user?.onboarding_completed)
    ) {
      params.set('switch', 'true');
    }
    const query = params.toString();
    router.push(query ? `/connexion?${query}` : '/connexion');
    setLocalError(null);
  };
  const handleDisconnectAndSwitch = async () => {
    setIsLoggingOut(true);
    try {
      await dispatch(logout());
      router.push('/connexion');
    } finally {
      setIsLoggingOut(false);
    }
  };
  const handleBackToLanding = () => {
    window.location.href = landingPath('/', locale);
  };

  const isIncompleteOnboardingSession = Boolean(
    ((isAuthenticated && user && !user.onboarding_completed) ||
      (!sessionChecked && hasIncompleteCookie) ||
      (user && !user.onboarding_completed)) &&
    searchParams.get('switch') !== 'true',
  );

  const handleHeaderBack = () => {
    if (localStep === 'phone') {
      handleBackToLogin();
    } else if (isIncompleteOnboardingSession) {
      router.push('/inscription');
    } else {
      handleBackToLanding();
    }
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

  const handleSocialAuth = async (provider: 'google' | 'linkedin') => {
    setLocalError(null);
    const url = getOAuthRedirectUrl(provider);

    if (isNativeMobileClient()) {
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: `${url}?platform=mobile`, windowName: '_system' });
        return;
      } catch {
        window.location.href = `${url}?platform=mobile`;
        return;
      }
    }

    window.location.href = url;
  };

  const incompleteOnboardingContent = (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center text-center">
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl shadow-xs"
          style={{ background: 'linear-gradient(135deg, #EBF4FF 0%, #D8ECFF 100%)' }}
        >
          <Clock size={30} className="text-[#2F76BB]" />
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E' }}>
          {t('auth.loginForm.incompleteOnboardingTitle')}
        </h1>
        <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5, marginTop: '8px' }}>
          {t('auth.loginForm.incompleteOnboardingDesc')}
        </p>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-xs">
            <UserIcon size={18} />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900">
              {user?.phone || user?.email || t('auth.loginForm.currentAccount')}
            </p>
            <p className="text-xs text-slate-500">
              {t('auth.loginForm.incompleteOnboardingSessionTag')}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          {t('auth.loginForm.pendingBadge')}
        </span>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => router.push('/inscription')}
          disabled={isLoggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white transition-opacity hover:opacity-95 disabled:opacity-60"
          style={{
            background: matchyBrand.gradient,
            fontSize: '15px',
            fontWeight: 700,
          }}
        >
          {t('auth.loginForm.resumeRegistrationBtn')}
        </button>

        <button
          type="button"
          onClick={handleDisconnectAndSwitch}
          disabled={isLoggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-slate-700 shadow-xs transition-colors hover:bg-slate-50 disabled:opacity-60"
          style={{
            fontSize: '14px',
            fontWeight: 700,
          }}
        >
          {isLoggingOut && <Loader2 size={16} className="animate-spin" />}
          {t('auth.loginForm.switchOrLogoutBtn')}
        </button>
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          disabled={isLoggingOut}
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('switch', 'true');
            router.push(`/connexion?${params.toString()}`);
          }}
          className="cursor-pointer text-xs font-semibold text-[#2F76BB] underline hover:text-[#255e96]"
        >
          {t('auth.loginForm.signInOtherAccountLink')}
        </button>
      </div>
    </div>
  );

  const formContent = isIncompleteOnboardingSession ? (
    incompleteOnboardingContent
  ) : (
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
            <HeaderBackButton onClick={handleHeaderBack} label={t('common.back')} />
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
            <HeaderBackButton onClick={handleHeaderBack} label={t('common.back')} />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center px-7 py-8">{formContent}</div>
      </div>
    </AuthLayout>
  );
}
