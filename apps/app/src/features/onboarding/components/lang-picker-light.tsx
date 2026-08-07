'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const LANG_NAMES: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
};

function FlagIcon({ locale, size = 18 }: { locale: Locale; size?: number }) {
  const width = Math.round(size * 1.45);
  const wrap = {
    width,
    height: size,
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
    flexShrink: 0,
    borderRadius: 2,
  };
  const svg = { display: 'block' as const, width: '100%', height: '100%' };

  if (locale === 'fr') {
    return (
      <div style={wrap}>
        <svg viewBox="0 0 3 2" style={svg} aria-hidden>
          <rect width="1" height="2" fill="#002395" />
          <rect x="1" width="1" height="2" fill="#fff" />
          <rect x="2" width="1" height="2" fill="#ED2939" />
        </svg>
      </div>
    );
  }
  if (locale === 'en') {
    return (
      <div style={wrap}>
        <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" style={svg} aria-hidden>
          <rect width="60" height="30" fill="#012169" />
          <g fill="#fff">
            <polygon points="0,0 60,30 60,25 5,0" />
            <polygon points="60,0 0,30 0,25 55,0" />
          </g>
          <g fill="#C8102E">
            <polygon points="0,0 60,30 60,27 3,0" />
            <polygon points="60,0 0,30 0,27 57,0" />
            <rect x="25" width="10" height="30" />
            <rect y="10" width="60" height="10" />
          </g>
        </svg>
      </div>
    );
  }
  // ar — Tunisia flag strip (Matchy uses TN for Arabic UI)
  return (
    <div style={wrap}>
      <svg viewBox="0 0 3 2" style={svg} aria-hidden>
        <rect width="3" height="2" fill="#E70013" />
        <circle cx="1.5" cy="1" r="0.55" fill="#fff" />
        <circle cx="1.62" cy="1" r="0.42" fill="#E70013" />
        <path
          d="M1.58 0.68 L1.72 1 L1.58 1.32 L1.88 1.12 L1.98 1.35 L2.02 1.05 L2.25 1 L2.02 0.88 L1.98 0.62 L1.88 0.85 Z"
          fill="#fff"
        />
      </svg>
    </div>
  );
}

type LangPickerLightProps = {
  menuAlign?: 'left' | 'right';
};

/** Matchy Inscription AuthLayout `LangPickerLight` — flag button + FR/EN/AR menu. */
export function LangPickerLight({ menuAlign }: LangPickerLightProps) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const resolvedAlign = menuAlign ?? (locale === 'ar' ? 'left' : 'right');

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div className="relative z-70" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center justify-center rounded-xl transition-all"
        style={{
          background: '#F5F7FA',
          border: '1px solid #E0E0E0',
          width: 44,
          height: 38,
        }}
        title="Sélectionner la langue"
        aria-label="Sélectionner la langue"
        aria-expanded={open}
      >
        <FlagIcon locale={locale} size={18} />
      </button>
      {open && (
        <div
          className={`absolute top-10 overflow-hidden rounded-2xl shadow-2xl ${
            resolvedAlign === 'left' ? 'left-0' : 'right-0'
          }`}
          style={{
            background: '#FFFFFF',
            border: '1px solid #DDE5EF',
            minWidth: 190,
            boxShadow: '0 14px 38px rgba(18,36,61,0.22)',
            zIndex: 80,
          }}
        >
          {(['fr', 'en', 'ar'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-[#F5F7FA]"
              style={{
                fontSize: 13,
                fontWeight: locale === l ? 700 : 400,
                color: locale === l ? '#2F76BB' : '#555',
              }}
            >
              <FlagIcon locale={l} size={18} />
              <span className={`flex-1 ${resolvedAlign === 'left' ? 'text-right' : 'text-left'}`}>
                {LANG_NAMES[l]}
              </span>
              {locale === l && <Check size={14} color="#2F76BB" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
