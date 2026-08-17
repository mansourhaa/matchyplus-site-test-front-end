'use client';

import { FlagIcon } from '@/components/matchy/flag-icon';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
