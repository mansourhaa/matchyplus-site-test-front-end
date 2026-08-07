'use client';

import { ImageWithFallback } from '@/components/landing/image-with-fallback';
import { LandingFooter } from '@/components/landing/landing-footer';
import { ChevronDown, ChevronRight, Clock, MapPin, Shield, Sparkles, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@saas-boilerplate/ui/components/button';
import { Card, CardContent } from '@saas-boilerplate/ui/components/card';

const LOGO_SRC = '/logo-matchy.svg';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');

const goToApp = (path: string) => {
  window.location.href = `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

type Language = 'en' | 'fr' | 'ar';

const LANGUAGE_FLAGS: Record<Language, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  ar: '🇹🇳',
};

const translations = {
  en: {
    getStarted: 'Log in',
    heroTitle: 'Connect with Trusted Professionals Near You',
    heroSubtitle:
      "Tunisia's leading geolocation-based platform for finding reliable nannies, gardeners, drivers, and more",
    findProfessional: 'Find a Professional',
    joinAsProfessional: 'Join as a Professional',
    whyChoose: 'Why Choose Matchy+?',
    locationMatching: 'Location-Based Matching',
    locationDesc: 'Find professionals near you with our advanced geolocation technology',
    verifiedProfiles: 'Verified Profiles',
    verifiedDesc: 'All professionals are verified to ensure safety and reliability',
    wideRange: 'Wide Range of Services',
    wideRangeDesc: 'Nannies, gardeners, drivers, cleaners, and more professionals',
    quickEasy: 'Quick & Easy',
    quickEasyDesc: 'Post your needs and get matched with professionals in minutes',
    howItWorks: 'How It Works',
    step1Title: 'Create Your Profile',
    step1Desc:
      "Sign up and tell us what kind of professional you're looking for or the services you offer",
    step2Title: 'Get Matched',
    step2Desc: 'Our platform uses your location to connect you with nearby verified professionals',
    step3Title: 'Connect & Hire',
    step3Desc: 'Review profiles, communicate directly, and hire the perfect match for your needs',
    ourServices: 'Among the services',
    nannies: 'Nannies',
    nanniesDesc: 'Caring and experienced childcare professionals',
    gardeners: 'Gardeners',
    gardenersDesc: 'Expert garden maintenance and landscaping',
    drivers: 'Drivers',
    driversDesc: 'Professional and reliable drivers',
    cleaners: 'Cleaners',
    cleanersDesc: 'Thorough home and office cleaning services',
    cooks: 'Cooks',
    cooksDesc: 'Skilled chefs for home cooking',
    caregivers: 'Caregivers',
    caregiversDesc: 'Compassionate elderly and special needs care',
    readyToStart: 'Ready to Get Started?',
    readyDesc:
      'Join thousands of people across Tunisia who trust Matchy+ for their professional service needs',
    joinToday: 'Join Matchy+ Today',
    footerDesc: 'Connecting communities across Tunisia and Africa with trusted professionals',
    quickLinks: 'Explore',
    aboutUs: 'About Us',
    contact: 'Contact',
    legal: 'Legal',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    safety: 'Safety Guidelines',
    allRights: 'All rights reserved',
    trustedByThousands: 'Trusted by Thousands',
    joinOurCommunity: 'Join Our Community',
  },
  fr: {
    getStarted: 'Connexion',
    heroTitle: 'Connectez-vous avec des Professionnels de Confiance Près de Chez Vous',
    heroSubtitle:
      'La plateforme leader en Tunisie basée sur la géolocalisation pour trouver des nounous, jardiniers, chauffeurs fiables et plus',
    findProfessional: 'Trouver un Professionnel',
    joinAsProfessional: 'Rejoindre en tant que Professionnel',
    whyChoose: 'Pourquoi Choisir Matchy+?',
    locationMatching: 'Correspondance Basée sur la Localisation',
    locationDesc:
      'Trouvez des professionnels près de chez vous grâce à notre technologie de géolocalisation avancée',
    verifiedProfiles: 'Profils Vérifiés',
    verifiedDesc: 'Tous les professionnels sont vérifiés pour garantir sécurité et fiabilité',
    wideRange: 'Large Gamme de Services',
    wideRangeDesc: 'Nounous, jardiniers, chauffeurs, femmes de ménage et plus de professionnels',
    quickEasy: 'Rapide & Facile',
    quickEasyDesc:
      'Publiez vos besoins et soyez mis en relation avec des professionnels en quelques minutes',
    howItWorks: 'Comment Ça Marche',
    step1Title: 'Créez Votre Profil',
    step1Desc:
      'Inscrivez-vous et dites-nous quel type de professionnel vous recherchez ou les services que vous offrez',
    step2Title: 'Soyez Mis en Relation',
    step2Desc:
      'Notre plateforme utilise votre localisation pour vous connecter avec des professionnels vérifiés à proximité',
    step3Title: 'Connectez & Embauchez',
    step3Desc:
      'Consultez les profils, communiquez directement et embauchez la personne idéale pour vos besoins',
    ourServices: 'Parmi les services',
    nannies: 'Nounous',
    nanniesDesc: "Professionnels de garde d'enfants attentionnés et expérimentés",
    gardeners: 'Jardiniers',
    gardenersDesc: 'Experts en entretien de jardin et aménagement paysager',
    drivers: 'Chauffeurs',
    driversDesc: 'Chauffeurs professionnels et fiables',
    cleaners: 'Femmes de Ménage',
    cleanersDesc: 'Services de nettoyage complets pour maison et bureau',
    cooks: 'Cuisiniers',
    cooksDesc: 'Chefs qualifiés pour cuisine à domicile',
    caregivers: 'Aidants',
    caregiversDesc: 'Soins compatissants pour personnes âgées et besoins spéciaux',
    readyToStart: 'Prêt à Commencer?',
    readyDesc:
      'Rejoignez des milliers de personnes en Tunisie qui font confiance à Matchy+ pour leurs besoins en services professionnels',
    joinToday: "Rejoignez Matchy+ Aujourd'hui",
    footerDesc:
      'Connecter les communautés en Tunisie et en Afrique avec des professionnels de confiance',
    quickLinks: 'Explorer',
    aboutUs: 'À Propos',
    contact: 'Contact',
    legal: 'Légal',
    privacy: 'Politique de Confidentialité',
    terms: "Conditions d'Utilisation",
    safety: 'Directives de Sécurité',
    allRights: 'Tous droits réservés',
    trustedByThousands: 'Adopté par des milliers de personnes',
    joinOurCommunity: 'Rejoignez notre communauté',
  },
  ar: {
    getStarted: 'تسجيل الدخول',
    heroTitle: 'تواصل مع محترفين موثوقين بالقرب منك',
    heroSubtitle:
      'المنصة الرائدة في تونس  القائمة على تحديد الموقع الجغرافي للعثور على مربيات وبستانيين وسائقين موثوقين والمزيد',
    findProfessional: 'ابحث عن محترف',
    joinAsProfessional: 'انضم كمحترف',
    whyChoose: 'لماذا تختار Matchy+؟',
    locationMatching: 'المطابقة على أساس الموقع',
    locationDesc: 'اعثر على محترفين بالقرب منك باستخدام تقنية تحديد الموقع الجغرافي المتقدمة',
    verifiedProfiles: 'ملفات تعريف موثقة',
    verifiedDesc: 'يتم التحقق من جميع المحترفين لضمان السلامة والموثوقية',
    wideRange: 'مجموعة واسعة من الخدمات',
    wideRangeDesc: 'مربيات وبستانيون وسائقون وعمال نظافة والمزيد من المحترفين',
    quickEasy: 'سريع وسهل',
    quickEasyDesc: 'انشر احتياجاتك واحصل على مطابقة مع المحترفين في دقائق',
    howItWorks: 'كيف يعمل',
    step1Title: 'أنشئ ملفك الشخصي',
    step1Desc: 'سجل وأخبرنا عن نوع المحترف الذي تبحث عنه أو الخدمات التي تقدمها',
    step2Title: 'احصل على مطابقة',
    step2Desc: 'تستخدم منصتنا موقعك لربطك بمحترفين موثقين قريبين',
    step3Title: 'تواصل ووظف',
    step3Desc: 'راجع الملفات الشخصية وتواصل مباشرة ووظف المطابقة المثالية لاحتياجاتك',
    ourServices: 'من بين الخدمات',
    nannies: 'مربيات',
    nanniesDesc: 'محترفو رعاية الأطفال الحنونون وذوو الخبرة',
    gardeners: 'بستانيون',
    gardenersDesc: 'خبراء في صيانة الحدائق وتنسيق المناظر الطبيعية',
    drivers: 'سائقون',
    driversDesc: 'سائقون محترفون وموثوقون',
    cleaners: 'عمال نظافة',
    cleanersDesc: 'خدمات تنظيف شاملة للمنزل والمكتب',
    cooks: 'طهاة',
    cooksDesc: 'طهاة ماهرون للطبخ المنزلي',
    caregivers: 'مقدمو رعاية',
    caregiversDesc: 'رعاية رحيمة لكبار السن وذوي الاحتياجات الخاصة',
    readyToStart: 'مستعد للبدء؟',
    readyDesc:
      'انضم إلى آلاف الأشخاص في تونس  الذين يثقون في Matchy+ لتلبية احتياجاتهم من الخدمات المهنية',
    joinToday: 'انضم إلى Matchy+ اليوم',
    footerDesc: 'ربط المجتمعات في تونس وأفريقيا بمحترفين موثوقين',
    quickLinks: 'استكشف',
    aboutUs: 'من نحن',
    contact: 'اتصل',
    legal: 'قانوني',
    privacy: 'سياسة الخصوصية',
    terms: 'شروط الخدمة',
    safety: 'إرشادات السلامة',
    allRights: 'كل الحقوق محفوظة',
    trustedByThousands: 'موثوق من قبل الآلاف',
    joinOurCommunity: 'انضم إلى مجتمعنا',
  },
};

export default function LandingPage() {
  const [language, setLanguage] = useState<Language>('fr');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const t = translations[language];
  const goOnboarding = () => goToApp('/onboarding');

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
    <div
      className="size-full overflow-y-auto bg-gradient-to-b from-white to-gray-50"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <img src={LOGO_SRC} alt="Matchy+" className="h-6" />
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div ref={languageMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setLanguageMenuOpen((value) => !value)}
                className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200"
              >
                <span aria-hidden="true">{LANGUAGE_FLAGS[language]}</span>

                <ChevronDown
                  className={`h-4 w-4 transition-transform ${languageMenuOpen ? 'rotate-90' : 'rotate-0'}`}
                />
              </button>
              {languageMenuOpen && (
                <div className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-40 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                  {(['fr', 'en', 'ar'] as Language[]).map((item) => {
                    const active = language === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setLanguage(item);
                          setLanguageMenuOpen(false);
                        }}
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
              onClick={() => goToApp('/login')}
              className="bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] hover:opacity-90"
            >
              {t.getStarted}
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
                <span>{t.trustedByThousands}</span>
              </div>
              <h1 className="text-5xl leading-tight font-bold text-gray-900 md:text-6xl lg:text-7xl">
                {t.heroTitle}
              </h1>
              <p className="text-xl leading-relaxed text-gray-600">{t.heroSubtitle}</p>
              <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row lg:justify-start">
                <Button
                  size="lg"
                  onClick={goOnboarding}
                  className="bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] px-8 text-lg hover:opacity-90"
                >
                  {t.findProfessional}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={goOnboarding}
                  className="border-2 border-[#2F76BB] px-8 text-lg text-[#2F76BB] hover:bg-[#2F76BB] hover:text-white"
                >
                  {t.joinAsProfessional}
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
                      alt="Community"
                      className="h-64 w-full object-cover"
                    />
                  </div>
                  <div className="transform overflow-hidden rounded-2xl shadow-xl transition-transform duration-300 hover:scale-105">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1758524055098-071470ae15b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
                      alt="Gardener"
                      className="h-48 w-full object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="transform overflow-hidden rounded-2xl shadow-xl transition-transform duration-300 hover:scale-105">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1697906100384-375b3390e8f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
                      alt="Nanny"
                      className="h-48 w-full object-cover"
                    />
                  </div>
                  <div className="transform overflow-hidden rounded-2xl shadow-xl transition-transform duration-300 hover:scale-105">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1647989015474-67ec5dad81f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
                      alt="Tunisia"
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
          <h2 className="mb-4 text-4xl font-bold md:text-5xl">{t.whyChoose}</h2>
          <div className="mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-[#61BCA6] to-[#2F76BB]"></div>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card className="group border-2 transition-all duration-300 hover:-translate-y-2 hover:border-[#61BCA6] hover:shadow-xl">
            <CardContent className="space-y-4 pt-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] shadow-lg transition-transform duration-300 group-hover:scale-110">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold">{t.locationMatching}</h3>
              <p className="text-gray-600">{t.locationDesc}</p>
            </CardContent>
          </Card>

          <Card className="group border-2 transition-all duration-300 hover:-translate-y-2 hover:border-[#61BCA6] hover:shadow-xl">
            <CardContent className="space-y-4 pt-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] shadow-lg transition-transform duration-300 group-hover:scale-110">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold">{t.verifiedProfiles}</h3>
              <p className="text-gray-600">{t.verifiedDesc}</p>
            </CardContent>
          </Card>

          <Card className="group border-2 transition-all duration-300 hover:-translate-y-2 hover:border-[#61BCA6] hover:shadow-xl">
            <CardContent className="space-y-4 pt-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] shadow-lg transition-transform duration-300 group-hover:scale-110">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold">{t.wideRange}</h3>
              <p className="text-gray-600">{t.wideRangeDesc}</p>
            </CardContent>
          </Card>

          <Card className="group border-2 transition-all duration-300 hover:-translate-y-2 hover:border-[#61BCA6] hover:shadow-xl">
            <CardContent className="space-y-4 pt-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] shadow-lg transition-transform duration-300 group-hover:scale-110">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold">{t.quickEasy}</h3>
              <p className="text-gray-600">{t.quickEasyDesc}</p>
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
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">{t.howItWorks}</h2>
            <div className="mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-[#61BCA6] to-[#2F76BB]"></div>
          </div>
          <div className="relative grid gap-12 md:grid-cols-3">
            {/* Connecting Lines */}
            <div className="absolute top-8 right-0 left-0 hidden h-0.5 bg-gradient-to-r from-[#61BCA6] via-[#2F76BB] to-[#61BCA6] opacity-20 md:block"></div>

            <div className="relative space-y-4 rounded-2xl bg-white p-8 text-center shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] text-3xl font-bold text-white shadow-xl">
                1
              </div>
              <h3 className="text-2xl font-semibold">{t.step1Title}</h3>
              <p className="text-gray-600">{t.step1Desc}</p>
            </div>

            <div className="relative space-y-4 rounded-2xl bg-white p-8 text-center shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] text-3xl font-bold text-white shadow-xl">
                2
              </div>
              <h3 className="text-2xl font-semibold">{t.step2Title}</h3>
              <p className="text-gray-600">{t.step2Desc}</p>
            </div>

            <div className="relative space-y-4 rounded-2xl bg-white p-8 text-center shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] text-3xl font-bold text-white shadow-xl">
                3
              </div>
              <h3 className="text-2xl font-semibold">{t.step3Title}</h3>
              <p className="text-gray-600">{t.step3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold md:text-5xl">{t.ourServices}</h2>
          <div className="mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-[#61BCA6] to-[#2F76BB]"></div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: t.nannies,
              description: t.nanniesDesc,
              image:
                'https://images.unsplash.com/photo-1697906100384-375b3390e8f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
              gradient: 'from-pink-500 to-rose-500',
            },
            {
              title: t.gardeners,
              description: t.gardenersDesc,
              image:
                'https://images.unsplash.com/photo-1758524055098-071470ae15b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
              gradient: 'from-green-500 to-emerald-500',
            },
            {
              title: t.drivers,
              description: t.driversDesc,
              image:
                'https://images.unsplash.com/photo-1582834202430-ddcd18987a61?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
              gradient: 'from-blue-500 to-cyan-500',
            },
            {
              title: t.cleaners,
              description: t.cleanersDesc,
              image:
                'https://images.unsplash.com/photo-1628869198803-37acd8bba6f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
              gradient: 'from-purple-500 to-violet-500',
            },
            {
              title: t.cooks,
              description: t.cooksDesc,
              image:
                'https://images.unsplash.com/photo-1647989015474-67ec5dad81f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
              gradient: 'from-orange-500 to-amber-500',
            },
            {
              title: t.caregivers,
              description: t.caregiversDesc,
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
            <span>{t.joinOurCommunity}</span>
          </div>
          <h2 className="text-4xl leading-tight font-bold md:text-5xl">{t.readyToStart}</h2>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed opacity-95">{t.readyDesc}</p>
          <div className="pt-2">
            <Button
              size="lg"
              variant="secondary"
              onClick={goOnboarding}
              className="bg-white px-10 py-6 text-lg font-bold text-[#2F76BB] shadow-xl hover:bg-gray-100"
            >
              {t.joinToday}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <LandingFooter t={t} onJoin={goOnboarding} />
    </div>
  );
}
