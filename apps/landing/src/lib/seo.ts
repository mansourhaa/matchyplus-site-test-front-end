import { DEFAULT_LOCALE, type Locale, SUPPORTED_LOCALES } from '@/features/i18n/messages';
import { isLocale, localizePath } from '@/features/i18n/routing';
import type { Metadata, MetadataRoute } from 'next';

export const SITE_URL = (process.env.LANDING_URL || 'https://matchyplus.com').replace(/\/+$/, '');
export const SITE_NAME = 'Matchy+';

const OG_IMAGE = { url: '/matchy-logo.png', width: 723, height: 185, alt: 'Matchy+' };

const OG_LOCALE: Record<Locale, string> = { fr: 'fr_FR', en: 'en_US', ar: 'ar_AR' };

const KEYWORDS: Record<Locale, string[]> = {
  fr: [
    'Matchy+',
    'professionnel près de chez moi',
    'services locaux en Tunisie',
    'prestataire de services',
    'artisan local',
    'trouver un professionnel',
  ],
  en: [
    'Matchy+',
    'professional near me',
    'local services in Tunisia',
    'local service provider',
    'find a professional',
    'nearby professionals',
  ],
  ar: [
    'Matchy+',
    'مهني بالقرب مني',
    'خدمات محلية في تونس',
    'مقدم خدمات',
    'حرفي بالقرب مني',
    'العثور على مهني',
  ],
};

type PageCopy = {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
};

type PageSeo = {
  path: string;
  /** Utility pages with no search value: kept out of search results and the sitemap. */
  noindex?: boolean;
  changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority?: number;
  copy: Record<Locale, PageCopy>;
};

export type PageKey =
  | 'home'
  | 'devenir-partenaire'
  | 'contact'
  | 'faq'
  | 'terms-of-service'
  | 'privacy-policy'
  | 'suppression-compte'
  | 'coming-soon';

export const PAGES: Record<PageKey, PageSeo> = {
  home: {
    path: '/',
    changeFrequency: 'weekly',
    priority: 1,
    copy: {
      fr: {
        title: 'Matchy+ | Trouvez un professionnel près de chez vous',
        description:
          'Trouvez facilement des professionnels, artisans et prestataires près de chez vous avec Matchy+. Explorez les profils et entrez directement en contact.',
        ogTitle: 'Matchy+ | Trouvez le bon professionnel près de chez vous',
        ogDescription:
          'Découvrez des professionnels disponibles autour de vous et contactez facilement le profil adapté à votre besoin.',
      },
      en: {
        title: 'Matchy+ | Find a professional near you',
        description:
          'Find local professionals, artisans and service providers near you with Matchy+. Explore profiles and connect directly.',
        ogTitle: 'Matchy+ | Find the right professional near you',
        ogDescription:
          'Discover professionals available around you and easily connect with the profile that matches your needs.',
      },
      ar: {
        title: 'Matchy+ | اعثر على مهني بالقرب منك',
        description:
          'اعثر بسهولة على مهنيين وحرفيين ومقدمي خدمات بالقرب منك مع Matchy+. استكشف الملفات وتواصل مباشرة.',
        ogTitle: 'Matchy+ | اعثر على المهني المناسب بالقرب منك',
        ogDescription: 'اكتشف المهنيين المتاحين من حولك وتواصل بسهولة مع الملف المناسب لاحتياجاتك.',
      },
    },
  },
  'devenir-partenaire': {
    path: '/devenir-partenaire',
    changeFrequency: 'monthly',
    priority: 0.8,
    copy: {
      fr: {
        title: 'Devenir partenaire',
        description:
          'Professionnel, artisan ou prestataire de services ? Rejoignez Matchy+ pour gagner en visibilité locale et recevoir des demandes de clients près de chez vous.',
      },
      en: {
        title: 'Become a partner',
        description:
          'Professional, artisan or service provider? Join Matchy+ to boost your local visibility and receive requests from customers near you.',
      },
      ar: {
        title: 'كن شريكًا',
        description:
          'مهني أو حرفي أو مقدم خدمات؟ انضم إلى Matchy+ لتعزيز ظهورك المحلي وتلقي طلبات من عملاء بالقرب منك.',
      },
    },
  },
  contact: {
    path: '/contact',
    changeFrequency: 'monthly',
    priority: 0.7,
    copy: {
      fr: {
        title: 'Contactez-nous',
        description:
          'Une question, une idée ou besoin d’aide ? Contactez l’équipe Matchy+ par formulaire, e-mail ou téléphone. Nous vous répondrons rapidement.',
      },
      en: {
        title: 'Contact us',
        description:
          'A question, an idea or need help? Contact the Matchy+ team by form, email or phone. We will get back to you shortly.',
      },
      ar: {
        title: 'اتصل بنا',
        description:
          'لديك سؤال أو فكرة أو تحتاج إلى المساعدة؟ تواصل مع فريق Matchy+ عبر النموذج أو البريد الإلكتروني أو الهاتف وسنرد عليك قريبًا.',
      },
    },
  },
  faq: {
    path: '/faq',
    changeFrequency: 'monthly',
    priority: 0.6,
    copy: {
      fr: {
        title: 'Questions fréquentes',
        description:
          'Réponses aux questions fréquentes sur Matchy+ : fonctionnement, recherche d’un professionnel près de chez vous, gratuité, Matchy Wallet et protection des données.',
      },
      en: {
        title: 'Frequently asked questions',
        description:
          'Answers to common questions about Matchy+: how it works, finding a professional near you, free access, Matchy Wallet and data protection.',
      },
      ar: {
        title: 'الأسئلة الشائعة',
        description:
          'إجابات عن الأسئلة الشائعة حول Matchy+: طريقة العمل، العثور على مهني بالقرب منك، المجانية، Matchy Wallet وحماية البيانات.',
      },
    },
  },
  'terms-of-service': {
    path: '/terms-of-service',
    changeFrequency: 'yearly',
    priority: 0.3,
    copy: {
      fr: {
        title: 'Conditions générales d’utilisation',
        description:
          'Comptes, abonnements et paiements, Matchy Wallet, responsabilités et suspension de compte : les conditions qui encadrent l’utilisation de la plateforme Matchy+.',
      },
      en: {
        title: 'Terms of service',
        description:
          'Accounts, subscriptions and payments, Matchy Wallet, responsibilities and account suspension: the terms governing the use of the Matchy+ platform.',
      },
      ar: {
        title: 'شروط الاستخدام',
        description:
          'الحسابات والاشتراكات والمدفوعات وMatchy Wallet والمسؤوليات وتعليق الحساب: الشروط التي تنظم استخدام منصة Matchy+.',
      },
    },
  },
  'privacy-policy': {
    path: '/privacy-policy',
    changeFrequency: 'yearly',
    priority: 0.3,
    copy: {
      fr: {
        title: 'Politique de confidentialité',
        description:
          'Données collectées, utilisation, partage, conservation et sécurité : découvrez comment Matchy+ protège vos données personnelles et comment exercer vos droits.',
      },
      en: {
        title: 'Privacy policy',
        description:
          'Data collected, usage, sharing, retention and security: learn how Matchy+ protects your personal data and how to exercise your rights.',
      },
      ar: {
        title: 'سياسة الخصوصية',
        description:
          'البيانات المجمعة واستخدامها ومشاركتها والاحتفاظ بها وأمانها: تعرّف على كيفية حماية Matchy+ لبياناتك الشخصية وكيفية ممارسة حقوقك.',
      },
    },
  },
  'suppression-compte': {
    path: '/suppression-compte',
    noindex: true,
    copy: {
      fr: {
        title: 'Suppression de compte',
        description:
          'Demandez la suppression de votre compte Matchy+ et des données personnelles associées.',
      },
      en: {
        title: 'Account deletion',
        description: 'Request deletion of your Matchy+ account and the associated personal data.',
      },
      ar: {
        title: 'حذف الحساب',
        description: 'اطلب حذف حسابك على Matchy+ والبيانات الشخصية المرتبطة به.',
      },
    },
  },
  'coming-soon': {
    path: '/coming-soon',
    noindex: true,
    copy: {
      fr: {
        title: 'Bientôt disponible',
        description:
          'L’application mobile Matchy+ est en cours de développement et sera bientôt disponible sur Google Play et l’App Store.',
      },
      en: {
        title: 'Coming soon',
        description:
          'The Matchy+ mobile app is under development and will soon be available on Google Play and the App Store.',
      },
      ar: {
        title: 'قريباً',
        description:
          'تطبيق Matchy+ للهاتف المحمول قيد التطوير وسيكون متاحًا قريبًا على Google Play و App Store.',
      },
    },
  },
};

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/** hreflang map for one page: every translation plus `x-default` on the default locale. */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    languages[locale] = absoluteUrl(localizePath(locale, path));
  }
  languages['x-default'] = absoluteUrl(localizePath(DEFAULT_LOCALE, path));
  return languages;
}

