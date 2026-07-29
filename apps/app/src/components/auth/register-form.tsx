'use client';

import { MatchyLogo } from '@/components/matchy/matchy-logo';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { registerPhone, selectAuth, sendOtp, verifyOtp } from '@/features/auth/store/auth-slice';
import { TOTAL_FLOW_STEPS } from '@/features/onboarding/step-order';
import { DEFAULT_PHONE_COUNTRY, composeE164Phone, getPhoneCountry } from '@/lib/phone-countries';
import { resolvePostAuthDestination } from '@/lib/post-auth-routing';
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Lock, Phone, ShieldCheck, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AuthLayout } from './auth-layout';
import { PhoneInput } from './phone-input';

// Credentials is always step 1 of the phone-signup flow — identity, interests, and
// location follow on the onboarding wizard. TOTAL_FLOW_STEPS is shared with the wizard
// so the two screens can never disagree on numbering again.
const TOTAL_STEPS = TOTAL_FLOW_STEPS;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(selectAuth);

  const [countryIso, setCountryIso] = useState(DEFAULT_PHONE_COUNTRY.iso);
  const [nationalNumber, setNationalNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [code, setCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const country = getPhoneCountry(countryIso);
  const phone = composeE164Phone(countryIso, nationalNumber);
  const isPhoneValid = nationalNumber.length >= country.nationalLength;
  const passwordReady = password.length >= 6 && password === passwordConfirm;
  const displayError = localError || error;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendCooldown]);

  const requestOtp = async () => {
    if (!isPhoneValid) {
      setLocalError(`Le numéro de téléphone est obligatoire (${country.nationalLength} chiffres).`);
      return;
    }
    if (!passwordReady) {
      setLocalError(
        password.length < 6
          ? 'Le mot de passe doit contenir au moins 6 caractères.'
          : 'Les mots de passe ne correspondent pas.',
      );
      return;
    }

    setLocalError(null);
    setOtpError(null);
    setCode('');
    setShowOtpModal(true);
    setOtpSending(true);
    const resultAction = await dispatch(sendOtp({ phone }));
    setOtpSending(false);

    if (!sendOtp.fulfilled.match(resultAction)) {
      setOtpError("Impossible d'envoyer le code. Vérifiez votre numéro.");
      return;
    }
    setResendCooldown(30);
  };

  const handleVerifyOtp = async () => {
    if (code.trim().length < 4) {
      setOtpError('Entrez le code à 6 chiffres.');
      return;
    }

    setOtpError(null);
    setOtpVerifying(true);
    const verifyAction = await dispatch(verifyOtp({ phone, code }));
    if (!verifyOtp.fulfilled.match(verifyAction)) {
      setOtpVerifying(false);
      setOtpError('Code incorrect.');
      return;
    }

    const registerAction = await dispatch(
      registerPhone({ phone, password, signupToken: verifyAction.payload.signupToken }),
    );
    setOtpVerifying(false);

    if (!registerPhone.fulfilled.match(registerAction)) {
      setOtpError('Impossible de créer le compte.');
      return;
    }

    setShowOtpModal(false);
    router.push(
      resolvePostAuthDestination(
        searchParams.get('next'),
        registerAction.payload.user.onboarding_completed,
      ),
    );
    router.refresh();
  };

  const missingPassword = password.length > 0 && password.length < 6;
  const passwordsMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  const formContent = (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <div
              key={index}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: index === 0 ? '#61BCA6' : '#E0E0E0' }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p style={{ fontSize: '12px', color: '#888' }}>Étape 1 sur {TOTAL_STEPS}</p>
          <p style={{ fontSize: '12px', color: '#2F76BB', fontWeight: 700 }}>
            {Math.round((1 / TOTAL_STEPS) * 100)}%
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1A1A2E', marginBottom: '6px' }}>
          Votre compte
        </h1>
        <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6 }}>
          Entrez votre numéro de téléphone et votre mot de passe, puis confirmez le code SMS.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            Numéro de téléphone <span style={{ color: '#61BCA6' }}>*</span>
          </label>
          <div className="mt-1">
            <PhoneInput
              countryIso={countryIso}
              nationalNumber={nationalNumber}
              onCountryChange={setCountryIso}
              onNationalNumberChange={setNationalNumber}
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            Mot de passe <span style={{ color: '#61BCA6' }}>*</span>
          </label>
          <div
            className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3"
            style={{
              border: `2px solid ${missingPassword ? '#E74C3C' : password.length >= 6 ? '#2F76BB' : '#E0E0E0'}`,
              background: password ? '#F5F9FF' : '#FAFAFA',
            }}
          >
            <Lock size={16} color="#61BCA6" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              disabled={loading}
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
          {missingPassword && (
            <p style={{ fontSize: '11px', color: '#E74C3C', marginTop: '4px' }}>
              Au moins 6 caractères
            </p>
          )}
        </div>

        <div>
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            Confirmer le mot de passe <span style={{ color: '#61BCA6' }}>*</span>
          </label>
          <div
            className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3"
            style={{
              border: `2px solid ${passwordsMismatch ? '#E74C3C' : passwordConfirm && !passwordsMismatch ? '#2F76BB' : '#E0E0E0'}`,
              background: passwordConfirm ? '#F5F9FF' : '#FAFAFA',
            }}
          >
            <Lock size={16} color="#61BCA6" />
            <input
              type={showPasswordConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              value={passwordConfirm}
              disabled={loading}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="••••••••"
              className="flex-1 bg-transparent text-[#353535] outline-none"
              style={{ fontSize: '14px' }}
            />
            <button type="button" onClick={() => setShowPasswordConfirm((value) => !value)}>
              {showPasswordConfirm ? (
                <EyeOff size={18} color="#7A7A7A" />
              ) : (
                <Eye size={18} color="#7A7A7A" />
              )}
            </button>
          </div>
          {passwordsMismatch && (
            <p style={{ fontSize: '11px', color: '#E74C3C', marginTop: '4px' }}>
              Les mots de passe ne correspondent pas
            </p>
          )}
        </div>
      </div>

      {displayError && (
        <p
          className="mt-4 text-center"
          style={{ fontSize: '13px', color: '#E74C3C', fontWeight: 600 }}
        >
          {displayError}
        </p>
      )}

      <button
        type="button"
        onClick={requestOtp}
        disabled={loading || otpSending}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white"
        style={{
          background: otpSending ? '#AFC4DA' : 'linear-gradient(90deg, #61BCA6, #2F76BB)',
          fontSize: '15px',
          fontWeight: 700,
        }}
      >
        {otpSending ? <Loader2 size={18} className="animate-spin" /> : <Phone size={18} />}
        Continuer et vérifier par SMS
      </button>
    </div>
  );

  return (
    <>
      {showOtpModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
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
              onClick={() => setShowOtpModal(false)}
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
              onClick={requestOtp}
              disabled={otpSending || resendCooldown > 0}
              className="mt-3 w-full rounded-xl py-2"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: resendCooldown > 0 || otpSending ? '#AAA' : '#2F76BB',
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

      <AuthLayout
        activeFeature={0}
        step={1}
        totalSteps={TOTAL_STEPS}
        stepLabel="Votre compte"
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
              <button
                type="button"
                onClick={() => router.push('/login')}
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push('/login')}
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
              <MatchyLogo size="sm" />
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-center px-7 py-8">{formContent}</div>
        </div>
      </AuthLayout>
    </>
  );
}
