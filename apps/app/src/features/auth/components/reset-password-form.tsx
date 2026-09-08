'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { HeaderBackButton } from '@/components/matchy/header-back-button';
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
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AuthLayout } from './auth-layout';
import { MatchyLogo } from './matchy-logo';
import { PhoneInput } from './phone-input';

type ResetStep = 'request' | 'new_password' | 'success';

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

  // OTP Modal State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [verifiedCode, setVerifiedCode] = useState('');

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [requestLoading, setRequestLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [localError, setLocalError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
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
    setModalError(null);
    if (!isResend) {
      setInfoMessage(null);
    }
    setRequestLoading(true);

    try {
      await dispatch(requestPasswordReset({ phone })).unwrap();
      setResendCooldown(60);
      setOtpModalOpen(true);
      setCode('');
    } catch {
      setLocalError(t('auth.resetPassword.resetSendFailed'));
    } finally {
      setRequestLoading(false);
    }
  };

  const handleVerifyOtpModal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code.trim().length !== 6) {
      setModalError(t('auth.resetPassword.codeLabel'));
      return;
    }

    setVerifiedCode(code.trim());
    setModalError(null);
    setOtpModalOpen(false);
    setStep('new_password');
  };

  const handleConfirmReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (
      nationalNumber.length < country.nationalLength ||
      verifiedCode.length !== 6 ||
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
          code: verifiedCode,
          newPassword,
        }),
      ).unwrap();
      setStep('success');
    } catch (err: unknown) {
      const apiCode = getApiErrorCode(err);
      if (apiCode === 'phone_not_found') {
        setLocalError(t('auth.resetPassword.errorPhoneNotFound'));
      } else if (apiCode === 'invalid_otp') {
        // If code expired or was wrong on final submission, reopen modal
        setStep('request');
        setOtpModalOpen(true);
        setModalError(t('auth.resetPassword.errorInvalidOtp'));
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
          ) : step === 'new_password' ? (
            <Lock size={24} color="#2F76BB" />
          ) : (
            <KeyRound size={24} color="#2F76BB" />
          )}
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E' }}>
          {step === 'request' && t('auth.resetPassword.requestTitle')}
          {step === 'new_password' && t('auth.resetPassword.newPasswordLabel')}
          {step === 'success' && t('auth.resetPassword.successTitle')}
        </h1>
        <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginTop: '6px' }}>
          {step === 'request' && t('auth.resetPassword.requestDesc')}
          {step === 'new_password' && t('auth.resetPassword.newPasswordPlaceholder')}
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
                  ? matchyBrand.gradient
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

      {/* STEP 2: Set New Password Form (After OTP is verified) */}
      {step === 'new_password' && (
        <form onSubmit={handleConfirmReset} className="space-y-4">
          {/* Phone chip with Verified indicator */}
          <div
            className="flex items-center justify-between rounded-xl px-3.5 py-2.5"
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
          >
            <div className="flex items-center gap-2">
              <Phone size={15} color="#2F76BB" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{phone}</span>
              <span className="rounded-full bg-[#E6F9F3] px-2 py-0.5 text-[10px] font-bold text-[#2B8A6E]">
                ✓ {t('auth.resetPassword.successTitle')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('request');
                setVerifiedCode('');
                setLocalError(null);
              }}
              style={{ fontSize: '12px', fontWeight: 700, color: '#2F76BB' }}
              className="hover:underline"
            >
              {t('auth.resetPassword.changePhone')}
            </button>
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

          {/* Submit */}
          <button
            type="submit"
            disabled={
              submitLoading ||
              !isPasswordPolicySatisfied(newPassword) ||
              newPassword !== confirmPassword
            }
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white shadow-sm transition-all hover:shadow-md"
            style={{
              background:
                isPasswordPolicySatisfied(newPassword) &&
                newPassword === confirmPassword &&
                !submitLoading
                  ? matchyBrand.gradient
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
              background: matchyBrand.gradient,
              fontSize: '15px',
              fontWeight: 700,
            }}
          >
            {t('auth.resetPassword.signInCta')}
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Verification OTP Modal Dialog */}
      {otpModalOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div
            className="animate-in zoom-in-95 relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            style={{ border: '1px solid #E2E8F0' }}
          >
            <button
              type="button"
              onClick={() => setOtpModalOpen(false)}
              className="absolute top-4 right-4 rounded-full p-1 text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#1E293B]"
            >
              <X size={18} />
            </button>

            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0F7FF] text-[#2F76BB]">
                <KeyRound size={24} />
              </div>
              <h2 className="text-lg font-bold text-[#1E293B]">
                {t('auth.resetPassword.verifyTitle')}
              </h2>
              <p className="mt-1 text-xs text-[#64748B]">
                {t('auth.resetPassword.verifyDesc', { phone })}
              </p>
            </div>

            {modalError && (
              <div className="mt-4 rounded-xl bg-[#FEECEC] p-2.5 text-center text-xs font-semibold text-[#E24E59]">
                {modalError}
              </div>
            )}

            <form onSubmit={handleVerifyOtpModal} className="mt-5 space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  autoFocus
                  className="w-full rounded-2xl px-4 py-3.5 text-center text-2xl font-extrabold tracking-widest text-[#1E293B] transition-all outline-none focus:ring-2 focus:ring-[#2F76BB]"
                  style={{ border: '2px solid #2F76BB', background: '#F8FAFC' }}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleRequestCode(true)}
                  disabled={requestLoading || resendCooldown > 0}
                  className="inline-flex items-center gap-1 font-semibold text-[#2F76BB] hover:underline disabled:text-[#94A3B8]"
                >
                  <RefreshCw size={12} className={requestLoading ? 'animate-spin' : ''} />
                  {resendCooldown > 0
                    ? t('auth.resetPassword.resendCooldown', { seconds: resendCooldown })
                    : t('auth.resetPassword.resendCode')}
                </button>
              </div>

              <button
                type="submit"
                disabled={code.length !== 6}
                className="w-full rounded-2xl py-3 text-sm font-bold text-white shadow-xs transition-opacity hover:opacity-95 disabled:opacity-50"
                style={{ background: matchyBrand.gradient }}
              >
                {t('auth.resetPassword.verifyTitle')}
              </button>
            </form>
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
      {/* Desktop */}
      <div className="hidden h-full flex-col bg-white md:flex">
        <div
          className="flex items-center justify-between px-10 py-5"
          style={{ borderBottom: '1px solid #F5F5F5' }}
        >
          <div className="flex items-center gap-3">
            <HeaderBackButton
              onClick={step === 'new_password' ? () => setStep('request') : handleBackToLogin}
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
          <div className="flex items-center gap-3">
            <HeaderBackButton
              onClick={step === 'new_password' ? () => setStep('request') : handleBackToLogin}
              label={t('common.back')}
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center px-7 py-8">{formContent}</div>
      </div>
    </AuthLayout>
  );
}
