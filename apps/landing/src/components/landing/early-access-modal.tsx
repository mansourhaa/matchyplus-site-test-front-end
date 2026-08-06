'use client';

import { apiFetch } from '@/lib/api';
import { Briefcase, Check, ChevronDown, Loader2, Phone, Sparkles, User, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@saas-boilerplate/ui/components/button';

type Lang = 'fr' | 'en' | 'ar';

type Props = {
  lang: Lang;
  open: boolean;
  onClose: () => void;
};

const TR = {
  fr: {
    title: "Liste d'accès anticipé",
    subtitle: 'Laissez vos infos. On vous prévient dès le lancement de Matchy+.',
    stepInfo: 'Vos infos',
    stepCode: 'Vérification',
    name: 'Nom complet',
    namePh: 'Votre nom',
    occupation: 'Profession',
    occupationPh: 'Ex. entrepreneur, étudiant…',
    phone: 'Téléphone',
    phonePh: 'XX XXX XXX',
    sendCode: 'Recevoir le code SMS',
    otpTitle: 'Entrez le code SMS',
    otpDesc: 'Nous avons envoyé un code à',
    otpPh: '••••••',
    verify: 'Valider mon inscription',
    resend: 'Renvoyer le code',
    changePhone: 'Modifier mes infos',
    successTitle: 'Vous êtes sur la liste !',
    successDesc: 'Merci. Nous vous préviendrons dès le lancement de Matchy+.',
    close: 'Fermer',
    already: 'Ce numéro est déjà inscrit.',
    required: 'Veuillez remplir tous les champs.',
    phoneInvalid: 'Numéro de téléphone invalide.',
  },
  en: {
    title: 'Early access list',
    subtitle: "Leave your details. We'll notify you when Matchy+ launches.",
    stepInfo: 'Your info',
    stepCode: 'Verification',
    name: 'Full name',
    namePh: 'Your name',
    occupation: 'Occupation',
    occupationPh: 'e.g. entrepreneur, student…',
    phone: 'Phone',
    phonePh: 'XX XXX XXX',
    sendCode: 'Send SMS code',
    otpTitle: 'Enter the SMS code',
    otpDesc: 'We sent a code to',
    otpPh: '••••••',
    verify: 'Confirm my spot',
    resend: 'Resend code',
    changePhone: 'Edit my details',
    successTitle: "You're on the list!",
    successDesc: "Thanks. We'll notify you as soon as Matchy+ launches.",
    close: 'Close',
    already: 'This phone number is already registered.',
    required: 'Please fill in all fields.',
    phoneInvalid: 'Invalid phone number.',
  },
  ar: {
    title: 'قائمة الوصول المبكر',
    subtitle: 'اترك بياناتك. سنخبرك عند إطلاق Matchy+.',
    stepInfo: 'بياناتك',
    stepCode: 'التحقق',
    name: 'الاسم الكامل',
    namePh: 'اسمك',
    occupation: 'المهنة',
    occupationPh: 'مثال: رائد أعمال، طالب…',
    phone: 'الهاتف',
    phonePh: 'XX XXX XXX',
    sendCode: 'إرسال رمز SMS',
    otpTitle: 'أدخل رمز SMS',
    otpDesc: 'أرسلنا رمزًا إلى',
    otpPh: '••••••',
    verify: 'تأكيد التسجيل',
    resend: 'إعادة إرسال الرمز',
    changePhone: 'تعديل بياناتي',
    successTitle: 'أنت على القائمة!',
    successDesc: 'شكرًا. سنخبرك فور إطلاق Matchy+.',
    close: 'إغلاق',
    already: 'هذا الرقم مسجّل مسبقًا.',
    required: 'يرجى ملء جميع الحقول.',
    phoneInvalid: 'رقم هاتف غير صالح.',
  },
} as const;

const COUNTRIES = [
  { iso: 'TN', dial: '+216', len: 8, flag: '🇹🇳' },
  { iso: 'DZ', dial: '+213', len: 9, flag: '🇩🇿' },
  { iso: 'MA', dial: '+212', len: 9, flag: '🇲🇦' },
  { iso: 'FR', dial: '+33', len: 9, flag: '🇫🇷' },
] as const;

type Step = 'form' | 'otp' | 'done';

function composePhone(dial: string, national: string): string {
  const digits = national.replace(/\D/g, '');
  if (!digits) return '';
  return `${dial}${digits}`;
}

const inputClass =
  'w-full min-h-10 sm:min-h-11 rounded-xl border border-[#D7E6F5] bg-[#F5F9FF] px-3 sm:px-3.5 py-2.5 text-[16px] sm:text-[14px] text-gray-900 outline-none transition focus:border-[#2F76BB] focus:ring-2 focus:ring-[#2F76BB]/15';

export function EarlyAccessModal({ lang, open, onClose }: Props) {
  const t = TR[lang] ?? TR.fr;
  const isRtl = lang === 'ar';
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [countryIso, setCountryIso] = useState<(typeof COUNTRIES)[number]['iso']>('TN');
  const [nationalPhone, setNationalPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const country = useMemo(
    () => COUNTRIES.find((c) => c.iso === countryIso) || COUNTRIES[0],
    [countryIso],
  );
  const fullPhone = composePhone(country.dial, nationalPhone);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Keep focused fields visible when the mobile keyboard opens.
  useEffect(() => {
    if (!open || typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || !bodyRef.current) return;
      if (!bodyRef.current.contains(active)) return;
      window.setTimeout(() => {
        active.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 50);
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    bodyRef.current?.scrollTo({ top: 0 });
  }, [open, step]);

  const resetAndClose = () => {
    onClose();
    // Reset after close animation frame so UI doesn't flash.
    window.setTimeout(() => {
      setStep('form');
      setName('');
      setOccupation('');
      setNationalPhone('');
      setOtp('');
      setError(null);
      setDevCode(null);
      setCountryOpen(false);
      setBusy(false);
    }, 200);
  };

  const sendOtp = async () => {
    setError(null);
    setDevCode(null);
    if (name.trim().length < 2 || occupation.trim().length < 2) {
      setError(t.required);
      return;
    }
    if (nationalPhone.replace(/\D/g, '').length < country.len) {
      setError(t.phoneInvalid);
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch<{ success?: boolean; message?: string; devCode?: string }>(
        '/waitlist/send-otp',
        {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            occupation: occupation.trim(),
            phone: fullPhone,
          }),
        },
      );

      if (!res.success) {
        setError(
          res.error?.includes('déjà inscrit') || res.error?.toLowerCase().includes('already')
            ? t.already
            : res.error || t.required,
        );
        return;
      }

      if (res.data?.devCode) setDevCode(res.data.devCode);
      setOtp('');
      setStep('otp');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    if (otp.trim().length < 4) {
      setError(t.required);
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch('/waitlist/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: fullPhone,
          code: otp.trim(),
          otp: otp.trim(),
        }),
      });

      if (!res.success) {
        setError(res.error || t.required);
        return;
      }
      setStep('done');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      style={{
        background: 'rgba(15, 28, 48, 0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="early-access-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) resetAndClose();
      }}
    >
      <div
        ref={panelRef}
        className="relative flex max-h-[min(85dvh,36rem)] w-full max-w-[22.5rem] flex-col overflow-hidden rounded-2xl bg-white sm:max-h-[min(88dvh,40rem)] sm:max-w-md sm:rounded-3xl"
        style={{
          boxShadow: '0 20px 50px rgba(15, 48, 96, 0.25)',
          marginTop: 'env(safe-area-inset-top, 0px)',
          marginBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Brand header strip — compact so the card stays centered */}
        <div
          className="relative shrink-0 px-4 pt-4 pb-3 text-white sm:px-5 sm:pb-3.5"
          style={{ background: 'linear-gradient(120deg, #61BCA6 0%, #2F76BB 100%)' }}
        >
          <button
            type="button"
            onClick={resetAndClose}
            className="absolute end-3 top-3 flex h-9 w-9 touch-manipulation items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 active:scale-95"
            aria-label={t.close}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-1.5 flex items-center gap-1.5 pe-10 opacity-95">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[10px] font-semibold tracking-wide uppercase sm:text-[11px]">
              Matchy+
            </span>
          </div>
          <h2
            id="early-access-title"
            className="pe-9 text-[17px] leading-snug font-extrabold sm:text-[20px]"
          >
            {step === 'done' ? t.successTitle : t.title}
          </h2>
          {step !== 'done' && (
            <p className="mt-1 line-clamp-2 pe-6 text-[12px] leading-snug text-white/90 sm:text-[13px]">
              {t.subtitle}
            </p>
          )}

          {step !== 'done' && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:mt-3">
              <StepPill active={step === 'form'} label={`1. ${t.stepInfo}`} />
              <div className="hidden h-px min-w-3 flex-1 bg-white/30 sm:block" />
              <StepPill active={step === 'otp'} label={`2. ${t.stepCode}`} />
            </div>
          )}
        </div>

        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3.5 sm:px-5 sm:py-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {step === 'done' && (
            <div className="py-1 text-center sm:py-2">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16"
                style={{ background: 'linear-gradient(135deg, #61BCA6, #2F76BB)' }}
              >
                <Check className="h-7 w-7 text-white sm:h-8 sm:w-8" />
              </div>
              <p className="mb-5 px-1 text-[14px] leading-relaxed text-gray-600 sm:mb-6 sm:text-[15px]">
                {t.successDesc}
              </p>
              <Button
                type="button"
                size="lg"
                onClick={resetAndClose}
                className="min-h-11 w-full touch-manipulation bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] text-base hover:opacity-90"
              >
                {t.close}
              </Button>
            </div>
          )}

          {step === 'form' && (
            <div className="space-y-3 sm:space-y-3.5">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-gray-700 sm:text-[13px]">
                  <User className="h-3.5 w-3.5 shrink-0 text-[#2F76BB]" />
                  {t.name}
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.namePh}
                  className={inputClass}
                  autoComplete="name"
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-gray-700 sm:text-[13px]">
                  <Briefcase className="h-3.5 w-3.5 shrink-0 text-[#2F76BB]" />
                  {t.occupation}
                </span>
                <input
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder={t.occupationPh}
                  className={inputClass}
                  autoComplete="organization-title"
                />
              </label>

              <div>
                <span className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-gray-700 sm:text-[13px]">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#2F76BB]" />
                  {t.phone}
                </span>
                <div className="flex gap-2">
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setCountryOpen((v) => !v)}
                      className="flex min-h-10 touch-manipulation items-center gap-1 rounded-xl border border-[#D7E6F5] bg-[#F5F9FF] px-2.5 text-[13px] font-semibold text-gray-800 sm:min-h-11"
                    >
                      <span className="text-base leading-none">{country.flag}</span>
                      <span dir="ltr">{country.dial}</span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </button>
                    {countryOpen && (
                      <div className="absolute start-0 top-[calc(100%+4px)] z-20 max-h-40 w-40 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                        {COUNTRIES.map((c) => (
                          <button
                            key={c.iso}
                            type="button"
                            className="flex min-h-10 w-full touch-manipulation items-center gap-2 px-3 py-2 text-sm hover:bg-[#F5F7FA]"
                            onClick={() => {
                              setCountryIso(c.iso);
                              setNationalPhone('');
                              setCountryOpen(false);
                            }}
                          >
                            <span>{c.flag}</span>
                            <span dir="ltr">{c.dial}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    value={nationalPhone}
                    onChange={(e) =>
                      setNationalPhone(e.target.value.replace(/\D/g, '').slice(0, country.len))
                    }
                    placeholder={t.phonePh}
                    inputMode="numeric"
                    className={`${inputClass} min-w-0 flex-1`}
                    autoComplete="tel-national"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-[#E24E59] sm:text-sm">
                  {error}
                </p>
              )}

              <Button
                type="button"
                size="lg"
                disabled={busy}
                onClick={() => void sendOtp()}
                className="mt-1 min-h-11 w-full touch-manipulation bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] text-[15px] font-bold transition hover:opacity-90 active:scale-[0.98]"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t.sendCode}
              </Button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-3.5 sm:space-y-4">
              <div className="rounded-xl border border-[#D7E6F5] bg-[#F5F9FF] px-3 py-3 text-center sm:rounded-2xl sm:px-4">
                <p className="text-[13px] font-semibold text-gray-900 sm:text-sm">{t.otpTitle}</p>
                <p className="mt-1 text-[12px] break-words text-gray-500 sm:text-[13px]">
                  {t.otpDesc}{' '}
                  <span className="font-semibold whitespace-nowrap text-[#2F76BB]" dir="ltr">
                    {fullPhone}
                  </span>
                </p>
              </div>

              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t.otpPh}
                inputMode="numeric"
                autoFocus
                className={`${inputClass} text-center text-lg font-bold tracking-[0.3em] sm:text-xl`}
                autoComplete="one-time-code"
              />

              {devCode && process.env.NODE_ENV === 'development' && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Dev code: <strong>{devCode}</strong>
                </p>
              )}

              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-[#E24E59] sm:text-sm">
                  {error}
                </p>
              )}

              <Button
                type="button"
                size="lg"
                disabled={busy || otp.length < 4}
                onClick={() => void verifyOtp()}
                className="min-h-11 w-full touch-manipulation bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] text-[15px] font-bold transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : t.verify}
              </Button>

              <div className="flex flex-col items-stretch justify-between gap-2 pt-1 sm:flex-row sm:items-center sm:gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void sendOtp()}
                  className="min-h-10 touch-manipulation text-sm font-semibold text-[#2F76BB] hover:underline disabled:opacity-50"
                >
                  {t.resend}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setStep('form');
                    setOtp('');
                    setError(null);
                    setDevCode(null);
                  }}
                  className="min-h-10 touch-manipulation text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  {t.changePhone}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap sm:px-3 sm:text-[11px]"
      style={{
        background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.18)',
        color: active ? '#2F76BB' : 'rgba(255,255,255,0.9)',
      }}
    >
      {label}
    </span>
  );
}

/** @deprecated use EarlyAccessModal */
export const EarlyAccessForm = EarlyAccessModal;
