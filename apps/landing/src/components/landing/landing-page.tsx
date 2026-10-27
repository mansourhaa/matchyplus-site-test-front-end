'use client';

import { ImageWithFallback } from '@/components/landing/image-with-fallback';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { Locale } from '@/features/i18n/messages';
import { ChevronDown, ChevronRight, Clock, MapPin, Shield, Sparkles, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@saas-boilerplate/ui/components/button';
import { Card, CardContent } from '@saas-boilerplate/ui/components/card';

const LOGO_SRC = '/logo-matchy.svg';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

const goToApp = (path: string) => {
  window.location.href = `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

const LANGUAGE_FLAGS: Record<Locale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  ar: '🇹🇳',
};

export default function LandingPage() {
  const { locale, setLocale, t, dir } = useI18n();
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const goRegister = () => goToApp('/inscription');

  const handleLanguageChange = (lang: Locale) => {
    setLocale(lang);
    setLanguageMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#F5F7FA', direction: dir }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <img src={LOGO_SRC} alt={t('landing.logoAlt')} className="h-6" />
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div ref={languageMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setLanguageMenuOpen((value) => !value)}
                className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200"
              >
                <span aria-hidden="true">{LANGUAGE_FLAGS[locale]}</span>

                <ChevronDown
                  className={`h-4 w-4 transition-transform ${languageMenuOpen ? 'rotate-90' : 'rotate-0'}`}
                />
              </button>
              {languageMenuOpen && (
                <div className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-40 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                  {(['fr', 'en', 'ar'] as Locale[]).map((item) => {
                    const active = locale === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleLanguageChange(item)}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-[#F5F7FA]"
                        style={{
                          color: active ? '#2F76BB' : '#555',
                          fontWeight: active ? 700 : 500,
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <span>{item.toUpperCase()}</span>
                        </span>
                        {active && <span className="h-2 w-2 rounded-full bg-[#61BCA6]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <Button
              onClick={() => goToApp('/connexion')}
              className="bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] hover:opacity-90"
            >
              {t('landing.getStarted')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(97,188,166,0.1)_0%,transparent_50%),radial-gradient(circle_at_70%_80%,rgba(47,118,187,0.1)_0%,transparent_50%)]"></div>

        <div className="relative mx-auto max-w-7xl px-4 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] px-4 py-2 text-sm font-medium text-white">
                <Sparkles className="h-4 w-4" />
                <span>{t('landing.trustedByThousands')}</span>
              </div>
              <h1 className="text-5xl leading-tight font-bold text-gray-900 md:text-6xl lg:text-7xl">
                {t('landing.heroTitle')}
              </h1>
              <p className="text-xl leading-relaxed text-gray-600">{t('landing.heroSubtitle')}</p>
              <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row lg:justify-start">
                <Button
                  size="lg"
                  onClick={goRegister}
                  className="bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] px-8 text-lg hover:opacity-90"
                >
                  {t('landing.findProfessional')}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={goRegister}
                  className="border-2 border-[#2F76BB] px-8 text-lg text-[#2F76BB] hover:bg-[#2F76BB] hover:text-white"
                >
                  {t('landing.joinAsProfessional')}
                </Button>
              </div>

              {/* Stats */}
              {/* <div className="flex flex-wrap justify-center lg:justify-start gap-8 pt-8">
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-bold text-[#2F76BB]">10,000+</div>
                  <div className="text-sm text-gray-600">Active Professionals</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-bold text-[#2F76BB]">50,000+</div>
                  <div className="text-sm text-gray-600">Happy Clients</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="flex items-center gap-1">
                    <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                    <span className="text-3xl font-bold text-[#2F76BB]">4.9</span>
                  </div>
                  <div className="text-sm text-gray-600">Average Rating</div>
                </div>
              </div> */}
            </div>

            {/* Hero Image Grid */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="transform overflow-hidden rounded-2xl shadow-xl transition-transform duration-300 hover:scale-105">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1761666519794-ad6fbcef058b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
                      alt={t('landing.communityAlt')}
                      className="h-64 w-full object-cover"
                    />
                  </div>
                  <div className="transform overflow-hidden rounded-2xl shadow-xl transition-transform duration-300 hover:scale-105">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1758524055098-071470ae15b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
                      alt={t('landing.gardenerAlt')}
                      className="h-48 w-full object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="transform overflow-hidden rounded-2xl shadow-xl transition-transform duration-300 hover:scale-105">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1697906100384-375b3390e8f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
                      alt={t('landing.nannyAlt')}
                      className="h-48 w-full object-cover"
                    />
                  </div>
                  <div className="transform overflow-hidden rounded-2xl shadow-xl transition-transform duration-300 hover:scale-105">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1647989015474-67ec5dad81f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
                      alt={t('landing.tunisiaAlt')}
                      className="h-64 w-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Floating Card */}
              {/* <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-2xl p-4 flex items-center gap-3 z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] rounded-full flex items-center justify-center">
                  <Heart className="h-6 w-6 text-white fill-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Trusted Platform</div>
                  <div className="text-sm text-gray-600">Safe & Verified</div>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold md:text-5xl">{t('landing.whyChoose')}</h2>
          <div className="mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-[#61BCA6] to-[#2F76BB]"></div>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card className="group border-2 transition-all duration-300 hover:-translate-y-2 hover:border-[#61BCA6] hover:shadow-xl">
            <CardContent className="space-y-4 pt-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] shadow-lg transition-transform duration-300 group-hover:scale-110">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold">{t('landing.locationMatching')}</h3>
              <p className="text-gray-600">{t('landing.locationDesc')}</p>
            </CardContent>
          </Card>

          <Card className="group border-2 transition-all duration-300 hover:-translate-y-2 hover:border-[#61BCA6] hover:shadow-xl">
            <CardContent className="space-y-4 pt-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] shadow-lg transition-transform duration-300 group-hover:scale-110">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold">{t('landing.verifiedProfiles')}</h3>
              <p className="text-gray-600">{t('landing.verifiedDesc')}</p>
            </CardContent>
          </Card>

          <Card className="group border-2 transition-all duration-300 hover:-translate-y-2 hover:border-[#61BCA6] hover:shadow-xl">
            <CardContent className="space-y-4 pt-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] shadow-lg transition-transform duration-300 group-hover:scale-110">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold">{t('landing.wideRange')}</h3>
              <p className="text-gray-600">{t('landing.wideRangeDesc')}</p>
            </CardContent>
          </Card>

          <Card className="group border-2 transition-all duration-300 hover:-translate-y-2 hover:border-[#61BCA6] hover:shadow-xl">
            <CardContent className="space-y-4 pt-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] shadow-lg transition-transform duration-300 group-hover:scale-110">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold">{t('landing.quickEasy')}</h3>
              <p className="text-gray-600">{t('landing.quickEasyDesc')}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative scroll-mt-24 overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50"></div>
        <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-[#61BCA6]/5 blur-3xl"></div>
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#2F76BB]/5 blur-3xl"></div>

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">{t('landing.howItWorks')}</h2>
            <div className="mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-[#61BCA6] to-[#2F76BB]"></div>
          </div>
          <div className="relative grid gap-12 md:grid-cols-3">
            {/* Connecting Lines */}
            <div className="absolute top-8 right-0 left-0 hidden h-0.5 bg-gradient-to-r from-[#61BCA6] via-[#2F76BB] to-[#61BCA6] opacity-20 md:block"></div>

            <div className="relative space-y-4 rounded-2xl bg-white p-8 text-center shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] text-3xl font-bold text-white shadow-xl">
                1
              </div>
              <h3 className="text-2xl font-semibold">{t('landing.step1Title')}</h3>
              <p className="text-gray-600">{t('landing.step1Desc')}</p>
            </div>

            <div className="relative space-y-4 rounded-2xl bg-white p-8 text-center shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] text-3xl font-bold text-white shadow-xl">
                2
              </div>
              <h3 className="text-2xl font-semibold">{t('landing.step2Title')}</h3>
              <p className="text-gray-600">{t('landing.step2Desc')}</p>
            </div>

            <div className="relative space-y-4 rounded-2xl bg-white p-8 text-center shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] text-3xl font-bold text-white shadow-xl">
                3
              </div>
              <h3 className="text-2xl font-semibold">{t('landing.step3Title')}</h3>
              <p className="text-gray-600">{t('landing.step3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold md:text-5xl">{t('landing.ourServices')}</h2>
          <div className="mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-[#61BCA6] to-[#2F76BB]"></div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: t('landing.nannies'),
              description: t('landing.nanniesDesc'),
              image:
                'https://images.unsplash.com/photo-1697906100384-375b3390e8f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
              gradient: 'from-pink-500 to-rose-500',
            },
            {
              title: t('landing.gardeners'),
              description: t('landing.gardenersDesc'),
              image:
                'https://images.unsplash.com/photo-1758524055098-071470ae15b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
              gradient: 'from-green-500 to-emerald-500',
            },
            {
              title: t('landing.drivers'),
              description: t('landing.driversDesc'),
              image:
                'https://images.unsplash.com/photo-1582834202430-ddcd18987a61?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
              gradient: 'from-blue-500 to-cyan-500',
            },
            {
              title: t('landing.cleaners'),
              description: t('landing.cleanersDesc'),
              image:
                'https://images.unsplash.com/photo-1628869198803-37acd8bba6f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
              gradient: 'from-purple-500 to-violet-500',
            },
            {
              title: t('landing.cooks'),
              description: t('landing.cooksDesc'),
              image:
                'https://images.unsplash.com/photo-1647989015474-67ec5dad81f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
              gradient: 'from-orange-500 to-amber-500',
            },
            {
              title: t('landing.caregivers'),
              description: t('landing.caregiversDesc'),
              image:
                'https://images.unsplash.com/photo-1761666519794-ad6fbcef058b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
              gradient: 'from-teal-500 to-cyan-500',
            },
          ].map((service) => (
            <Card
              key={service.title}
              className="group overflow-hidden border-0 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="relative h-48 overflow-hidden">
                <ImageWithFallback
                  src={service.image}
                  alt={service.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-20 transition-opacity group-hover:opacity-30`}
                ></div>
              </div>
              <CardContent className="pt-6">
                <h3 className="mb-2 text-xl font-semibold">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-16">
        <div className="absolute inset-0 bg-gradient-to-br from-[#61BCA6] via-[#2F76BB] to-[#1e5a8f]"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 h-32 w-32 rounded-full bg-white blur-3xl"></div>
          <div className="absolute right-10 bottom-10 h-40 w-40 rounded-full bg-white blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-white blur-3xl"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl space-y-8 px-4 text-center text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            <span>{t('landing.joinOurCommunity')}</span>
          </div>
          <h2 className="text-4xl leading-tight font-bold md:text-5xl">
            {t('landing.readyToStart')}
          </h2>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed opacity-95">
            {t('landing.readyDesc')}
          </p>
          <div className="pt-2">
            <Button
              size="lg"
              variant="secondary"
              onClick={goRegister}
              className="bg-white px-10 py-6 text-lg font-bold text-[#2F76BB] shadow-xl hover:bg-gray-100"
            >
              {t('landing.joinToday')}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <LandingFooter
        translations={{
          footerDesc: t('landing.footerDesc'),
          quickLinks: t('landing.quickLinks'),
          howItWorksLink: t('landing.howItWorksLink'),
          ourServicesLink: t('landing.ourServicesLink'),
          legal: t('landing.legal'),
          privacy: t('landing.privacy'),
          terms: t('landing.terms'),
          safety: t('landing.safety'),
          allRights: t('landing.allRights'),
        }}
        onJoin={goRegister}
      />
    </div>
  );
}
