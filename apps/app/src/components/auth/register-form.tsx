'use client';

import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { registerPhone, selectAuth } from '@/features/auth/store/auth-slice';
import { DEFAULT_PHONE_COUNTRY, composeE164Phone, getPhoneCountry } from '@/lib/phone-countries';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthLayout } from './auth-layout';
import { MatchyLogo } from './matchy-logo';
import { PhoneInput } from './phone-input';

export function RegisterForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(selectAuth);

  const [countryIso, setCountryIso] = useState(DEFAULT_PHONE_COUNTRY.iso);
  const [nationalNumber, setNationalNumber] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const country = getPhoneCountry(countryIso);
  const phone = composeE164Phone(countryIso, nationalNumber);
  const isValid = nationalNumber.length >= country.nationalLength && password.length >= 6;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) return;

    const resultAction = await dispatch(registerPhone({ phone, password, name }));
    if (registerPhone.fulfilled.match(resultAction)) {
      router.push('/');
      router.refresh();
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
            disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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

        {error && (
          <p className="mb-3 text-center" style={{ fontSize: '12px', color: '#E24E59' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !isValid}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white"
          style={{
            background:
              isValid && !loading ? 'linear-gradient(90deg, #61BCA6, #2F76BB)' : '#D5D5D5',
            fontSize: '14px',
            fontWeight: 700,
            transition: 'background 0.2s',
          }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Créer un compte
        </button>
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
