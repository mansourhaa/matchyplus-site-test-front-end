'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import { ChevronLeft, ChevronRight, Globe, HelpCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { LangPickerLight } from './lang-picker-light';

type OnboardingPresentationProps = {
  onComplete: () => void;
};

type SlideConfig = {
  id: string;
  badgeKey: string;
  titleKey: string;
  descKey: string;
  badgeBg: string;
  badgeColor: string;
  cardBg: string;
  graphic: ReactNode;
};

const LANG_DETAILS: Record<Locale, { country: string; label: string }> = {
  en: { country: 'GB', label: 'EN' },
  fr: { country: 'FR', label: 'FR' },
  ar: { country: 'TN', label: 'AR' },
};

function PanelLangPicker() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const current = LANG_DETAILS[locale] ?? { country: 'GB', label: 'EN' };

  return (
    <div className="relative z-50" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Select language"
        className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs transition hover:bg-white/20"
      >
        <Globe size={14} className="text-white/80" />
        <span>
          {current.country} {current.label}
        </span>
      </button>

      {open && (
        <div className="absolute top-9 right-0 w-32 overflow-hidden rounded-xl border border-slate-100 bg-white p-1 text-slate-800 shadow-xl">
          {(['en', 'fr', 'ar'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                locale === l ? 'bg-blue-50 font-bold text-blue-600' : 'hover:bg-slate-50'
              }`}
            >
              <span>{l === 'en' ? 'English' : l === 'fr' ? 'Français' : 'العربية'}</span>
              <span className="text-[10px] text-slate-400 uppercase">{l}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchingGraphic() {
  return (
    <svg
      viewBox="0 0 320 200"
      className="drop-shadow-2xs h-full max-h-48 w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Matching Illustration"
    >
      {/* Decorative background dots */}
      <circle cx="85" cy="40" r="4.5" fill="#CBD5E1" opacity="0.7" />
      <circle cx="235" cy="38" r="5" fill="#A7F3D0" opacity="0.8" />
      <circle cx="160" cy="155" r="4.5" fill="#F59E0B" />

      {/* Left Avatar (Blue) */}
      <circle cx="75" cy="90" r="14" fill="#2F76BB" />
      <path
        d="M52 128 C52 108 98 108 98 128"
        stroke="#2F76BB"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Right Avatar (Teal) */}
      <circle cx="245" cy="90" r="14" fill="#48BBA0" />
      <path
        d="M222 128 C222 108 268 108 268 128"
        stroke="#48BBA0"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Connecting Curved Arrows */}
      <path
        d="M86 85 Q108 65 118 70"
        stroke="#2F76BB"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M202 105 Q218 115 234 100"
        stroke="#2F76BB"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Central Speech Bubble */}
      <rect
        x="122"
        y="58"
        width="76"
        height="48"
        rx="10"
        fill="#FFFFFF"
        stroke="#2F76BB"
        strokeWidth="2.5"
      />
      {/* Bubble pointer */}
      <path
        d="M136 106 L130 116 L144 106"
        fill="#FFFFFF"
        stroke="#2F76BB"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Lines inside bubble */}
      <line
        x1="136"
        y1="74"
        x2="184"
        y2="74"
        stroke="#2F76BB"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="136"
        y1="86"
        x2="168"
        y2="86"
        stroke="#2F76BB"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExploreGraphic() {
  return (
    <svg
      viewBox="0 0 320 200"
      className="drop-shadow-2xs h-full max-h-48 w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Explore Illustration"
    >
      {/* Browser / App Window Card */}
      <rect
        x="45"
        y="22"
        width="230"
        height="145"
        rx="18"
        fill="#FFFFFF"
        stroke="#E2E8F0"
        strokeWidth="2"
      />

      {/* Top Header Window Dots */}
      <circle cx="65" cy="38" r="4" fill="#F87171" />
      <circle cx="77" cy="38" r="4" fill="#FBBF24" />
      <circle cx="89" cy="38" r="4" fill="#34D399" />

      {/* Left Profile Section */}
      <rect x="62" y="52" width="94" height="60" rx="10" fill="#EEF5FF" />
      <circle cx="109" cy="74" r="12" fill="#3B82F6" />
      <path
        d="M93 102 C93 88 125 88 125 102"
        stroke="#3B82F6"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Right Content Section: Two Tiles */}
      <rect x="164" y="52" width="94" height="27" rx="8" fill="#D1FAE5" />
      <circle cx="211" cy="65.5" r="6" fill="#34D399" />

      <rect x="164" y="85" width="94" height="27" rx="8" fill="#FEF3C7" />
      <circle cx="211" cy="98.5" r="6" fill="#F59E0B" />

      {/* Bottom Floating Control Dock */}
      <rect
        x="62"
        y="122"
        width="196"
        height="32"
        rx="16"
        fill="#FFFFFF"
        stroke="#E2E8F0"
        strokeWidth="1.5"
      />
      {/* Call Button */}
      <circle cx="95" cy="138" r="10" fill="#E6F7F2" stroke="#2E9D82" strokeWidth="1.5" />
      <path
        d="M92 135 C92 139 95 142 99 142"
        stroke="#2E9D82"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Video Button */}
      <circle cx="160" cy="138" r="10" fill="#EEF5FF" stroke="#2F76BB" strokeWidth="1.5" />
      <rect x="155" y="134" width="7" height="8" rx="1" fill="#2F76BB" />
      <path d="M162 136 L166 134 L166 142 L162 140 Z" fill="#2F76BB" />
      {/* Mic Button */}
      <circle cx="225" cy="138" r="10" fill="#FFF8EC" stroke="#E08712" strokeWidth="1.5" />
      <rect x="223" y="133" width="4" height="7" rx="2" fill="#E08712" />
      <path
        d="M221 137 C221 140 229 140 229 137"
        stroke="#E08712"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CareerGraphic() {
  return (
    <svg
      viewBox="0 0 320 200"
      className="drop-shadow-2xs h-full max-h-48 w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Career Illustration"
    >
      {/* Left Card (Tilted left) */}
      <g transform="rotate(-6 100 95)">
        <rect
          x="65"
          y="40"
          width="90"
          height="115"
          rx="12"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="1.5"
        />
        <circle cx="110" cy="62" r="10" fill="#E2E8F0" />
        <rect x="80" y="82" width="60" height="4.5" rx="2" fill="#E2E8F0" />
        <rect x="85" y="93" width="50" height="3.5" rx="1.5" fill="#F1F5F9" />
        <rect x="80" y="102" width="60" height="3.5" rx="1.5" fill="#F1F5F9" />
      </g>

      {/* Right Card (Tilted right) */}
      <g transform="rotate(6 220 95)">
        <rect
          x="165"
          y="40"
          width="90"
          height="115"
          rx="12"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="1.5"
        />
        <circle cx="210" cy="62" r="10" fill="#CCFBF1" />
        <rect x="180" y="82" width="60" height="4.5" rx="2" fill="#CCFBF1" />
        <rect x="185" y="93" width="50" height="3.5" rx="1.5" fill="#F1F5F9" />
        <rect x="180" y="102" width="60" height="3.5" rx="1.5" fill="#F1F5F9" />
      </g>

      {/* Center Card (Front, upright) */}
      <rect
        x="108"
        y="30"
        width="104"
        height="128"
        rx="12"
        fill="#FFFFFF"
        stroke="#2F76BB"
        strokeWidth="2.2"
      />
      <circle cx="160" cy="54" r="11" fill="#2F76BB" />
      <path
        d="M148 76 C148 67 172 67 172 76"
        stroke="#2F76BB"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <line
        x1="124"
        y1="88"
        x2="196"
        y2="88"
        stroke="#48BBA0"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="124"
        y1="99"
        x2="190"
        y2="99"
        stroke="#CBD5E1"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="124"
        y1="110"
        x2="178"
        y2="110"
        stroke="#CBD5E1"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="124"
        y1="121"
        x2="196"
        y2="121"
        stroke="#CBD5E1"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Green Checkmark Badge overlay */}
      <circle cx="204" cy="144" r="16" fill="#48BBA0" stroke="#FFFFFF" strokeWidth="3" />
      <path
        d="M197 144 L202 149 L211 139"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OnboardingPresentation({ onComplete }: OnboardingPresentationProps) {
  const { t } = useI18n();
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const SLIDES: SlideConfig[] = [
    {
      id: 'matching',
      badgeKey: 'onboarding.intro.slide1Badge',
      titleKey: 'onboarding.intro.slide1Title',
      descKey: 'onboarding.intro.slide1Desc',
      badgeBg: '#EEF5FF',
      badgeColor: '#2F76BB',
      cardBg: '#F0F6FD',
      graphic: <MatchingGraphic />,
    },
    {
      id: 'explore',
      badgeKey: 'onboarding.intro.slide2Badge',
      titleKey: 'onboarding.intro.slide2Title',
      descKey: 'onboarding.intro.slide2Desc',
      badgeBg: '#EAF7F3',
      badgeColor: '#2E9D82',
      cardBg: '#EAF7F3',
      graphic: <ExploreGraphic />,
    },
    {
      id: 'career',
      badgeKey: 'onboarding.intro.slide3Badge',
      titleKey: 'onboarding.intro.slide3Title',
      descKey: 'onboarding.intro.slide3Desc',
      badgeBg: '#FFF8EC',
      badgeColor: '#D97706',
      cardBg: '#FFF8EC',
      graphic: <CareerGraphic />,
    },
  ];

  const totalSlides = SLIDES.length;
  const isLast = currentSlide === totalSlides - 1;
  const activeSlide = SLIDES[currentSlide];

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1));
    }
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (!isLast) setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1));
      } else if (e.key === 'ArrowLeft') {
        if (currentSlide > 0) setCurrentSlide((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, isLast, totalSlides]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  const stepText = t('onboarding.intro.stepIndicator', {
    step: currentSlide + 1,
    total: totalSlides,
  });

  return (
    <div
      className="flex min-h-screen w-full bg-white"
      style={{ fontFamily: "'Baloo 2', sans-serif" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Left Brand Panel (Desktop) */}
      <aside
        className="relative hidden shrink-0 flex-col justify-between overflow-hidden p-8 md:flex md:w-[420px] lg:w-[460px]"
        style={{
          background: 'linear-gradient(160deg, #0f4c8a 0%, #2F76BB 45%, #61BCA6 100%)',
        }}
      >
        {/* Subtle dot matrix texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Panel Header */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-2xl font-black tracking-tight text-white">Matchy+</span>
          <PanelLangPicker />
        </div>

        {/* Panel Content (Mirrors the active slide) */}
        <div className="relative z-10 my-auto py-8">
          <p className="mb-3 text-xs font-bold tracking-widest text-[#93c5fd] uppercase">
            {stepText}
          </p>
          <h2 className="mb-4 text-3xl leading-tight font-extrabold text-white">
            {t(activeSlide.titleKey)}
          </h2>
          <p className="mb-8 max-w-xs text-sm leading-relaxed text-white/80">
            {t(activeSlide.descKey)}
          </p>

          {/* Dots Indicator */}
          <div className="mb-8 flex items-center gap-2">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                data-testid={`onboarding-dot-${idx}`}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-300 ${
                  idx === currentSlide
                    ? 'h-2 w-7 rounded-full bg-white'
                    : 'h-2 w-2 rounded-full bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onComplete}
              data-testid="onboarding-intro-skip"
              className="flex h-11 min-w-[92px] items-center justify-center rounded-2xl border border-white/50 bg-white/20 px-5 text-sm font-semibold text-white shadow-xs backdrop-blur-xs transition hover:bg-white/30"
            >
              {t('onboarding.intro.skip')}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="flex h-11 min-w-[185px] items-center justify-center gap-1.5 rounded-2xl bg-white px-8 text-sm font-bold text-[#2F76BB] shadow-md transition hover:bg-white/95"
            >
              <span>{isLast ? t('onboarding.intro.signIn') : t('onboarding.intro.next')}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Panel Footer */}
        <div className="relative z-10 text-xs text-white/40">
          © 2026 Matchy+ · Tous droits réservés
        </div>
      </aside>

      {/* Right Canvas (Mobile + Desktop Centerpiece) */}
      <main className="relative flex flex-1 flex-col justify-between overflow-y-auto bg-white p-6 sm:p-10 md:p-12">
        {/* Mobile Header (Brand + Lang + Skip) */}
        <header className="flex items-center justify-between pb-4 md:hidden">
          <span className="text-xl font-black text-[#2F76BB]">Matchy+</span>
          <div className="flex items-center gap-2">
            <LangPickerLight />
            <button
              type="button"
              onClick={onComplete}
              data-testid="onboarding-intro-skip-mobile"
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              {t('onboarding.intro.skip')}
            </button>
          </div>
        </header>

        {/* Desktop Content Header */}
        <div className="hidden items-center justify-between pb-4 md:flex">
          <span className="text-xs font-semibold text-slate-400">
            {t('onboarding.intro.discoverTitle')}
          </span>
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, idx) => (
              <span
                key={idx}
                className={`transition-all duration-300 ${
                  idx === currentSlide
                    ? 'h-1.5 w-6 rounded-full bg-[#2F76BB]'
                    : 'h-1.5 w-1.5 rounded-full bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Center Presentation Section */}
        <div className="mx-auto my-auto flex w-full max-w-xl flex-col items-center py-4 text-center sm:py-6">
          {/* Badge Pill */}
          <span
            className="mb-5 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold tracking-wide"
            style={{
              backgroundColor: activeSlide.badgeBg,
              color: activeSlide.badgeColor,
            }}
          >
            {t(activeSlide.badgeKey)}
          </span>

          {/* Illustration Container */}
          <div
            className="mb-6 flex aspect-[16/11] w-full max-w-lg items-center justify-center rounded-3xl border border-slate-100/60 p-6 shadow-2xs transition-all duration-300"
            style={{ backgroundColor: activeSlide.cardBg }}
          >
            {activeSlide.graphic}
          </div>

          {/* Heading */}
          <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-[#1A1A2E] sm:text-3xl">
            {t(activeSlide.titleKey)}
          </h1>

          {/* Subtitle */}
          <p className="max-w-md text-sm leading-relaxed text-slate-500 sm:text-base">
            {t(activeSlide.descKey)}
          </p>
        </div>

        {/* Bottom Action Row */}
        <footer className="mx-auto flex w-full max-w-xl items-center gap-3 pt-6">
          {currentSlide > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              aria-label={t('onboarding.intro.back')}
              data-testid="onboarding-intro-prev"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            data-testid="onboarding-intro-next"
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl px-8 text-base font-bold text-white shadow-md transition hover:opacity-95 active:scale-[0.99]"
            style={{
              background: 'linear-gradient(90deg, #48BBA0 0%, #2F76BB 100%)',
            }}
          >
            <span>{isLast ? t('onboarding.intro.signIn') : t('onboarding.intro.next')}</span>
            <ChevronRight size={18} />
          </button>
        </footer>

        {/* Floating Help Button */}
        <button
          type="button"
          aria-label="Help"
          className="fixed right-6 bottom-6 hidden h-9 w-9 items-center justify-center rounded-full bg-[#1E293B] text-white shadow-lg transition hover:bg-slate-800 sm:flex"
        >
          <HelpCircle size={16} />
        </button>
      </main>
    </div>
  );
}
