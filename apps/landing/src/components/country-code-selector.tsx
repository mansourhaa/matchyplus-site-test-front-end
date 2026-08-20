'use client';

import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type CountryCodeOption = {
  code: string;
  dialCode: string;
  flag: string;
  name: { fr: string; en: string; ar: string };
};

export const POPULAR_COUNTRIES: CountryCodeOption[] = [
  { code: 'TN', dialCode: '+216', flag: '🇹🇳', name: { fr: 'Tunisie', en: 'Tunisia', ar: 'تونس' } },
  { code: 'FR', dialCode: '+33', flag: '🇫🇷', name: { fr: 'France', en: 'France', ar: 'فرنسا' } },
  {
    code: 'DZ',
    dialCode: '+213',
    flag: '🇩🇿',
    name: { fr: 'Algérie', en: 'Algeria', ar: 'الجزائر' },
  },
  { code: 'MA', dialCode: '+212', flag: '🇲🇦', name: { fr: 'Maroc', en: 'Morocco', ar: 'المغرب' } },
  {
    code: 'SN',
    dialCode: '+221',
    flag: '🇸🇳',
    name: { fr: 'Sénégal', en: 'Senegal', ar: 'السنغال' },
  },
  {
    code: 'CI',
    dialCode: '+225',
    flag: '🇨🇮',
    name: { fr: "Côte d'Ivoire", en: 'Ivory Coast', ar: 'ساحل العاج' },
  },
  { code: 'LY', dialCode: '+218', flag: '🇱🇾', name: { fr: 'Libye', en: 'Libya', ar: 'ليبيا' } },
  { code: 'EG', dialCode: '+20', flag: '🇪🇬', name: { fr: 'Égypte', en: 'Egypt', ar: 'مصر' } },
  {
    code: 'AE',
    dialCode: '+971',
    flag: '🇦🇪',
    name: { fr: 'Émirats arabes unis', en: 'United Arab Emirates', ar: 'الإمارات' },
  },
  {
    code: 'SA',
    dialCode: '+966',
    flag: '🇸🇦',
    name: { fr: 'Arabie saoudite', en: 'Saudi Arabia', ar: 'السعودية' },
  },
  { code: 'QA', dialCode: '+974', flag: '🇶🇦', name: { fr: 'Qatar', en: 'Qatar', ar: 'قطر' } },
  {
    code: 'US',
    dialCode: '+1',
    flag: '🇺🇸',
    name: { fr: 'États-Unis', en: 'United States', ar: 'الولايات المتحدة' },
  },
  { code: 'CA', dialCode: '+1', flag: '🇨🇦', name: { fr: 'Canada', en: 'Canada', ar: 'كندا' } },
  {
    code: 'GB',
    dialCode: '+44',
    flag: '🇬🇧',
    name: { fr: 'Royaume-Uni', en: 'United Kingdom', ar: 'المملكة المتحدة' },
  },
  {
    code: 'DE',
    dialCode: '+49',
    flag: '🇩🇪',
    name: { fr: 'Allemagne', en: 'Germany', ar: 'ألمانيا' },
  },
  { code: 'IT', dialCode: '+39', flag: '🇮🇹', name: { fr: 'Italie', en: 'Italy', ar: 'إيطاليا' } },
  { code: 'ES', dialCode: '+34', flag: '🇪🇸', name: { fr: 'Espagne', en: 'Spain', ar: 'إسبانيا' } },
  {
    code: 'BE',
    dialCode: '+32',
    flag: '🇧🇪',
    name: { fr: 'Belgique', en: 'Belgium', ar: 'بلجيكا' },
  },
  {
    code: 'CH',
    dialCode: '+41',
    flag: '🇨🇭',
    name: { fr: 'Suisse', en: 'Switzerland', ar: 'سويسرا' },
  },
];

type Props = {
  value: string;
  onChange: (dialCode: string) => void;
  locale?: 'fr' | 'en' | 'ar';
  disabled?: boolean;
};

export function CountryCodeSelector({ value, onChange, locale = 'fr', disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = POPULAR_COUNTRIES.find((c) => c.dialCode === value) ?? POPULAR_COUNTRIES[0]!;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const filtered = POPULAR_COUNTRIES.filter((c) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    const nameStr = (c.name[locale] || c.name.fr).toLowerCase();
    return (
      nameStr.includes(term) || c.dialCode.includes(term) || c.code.toLowerCase().includes(term)
    );
  });

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Select country code"
        className={`flex h-[46px] cursor-pointer items-center gap-1.5 rounded-xl border bg-neutral-50/70 px-3 text-sm font-semibold text-neutral-800 transition-all select-none focus:bg-white focus:outline-none ${
          open
            ? 'border-brand-teal ring-brand-teal/20 bg-white ring-2'
            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100/60'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="font-mono text-xs font-bold text-neutral-900">{selected.dialCode}</span>
        <ChevronDown
          size={14}
          className={`text-neutral-400 transition-transform duration-200 ${
            open ? 'text-brand-teal rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="animate-in fade-in-0 zoom-in-95 absolute top-[calc(100%+6px)] left-0 z-50 w-64 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-2xl duration-150">
          <div className="border-b border-neutral-100 p-2">
            <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-500">
              <Search size={14} className="shrink-0 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  locale === 'ar'
                    ? 'ابحث عن بلد...'
                    : locale === 'en'
                      ? 'Search country...'
                      : 'Rechercher un pays...'
                }
                className="w-full bg-transparent text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto p-1 text-sm">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-neutral-400">
                {locale === 'ar'
                  ? 'لا توجد نتائج'
                  : locale === 'en'
                    ? 'No results found'
                    : 'Aucun pays trouvé'}
              </p>
            ) : (
              filtered.map((country) => {
                const isSelected =
                  country.dialCode === selected.dialCode && country.code === selected.code;
                const countryName = country.name[locale] || country.name.fr;
                return (
                  <button
                    key={`${country.code}-${country.dialCode}`}
                    type="button"
                    onClick={() => {
                      onChange(country.dialCode);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-brand-teal/10 text-brand-teal font-bold'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{country.flag}</span>
                      <span className="max-w-[130px] truncate">{countryName}</span>
                    </span>
                    <span className="font-mono text-xs font-semibold text-neutral-500">
                      {country.dialCode}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
