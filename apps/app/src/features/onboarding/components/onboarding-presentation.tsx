'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useI18n } from '@/features/i18n/i18n-provider';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { LangPickerLight } from './lang-picker-light';

type OnboardingPresentationProps = {
  onComplete: () => void;
};

type SlideConfig = {
  badgeKey: string;
  titleKey: string;
  descKey: string;
  point1Key: string;
  point2Key: string;
  icon: ReactNode;
  accentColor: string;
  gradient: string;
  illustrationBg: string;
};

export function OnboardingPresentation({ onComplete }: OnboardingPresentationProps) {
  const { t } = useI18n();
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const SLIDES: SlideConfig[] = [
    {
      badgeKey: 'onboarding.intro.slide1Badge',
      titleKey: 'onboarding.intro.slide1Title',
      descKey: 'onboarding.intro.slide1Desc',
      point1Key: 'onboarding.intro.slide1Point1',
      point2Key: 'onboarding.intro.slide1Point2',
      icon: <Compass size={38} className="text-white" strokeWidth={2.2} />,
      accentColor: '#3179BF',
      gradient: 'linear-gradient(135deg, #3179BF 0%, #48BBA0 100%)',
      illustrationBg: '#EEF5FF',
    },
    {
      badgeKey: 'onboarding.intro.slide2Badge',
      titleKey: 'onboarding.intro.slide2Title',
      descKey: 'onboarding.intro.slide2Desc',
      point1Key: 'onboarding.intro.slide2Point1',
      point2Key: 'onboarding.intro.slide2Point2',
      icon: <ShieldCheck size={38} className="text-white" strokeWidth={2.2} />,
      accentColor: '#48BBA0',
      gradient: 'linear-gradient(135deg, #48BBA0 0%, #2F76BB 100%)',
      illustrationBg: '#E8F7F3',
    },
    {
      badgeKey: 'onboarding.intro.slide3Badge',
      titleKey: 'onboarding.intro.slide3Title',
      descKey: 'onboarding.intro.slide3Desc',
      point1Key: 'onboarding.intro.slide3Point1',
      point2Key: 'onboarding.intro.slide3Point2',
      icon: <MessageSquare size={36} className="text-white" strokeWidth={2.2} />,
      accentColor: '#3179BF',
      gradient: 'linear-gradient(135deg, #3179BF 0%, #61BCA6 100%)',
      illustrationBg: '#EEF5FF',
    },
    {
      badgeKey: 'onboarding.intro.slide4Badge',
      titleKey: 'onboarding.intro.slide4Title',
      descKey: 'onboarding.intro.slide4Desc',
      point1Key: 'onboarding.intro.slide4Point1',
      point2Key: 'onboarding.intro.slide4Point2',
      icon: <Briefcase size={36} className="text-white" strokeWidth={2.2} />,
      accentColor: '#F5A623',
      gradient: 'linear-gradient(135deg, #F5A623 0%, #3179BF 100%)',
      illustrationBg: '#FFF8EB',
    },
  ];

  const totalSlides = SLIDES.length;
  const isLast = currentSlide === totalSlides - 1;
  const activeConfig = SLIDES[currentSlide];

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
      if (diff > 0) {
        // Swipe left -> next
        handleNext();
      } else {
        // Swipe right -> prev
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="flex min-h-screen flex-col justify-between px-4 py-6 md:px-8 md:py-8"
      style={{ background: '#F8FAFC' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top Header */}
      <header className="mx-auto flex w-full max-w-xl items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-2xl font-black tracking-tight"
            style={{
              background: matchyBrand.gradient135,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Matchy+
          </span>
        </div>

        <div className="flex items-center gap-3">
          <LangPickerLight />
          <button
            type="button"
            onClick={onComplete}
            data-testid="onboarding-intro-skip"
            className="rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-colors hover:bg-slate-100"
            style={{ color: '#64748B' }}
          >
            {t('onboarding.intro.skip')}
          </button>
        </div>
      </header>

      {/* Main Slide Card */}
      <main className="mx-auto my-auto w-full max-w-md py-4">
        <div
          role="region"
          aria-label={t(activeConfig.titleKey)}
          className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 md:p-8"
        >
          {/* Visual Icon Header */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div
              className="relative mb-5 flex h-24 w-24 items-center justify-center rounded-3xl shadow-lg transition-transform duration-300"
              style={{ background: activeConfig.gradient }}
            >
              <div
                className="absolute inset-0 rounded-3xl opacity-30 blur-md"
                style={{ background: activeConfig.gradient }}
              />
              <div className="relative z-10">{activeConfig.icon}</div>
              <div className="absolute -top-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-xs">
                <Sparkles size={14} style={{ color: activeConfig.accentColor }} />
              </div>
            </div>

            {/* Category Badge */}
            <span
              className="mb-2.5 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase shadow-2xs"
              style={{
                backgroundColor: activeConfig.illustrationBg,
                color: activeConfig.accentColor,
              }}
            >
              {t(activeConfig.badgeKey)}
            </span>

            {/* Title */}
            <h1 className="text-xl font-extrabold tracking-tight text-[#1A1A2E] md:text-2xl">
              {t(activeConfig.titleKey)}
            </h1>

            {/* Description */}
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{t(activeConfig.descKey)}</p>
          </div>

          {/* Key Feature Bullets */}
          <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex items-start gap-2.5">
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0"
                style={{ color: activeConfig.accentColor }}
              />
              <span className="text-xs font-medium text-slate-700">
                {t(activeConfig.point1Key)}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0"
                style={{ color: activeConfig.accentColor }}
              />
              <span className="text-xs font-medium text-slate-700">
                {t(activeConfig.point2Key)}
              </span>
            </div>
          </div>
        </div>

        {/* Carousel Indicators */}
        <div
          role="tablist"
          aria-label="Onboarding slides"
          className="mt-6 flex items-center justify-center gap-2"
        >
          {SLIDES.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === currentSlide}
              aria-label={`Slide ${index + 1}`}
              data-testid={`onboarding-dot-${index}`}
              onClick={() => setCurrentSlide(index)}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: index === currentSlide ? 28 : 8,
                background: index === currentSlide ? matchyBrand.blue : '#CBD5E1',
              }}
            />
          ))}
        </div>
      </main>

      {/* Footer Navigation Buttons */}
      <footer className="mx-auto flex w-full max-w-md items-center justify-between gap-3 pt-4">
        {currentSlide > 0 ? (
          <button
            type="button"
            onClick={handlePrev}
            data-testid="onboarding-intro-prev"
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            <ChevronLeft size={18} />
            <span>{t('onboarding.intro.back')}</span>
          </button>
        ) : (
          <div className="w-16" />
        )}

        {isLast ? (
          <button
            type="button"
            onClick={onComplete}
            data-testid="onboarding-intro-start"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:brightness-105 active:scale-98"
            style={{ background: matchyBrand.gradient135 }}
          >
            <span>{t('onboarding.intro.start')}</span>
            <ArrowRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            data-testid="onboarding-intro-next"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:brightness-105 active:scale-98"
            style={{ background: matchyBrand.gradient135 }}
          >
            <span>{t('onboarding.intro.next')}</span>
            <ChevronRight size={18} />
          </button>
        )}
      </footer>
    </div>
  );
}