/** Defaults every page of one language inherits from the `[lang]` root layout. */
export function siteMetadata(locale: Locale): Metadata {
  const home = PAGES.home.copy[locale];
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: home.title, template: `%s | ${SITE_NAME}` },
    description: home.description,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    keywords: KEYWORDS[locale],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: '/icon.svg',
      shortcut: '/icon.svg',
      apple: '/icon.svg',
    },
    verification: {
      other: {
        'facebook-domain-verification': '1lefuisof4lovb2474uzwtubsyta8g',
      },
    },
  };
}

/** Title, description, canonical, hreflang and social tags of one page in one language. */
export function pageMetadata(locale: Locale, key: PageKey): Metadata {
  const page = PAGES[key];
  const copy = page.copy[locale];
  const url = absoluteUrl(localizePath(locale, page.path));
  const ogTitle = copy.ogTitle ?? `${copy.title} | ${SITE_NAME}`;
  const ogDescription = copy.ogDescription ?? copy.description;

  return {
    // The home title already carries the brand, so it skips the `%s | Matchy+` template.
    title: key === 'home' ? { absolute: copy.title } : copy.title,
    description: copy.description,
    alternates: {
      canonical: url,
      languages: languageAlternates(page.path),
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      alternateLocale: SUPPORTED_LOCALES.filter((other) => other !== locale).map(
        (other) => OG_LOCALE[other],
      ),
      url,
      title: ogTitle,
      description: ogDescription,
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: [OG_IMAGE.url],
    },
    ...(page.noindex && { robots: { index: false, follow: true } }),
  };
}

/** `generateMetadata` for a page under `app/[lang]/`. */
export function localizedMetadata(key: PageKey) {
  return async ({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> => {
    const { lang } = await params;
    return isLocale(lang) ? pageMetadata(lang, key) : {};
  };
}

/** Organization + WebSite structured data for one language's home page. */
export function homeJsonLd(locale: Locale) {
  const homeUrl = absoluteUrl(localizePath(locale, '/'));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl(OG_IMAGE.url),
        email: 'Contact@matchyplus.com',
        sameAs: [
          'https://www.facebook.com/matchyplus',
          'https://www.linkedin.com/company/matchyplus',
          'https://www.instagram.com/matchyplus',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'Contact@matchyplus.com',
          contactType: 'customer support',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${homeUrl}#website`,
        url: homeUrl,
        name: SITE_NAME,
        description: PAGES.home.copy[locale].description,
        inLanguage: locale,
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  };
}
