'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function FlagIcon({ locale, size = 15 }: { locale: Locale; size?: number }) {
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
    boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
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
  // ar — Tunisia flag strip
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

const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isRtl = locale === 'ar';

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div className="relative z-50" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 items-center gap-1.5 rounded-lg px-2 transition-all hover:bg-slate-100 active:scale-95"
        style={{ background: '#F5F7FA', border: '1px solid #E0E0E0' }}
        aria-label="Language selector"
      >
        <span
          style={{ fontSize: 11, fontWeight: 700, color: '#4A5568', textTransform: 'uppercase' }}
        >
          {locale}
        </span>
        <FlagIcon locale={locale} size={13} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={`absolute top-9 ${isRtl ? 'left-0' : 'right-0'} z-50 overflow-hidden rounded-xl shadow-xl`}
            style={{ background: 'white', border: '1px solid #E2E8F0', minWidth: 135 }}
            dir={isRtl ? 'rtl' : 'ltr'}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {(['fr', 'en', 'ar'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setLocale(l);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2.5 px-3 py-2 transition-colors hover:bg-[#F5F9FF]"
                style={{
                  fontSize: 12,
                  fontWeight: locale === l ? 700 : 500,
                  color: locale === l ? '#2F76BB' : '#4A5568',
                  background: locale === l ? '#EEF5FF' : 'transparent',
                }}
              >
                <div className="flex items-center gap-1.5">
                  {locale === l && <Check size={14} color="#2F76BB" />}
                  <span>{LOCALE_LABELS[l]}</span>
                </div>
                <FlagIcon locale={l} size={13} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
