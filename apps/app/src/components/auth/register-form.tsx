'use client';

import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { registerPhoneSchema } from '@/features/auth/schemas';
import { registerPhone, selectAuth, sendOtp } from '@/features/auth/store/auth-slice';
import { DEFAULT_PHONE_COUNTRY, composeE164Phone, getPhoneCountry } from '@/lib/phone-countries';
import { resolvePostAuthDestination } from '@/lib/post-auth-routing';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { AuthLayout } from './auth-layout';
import { MatchyLogo } from './matchy-logo';
import { PhoneInput } from './phone-input';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(selectAuth);

  const [countryIso, setCountryIso] = useState(DEFAULT_PHONE_COUNTRY.iso);
  const [nationalNumber, setNationalNumber] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Registration is OTP-gated: send a code to the phone first, then submit
  // register-phone with { phone, password, code, name } — a code is required by the
  // API contract and the account isn't created without verifying one.
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');

  const country = getPhoneCountry(countryIso);
  const phone = composeE164Phone(countryIso, nationalNumber);
  const isPhoneAndPasswordValid =
    nationalNumber.length >= country.nationalLength && password.length >= 6;
  const displayError = localError || error;

  const handleSendCode = async () => {
    if (!isPhoneAndPasswordValid) return;

    setLocalError(null);
    const resultAction = await dispatch(sendOtp({ phone }));
    if (sendOtp.fulfilled.match(resultAction)) {
      setOtpSent(true);
    } else {
      setLocalError("Impossible d'envoyer le code. Vérifiez votre numéro.");
    }
  };

  const handleEditPhone = () => {
    setOtpSent(false);
    setCode('');
    setLocalError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!otpSent) return;

    const parsed = registerPhoneSchema.safeParse({ phone, password, code, name });
    if (!parsed.success) {
      setLocalError('Entrez le code reçu par SMS.');
      return;
    }

    setLocalError(null);
    const resultAction = await dispatch(registerPhone({ phone, password, code, name }));
    if (registerPhone.fulfilled.match(resultAction)) {
      router.push(resolvePostAuthDestination(searchParams.get('next')));
      router.refresh();
    } else {
      setLocalError('Code invalide ou expiré.');
    }
  };

  const formContent = (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8">
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1A1A2E' }}>Créer un compte</h1>
        <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6, marginTop: '6px' }}>
          Rejoignez Matchy+ avec votre numéro de téléphone.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>Indicatif pays</label>
          <PhoneInput
            countryIso={countryIso}
            nationalNumber={nationalNumber}
            onCountryChange={setCountryIso}
            onNationalNumberChange={setNationalNumber}
            disabled={loading || otpSent}
          />
        </div>

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>Nom</label>
          <div
            className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-3.5"
            style={{ border: '2px solid #2F76BB', background: '#F5F9FF' }}
          >
            <User size={16} color="#61BCA6" />
            <input
              type="text"
              value={name}
              disabled={loading || otpSent}
              onChange={(event) => setName(event.target.value)}
              placeholder="Votre nom"
              className="flex-1 bg-transparent text-[#353535] outline-none"
              style={{ fontSize: '15px' }}
            />
          </div>
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
              disabled={loading || otpSent}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Au moins 6 caractères"
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

        {otpSent && (
          <>
            <div className="mb-2">
              <button
                type="button"
                onClick={handleEditPhone}
                style={{ fontSize: '12px', fontWeight: 700, color: '#2F76BB' }}
              >
                Modifier le numéro
              </button>
            </div>

            <div className="mb-4">
              <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
                Code reçu par SMS
              </label>
              <div
                className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-3.5"
                style={{ border: '2px solid #2F76BB', background: '#F5F9FF' }}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="123456"
                  className="flex-1 bg-transparent text-[#353535] outline-none"
                  style={{ fontSize: '15px' }}
                />
              </div>
            </div>
          </>
        )}

        {displayError && (
          <p className="mb-3 text-center" style={{ fontSize: '12px', color: '#E24E59' }}>
            {displayError}
          </p>
        )}

        {otpSent ? (
          <button
            type="submit"
            disabled={loading || code.trim().length < 4}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white"
            style={{
              background:
                code.trim().length >= 4 && !loading
                  ? 'linear-gradient(90deg, #61BCA6, #2F76BB)'
                  : '#D5D5D5',
              fontSize: '14px',
              fontWeight: 700,
              transition: 'background 0.2s',
            }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Créer un compte
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSendCode}
            disabled={loading || !isPhoneAndPasswordValid}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white"
            style={{
              background:
                isPhoneAndPasswordValid && !loading
                  ? 'linear-gradient(90deg, #61BCA6, #2F76BB)'
                  : '#D5D5D5',
              fontSize: '14px',
              fontWeight: 700,
              transition: 'background 0.2s',
            }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Envoyer le code
          </button>
        )}
      </form>

      <p
        className="mt-8 text-center"
        style={{ fontSize: '11px', color: '#BBBBBB', lineHeight: 1.6 }}
      >
        En continuant, vous acceptez nos{' '}
        <span className="text-[#2F76BB]">Conditions d&apos;utilisation</span> et notre{' '}
        <span className="text-[#2F76BB]">Politique de confidentialité</span>
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
  );
}
