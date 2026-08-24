'use client';

import { PasswordRequirements } from '@/components/password-requirements';
import { useAppDispatch } from '@/features/auth/hooks';
import { confirmPasswordReset, requestPasswordReset } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import { getApiErrorCode } from '@/lib/api';
import { isPasswordPolicySatisfied } from '@/lib/password-policy';
import { DEFAULT_PHONE_COUNTRY, composeE164Phone, getPhoneCountry } from '@/lib/phone-countries';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AuthLayout } from './auth-layout';
import { MatchyLogo } from './matchy-logo';
import { PhoneInput } from './phone-input';

type ResetStep = 'request' | 'verify' | 'success';

function parseInitialPhoneParams(searchParams: ReturnType<typeof useSearchParams>) {
  const paramCountry = searchParams.get('country');
  const paramNational = searchParams.get('national');
  if (paramCountry && paramNational) {
    return { countryIso: paramCountry, nationalNumber: paramNational };
  }
  const rawPhone = searchParams.get('phone');
  if (rawPhone) {
    if (rawPhone.startsWith('+216') && rawPhone.length > 4) {
      return { countryIso: 'TN', nationalNumber: rawPhone.slice(4) };
    }
    if (rawPhone.startsWith('+33') && rawPhone.length > 3) {
      return { countryIso: 'FR', nationalNumber: rawPhone.slice(3) };
    }
  }
  return {
    countryIso: paramCountry || DEFAULT_PHONE_COUNTRY.iso,
    nationalNumber: paramNational || '',
  };
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const [initialPhone] = useState(() => parseInitialPhoneParams(searchParams));

  const [step, setStep] = useState<ResetStep>('request');
  const [countryIso, setCountryIso] = useState(initialPhone.countryIso);
  const [nationalNumber, setNationalNumber] = useState(initialPhone.nationalNumber);

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [requestLoading, setRequestLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [localError, setLocalError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const country = getPhoneCountry(countryIso);
  const phone = composeE164Phone(countryIso, nationalNumber);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleBackToLogin = () => {
    router.push('/login?step=phone');
  };

  const handleRequestCode = async (isResend = false) => {
    if (nationalNumber.length < country.nationalLength) {
      setLocalError(
        t('auth.resetPassword.invalidPhoneWithLength', { length: country.nationalLength }),
      );
      return;
    }

    setLocalError(null);
    if (!isResend) {
      setInfoMessage(null);
    }
    setRequestLoading(true);

    try {
      await dispatch(requestPasswordReset({ phone })).unwrap();
      setInfoMessage(t('auth.resetPassword.resetSmsSent'));
      setResendCooldown(60);
      if (step === 'request') {
        setStep('verify');
      }
    } catch {
      setLocalError(t('auth.resetPassword.resetSendFailed'));
    } finally {
      setRequestLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (
      nationalNumber.length < country.nationalLength ||
      code.trim().length !== 6 ||
      !isPasswordPolicySatisfied(newPassword)
    ) {
      setLocalError(t('auth.resetPassword.invalidResetForm'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError(t('auth.resetPassword.passwordsDoNotMatch'));
      return;
    }

    setLocalError(null);
    setSubmitLoading(true);

    try {
      await dispatch(
        confirmPasswordReset({
          phone,
          code: code.trim(),
          newPassword,
        }),
      ).unwrap();
      setStep('success');
    } catch (err: unknown) {
      const apiCode = getApiErrorCode(err);
      if (apiCode === 'phone_not_found') {
        setLocalError(t('auth.resetPassword.errorPhoneNotFound'));
      } else if (apiCode === 'invalid_otp') {
        setLocalError(t('auth.resetPassword.errorInvalidOtp'));
      } else {
        setLocalError(t('auth.resetPassword.resetFailed'));
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const formContent = (
    <div className="mx-auto w-full max-w-sm">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EBF5FB] text-[#2F76BB]">
          {step === 'success' ? (
            <CheckCircle2 size={26} color="#61BCA6" />
          ) : step === 'verify' ? (
            <KeyRound size={24} color="#2F76BB" />
          ) : (
            <Lock size={24} color="#2F76BB" />
          )}
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E' }}>
          {step === 'request' && t('auth.resetPassword.requestTitle')}
          {step === 'verify' && t('auth.resetPassword.verifyTitle')}
          {step === 'success' && t('auth.resetPassword.successTitle')}
        </h1>
        <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginTop: '6px' }}>
          {step === 'request' && t('auth.resetPassword.requestDesc')}
          {step === 'verify' && t('auth.resetPassword.verifyDesc', { phone })}
          {step === 'success' && t('auth.resetPassword.successDesc')}
        </p>
      </div>

      {/* Error & Info messages */}
      {localError && (
        <div
          className="mb-4 rounded-xl px-4 py-3 text-center"
          style={{ background: '#FEECEC', border: '1px solid #FCD2D2' }}
        >
          <p style={{ fontSize: '13px', color: '#E24E59', fontWeight: 600 }}>{localError}</p>
        </div>
      )}

      {infoMessage && step !== 'success' && (
        <div
          className="mb-4 rounded-xl px-4 py-3 text-center"
          style={{ background: '#F0F9F6', border: '1px solid #D5EFE7' }}
        >
          <p style={{ fontSize: '13px', color: '#2B8A6E', fontWeight: 600 }}>{infoMessage}</p>
        </div>
      )}

      {/* STEP 1: Phone input */}
      {step === 'request' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRequestCode(false);
          }}
          className="space-y-4"
        >
          <div>
            <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
              {t('auth.loginForm.countryCodeLabel')}
            </label>
            <PhoneInput
              countryIso={countryIso}
              nationalNumber={nationalNumber}
              onCountryChange={setCountryIso}
              onNationalNumberChange={setNationalNumber}
              disabled={requestLoading}
            />
          </div>

          <button
            type="submit"
            disabled={requestLoading || nationalNumber.length < country.nationalLength}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white shadow-sm transition-all hover:shadow-md"
            style={{
              background:
                nationalNumber.length >= country.nationalLength && !requestLoading
                  ? 'linear-gradient(90deg, #61BCA6, #2F76BB)'
                  : '#D5D5D5',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            {requestLoading && <Loader2 size={16} className="animate-spin" />}
            {t('auth.resetPassword.sendCodeButton')}
            {!requestLoading && <ChevronRight size={16} />}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] transition-colors hover:text-[#2F76BB]"
            >
              <ArrowLeft size={14} />
              {t('auth.resetPassword.backToLogin')}
            </button>
          </div>

          <div className="mt-4 border-t border-[#F0F0F0] pt-3 text-center">
            <p style={{ fontSize: '12px', color: '#888' }}>
              {t('auth.resetPassword.noAccountPrompt')}{' '}
              <button
                type="button"
                onClick={() => router.push('/onboarding')}
                className="font-bold text-[#2F76BB] hover:underline"
              >
                {t('auth.resetPassword.createAccountLink')}
              </button>
            </p>
          </div>
        </form>
      )}

      {/* STEP 2: Code + New Password */}
      {step === 'verify' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmReset();
          }}
          className="space-y-4"
        >
          {/* Phone chip */}
          <div
            className="flex items-center justify-between rounded-xl px-3.5 py-2.5"
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
          >
            <div className="flex items-center gap-2">
              <Phone size={15} color="#2F76BB" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{phone}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('request');
                setLocalError(null);
              }}
              style={{ fontSize: '12px', fontWeight: 700, color: '#2F76BB' }}
              className="hover:underline"
            >
              {t('auth.resetPassword.changePhone')}
            </button>
          </div>

          {/* 6-digit Code */}
          <div>
            <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
              {t('auth.resetPassword.codeLabel')}
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="mt-1.5 w-full rounded-2xl px-4 py-3.5 text-center text-xl font-bold tracking-widest text-[#353535] transition-all outline-none focus:ring-2 focus:ring-[#2F76BB]"
              style={{ border: '2px solid #2F76BB', background: '#F5F9FF' }}
              disabled={submitLoading}
            />
          </div>

          {/* New Password */}
          <div>
            <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
              {t('auth.resetPassword.newPasswordLabel')}
            </label>
            <div
              className="mt-1.5 flex items-center gap-3 rounded-2xl px-4 py-3.5"
              style={{ border: '1.5px solid #CFE0F2', background: 'white' }}
            >
              <Lock size={16} color="#61BCA6" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
                className="flex-1 bg-transparent text-[#353535] outline-none"
                style={{ fontSize: '14px' }}
                disabled={submitLoading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="text-[#7A7A7A] hover:text-[#353535]"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <PasswordRequirements password={newPassword} />
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
              {t('auth.resetPassword.confirmPasswordLabel')}
            </label>
            <div
              className="mt-1.5 flex items-center gap-3 rounded-2xl px-4 py-3.5"
              style={{ border: '1.5px solid #CFE0F2', background: 'white' }}
            >
              <Lock size={16} color="#61BCA6" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                className="flex-1 bg-transparent text-[#353535] outline-none"
                style={{ fontSize: '14px' }}
                disabled={submitLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="text-[#7A7A7A] hover:text-[#353535]"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Resend Code */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => handleRequestCode(true)}
              disabled={requestLoading || resendCooldown > 0}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2F76BB] hover:underline disabled:cursor-not-allowed disabled:text-[#A0AEC0]"
            >
              <RefreshCw size={13} className={requestLoading ? 'animate-spin' : ''} />
              {resendCooldown > 0
                ? t('auth.resetPassword.resendCooldown', { seconds: resendCooldown })
                : t('auth.resetPassword.resendCode')}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={
              submitLoading ||
              code.length !== 6 ||
              !isPasswordPolicySatisfied(newPassword) ||
              newPassword !== confirmPassword
            }
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white shadow-sm transition-all hover:shadow-md"
            style={{
              background:
                code.length === 6 &&
                isPasswordPolicySatisfied(newPassword) &&
                newPassword === confirmPassword &&
                !submitLoading
                  ? 'linear-gradient(90deg, #61BCA6, #2F76BB)'
                  : '#D5D5D5',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            {submitLoading && <Loader2 size={16} className="animate-spin" />}
            {submitLoading
              ? t('auth.resetPassword.submitting')
              : t('auth.resetPassword.submitButton')}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] transition-colors hover:text-[#2F76BB]"
            >
              <ArrowLeft size={14} />
              {t('auth.resetPassword.backToLogin')}
            </button>
          </div>

          <div className="mt-4 border-t border-[#F0F0F0] pt-3 text-center">
            <p style={{ fontSize: '12px', color: '#888' }}>
              {t('auth.resetPassword.noAccountPrompt')}{' '}
              <button
                type="button"
                onClick={() => router.push('/onboarding')}
                className="font-bold text-[#2F76BB] hover:underline"
              >
                {t('auth.resetPassword.createAccountLink')}
              </button>
            </p>
          </div>
        </form>
      )}

      {/* STEP 3: Success state */}
      {step === 'success' && (
        <div className="space-y-6 pt-2">
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: '#F0F9F6', border: '1.5px solid #A8E1D1' }}
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#D8F3EC]">
              <CheckCircle2 size={32} color="#2B8A6E" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1B5B49' }}>
              {t('auth.loginForm.resetSuccess')}
            </h3>
          </div>

          <button
            type="button"
            onClick={handleBackToLogin}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white shadow-md transition-all hover:shadow-lg"
            style={{
              background: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
              fontSize: '15px',
              fontWeight: 700,
            }}
          >
            {t('auth.resetPassword.signInCta')}
            <ChevronRight size={16} />
          </button>
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
      {/* Desktop */}
      <div className="hidden h-full flex-col bg-white md:flex">
        <div
          className="flex items-center justify-between px-10 py-5"
          style={{ borderBottom: '1px solid #F5F5F5' }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={step === 'verify' ? () => setStep('request') : handleBackToLogin}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-[#F8FAFC]"
              style={{
                border: '1px solid #E8E8E8',
                color: '#667085',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              <ArrowLeft size={14} />
              {t('common.back')}
            </button>
            <MatchyLogo size="sm" />
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={step === 'verify' ? () => setStep('request') : handleBackToLogin}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-[#F8FAFC]"
              style={{
                border: '1px solid #E8E8E8',
                color: '#667085',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              <ArrowLeft size={14} />
              {t('common.back')}
            </button>
            <MatchyLogo size="sm" />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center px-7 py-8">{formContent}</div>
      </div>
    </AuthLayout>
  );
}
