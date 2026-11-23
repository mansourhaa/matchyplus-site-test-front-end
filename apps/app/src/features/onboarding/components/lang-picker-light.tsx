'use client';

import { FlagIcon } from '@/components/matchy/flag-icon';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const LANG_NAMES: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
};

type LangPickerLightProps = {
  menuAlign?: 'left' | 'right';
  /** Shows the language code next to the flag (« 🇹🇳 AR »), like the 2.0.8 header. */
  showCode?: boolean;
};

/** Matchy Inscription AuthLayout `LangPickerLight` — flag button + FR/EN/AR menu. */
export function LangPickerLight({ menuAlign, showCode = false }: LangPickerLightProps) {
  const { locale, setLocale, t } = useI18n();
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
        data-testid="lang-picker-button"
        className="flex items-center justify-center gap-2 rounded-xl transition-all"
        style={{
          background: '#F5F7FA',
          border: '1px solid #E0E0E0',
          minWidth: 44,
          height: 38,
          padding: showCode ? '0 12px' : undefined,
        }}
        title={t('common.selectLanguage')}
        aria-label={t('common.selectLanguage')}
        aria-expanded={open}
      >
        <FlagIcon locale={locale} size={18} />
        {showCode && (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>
            {locale.toUpperCase()}
          </span>
        )}
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
