'use client';

import { PhoneInput } from '@/components/auth/phone-input';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import { selectAuth, sendOtp, verifyOtp } from '@/features/auth/store/auth-slice';
import { DEFAULT_PHONE_COUNTRY, composeE164Phone, getPhoneCountry } from '@/lib/phone-countries';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export function OtpTestForm() {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(selectAuth);

  const [countryIso, setCountryIso] = useState(DEFAULT_PHONE_COUNTRY.iso);
  const [nationalNumber, setNationalNumber] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendInfo, setSendInfo] = useState<string | null>(null);

  const country = getPhoneCountry(countryIso);
  const phone = composeE164Phone(countryIso, nationalNumber);
  const phoneValid = nationalNumber.length >= country.nationalLength;

  const handleSendCode = async () => {
    if (!phoneValid) return;
    setSendInfo(null);
    const result = await dispatch(sendOtp({ phone }));
    if (sendOtp.fulfilled.match(result)) {
      setCodeSent(true);
      setSendInfo('Code envoyé par SMS au numéro saisi.');
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) return;
    const result = await dispatch(verifyOtp({ phone, code: code.trim() }));
    if (verifyOtp.fulfilled.match(result)) {
      // Verifying an OTP only proves phone ownership — it never creates a session by
      // itself (see doc/reviews/authentication-contract.md), so this harness just
      // surfaces the grant register-phone would need, instead of redirecting.
      setSendInfo(`Code vérifié. signupToken: ${result.payload.signupToken}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1A1A2E' }}>Test OTP téléphone</h1>
        <p style={{ fontSize: '13px', color: '#888', marginTop: '4px', marginBottom: '24px' }}>
          Harnais de test pour /otp/send et /otp/verify — connecte ou crée un compte.
        </p>

        <div className="mb-4">
          <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
            Numéro de téléphone
          </label>
          <PhoneInput
            countryIso={countryIso}
            nationalNumber={nationalNumber}
            onCountryChange={setCountryIso}
            onNationalNumberChange={setNationalNumber}
            disabled={loading || codeSent}
          />
        </div>

        <button
          type="button"
          onClick={handleSendCode}
          disabled={loading || !phoneValid || codeSent}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-white"
          style={{
            background: !loading && phoneValid && !codeSent ? '#2F76BB' : '#D5D5D5',
            fontSize: '14px',
            fontWeight: 700,
          }}
        >
          {loading && !codeSent && <Loader2 size={16} className="animate-spin" />}
          {codeSent ? 'Code envoyé' : 'Envoyer le code'}
        </button>

        {codeSent && (
          <div className="mb-4">
            <label style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>
              Code de vérification
            </label>
            <input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="123456"
              className="mt-2 w-full rounded-2xl px-4 py-3.5 text-[#353535] outline-none"
              style={{ border: '2px solid #2F76BB', background: '#F5F9FF', fontSize: '15px' }}
            />
          </div>
        )}

        {sendInfo && (
          <p className="mb-3 text-center" style={{ fontSize: '12px', color: '#2F76BB' }}>
            {sendInfo}
          </p>
        )}

        {error && (
          <p className="mb-3 text-center" style={{ fontSize: '12px', color: '#E24E59' }}>
            {error}
          </p>
        )}

        {codeSent && (
          <button
            type="button"
            onClick={handleVerifyCode}
            disabled={loading || !code.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white"
            style={{
              background:
                !loading && code.trim() ? 'linear-gradient(90deg, #61BCA6, #2F76BB)' : '#D5D5D5',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Vérifier
          </button>
        )}
      </div>
    </div>
  );
}
