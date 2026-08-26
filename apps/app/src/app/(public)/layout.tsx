'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { MatchyLogo } from '@/features/auth/components/matchy-logo';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import { ChevronDown, Globe, LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const LANGUAGES: { code: Locale; label: string; full: string }[] = [
  { code: 'fr', label: 'FR', full: 'Français' },
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'ar', label: 'عربي', full: 'العربية' },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { locale, setLocale, t, dir } = useI18n();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]" dir={dir}>
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-8">
          <Link href="/login" className="flex items-center gap-2">
            <MatchyLogo size="md" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language Selector Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-bold text-[#334155] shadow-2xs transition-colors hover:bg-[#F1F5F9] active:scale-95"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <Globe size={14} className="text-[#64748B]" />
                <span>{activeLang.label}</span>
                <ChevronDown
                  size={13}
                  className={`text-[#94A3B8] transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {dropdownOpen && (
                <div
                  className="animate-in fade-in zoom-in-95 absolute right-0 z-50 mt-1.5 w-36 rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-lg"
                  style={{ minWidth: '8.5rem' }}
                >
                  {LANGUAGES.map((lang) => {
                    const isSelected = locale === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setLocale(lang.code);
                          setDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-[#F0F7FF] font-bold text-[#2F76BB]'
                            : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#1E293B]'
                        }`}
                      >
                        <span>{lang.full}</span>
                        <span
                          className={`text-[10px] uppercase ${
                            isSelected ? 'font-bold text-[#2F76BB]' : 'text-[#94A3B8]'
                          }`}
                        >
                          {lang.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Navigation Actions */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-[#2F76BB] transition-colors hover:bg-[#F0F7FF]"
            >
              <LogIn size={14} />
              <span>{t('legal.quickActionLogin')}</span>
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-95"
              style={{ background: matchyBrand.gradient }}
            >
              <UserPlus size={14} />
              <span>{t('legal.quickActionRegister')}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8 sm:py-10">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-xs text-[#888] sm:flex-row sm:px-8">
          <p>{t('legal.allRightsReserved', { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-6 font-semibold">
            <Link href="/terms-of-service" className="hover:text-[#2F76BB] hover:underline">
              {t('legal.termsOfService')}
            </Link>
            <Link href="/privacy-policy" className="hover:text-[#2F76BB] hover:underline">
              {t('legal.privacyPolicy')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
