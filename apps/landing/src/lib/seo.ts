import { ABOUT_CONTENT } from '@/components/about/content';
import { FAQ_CONTENT } from '@/components/faq/content';
import type { PressItem } from '@/components/matchy/press-data';
import { SERVICES_CONTENT } from '@/components/services/content';
import { DEFAULT_LOCALE, type Locale, SUPPORTED_LOCALES } from '@/features/i18n/messages';
import { isLocale, localizePath } from '@/features/i18n/routing';
import { SOCIAL_LINKS } from '@/lib/constants';
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
  | 'a-propos'
  | 'services'
  | 'devenir-partenaire'
  | 'contact'
  | 'faq'
  | 'terms-of-service'
  | 'privacy-policy'
  | 'suppression-compte'
  | 'coming-soon'
  | 'recherche'
  | 'actualites'
  | 'utilisation';

/** The À propos copy ships with its page content in `locales/<lang>/about.json`. */
function aboutCopy(): Record<Locale, PageCopy> {
  const copy = {} as Record<Locale, PageCopy>;
  for (const locale of SUPPORTED_LOCALES) {
    const { seo } = ABOUT_CONTENT[locale];
    copy[locale] = {
      title: seo.title,
      description: seo.description,
      ogTitle: seo.openGraphTitle,
      ogDescription: seo.openGraphDescription,
    };
  }
  return copy;
}

/** The FAQ copy ships with its questions in `locales/<lang>/faq.json`. */
function faqCopy(): Record<Locale, PageCopy> {
  const copy = {} as Record<Locale, PageCopy>;
  for (const locale of SUPPORTED_LOCALES) {
    copy[locale] = { ...FAQ_CONTENT[locale].seo };
  }
  return copy;
}

/** The Services copy ships with its page content in `locales/<lang>/services.json`. */
function servicesCopy(): Record<Locale, PageCopy> {
  const copy = {} as Record<Locale, PageCopy>;
  for (const locale of SUPPORTED_LOCALES) {
    const { seo } = SERVICES_CONTENT[locale];
    copy[locale] = {
      title: seo.title,
      description: seo.description,
      ogTitle: seo.openGraphTitle,
      ogDescription: seo.openGraphDescription,
    };
  }
  return copy;
}

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
  services: {
    path: '/services',
    changeFrequency: 'monthly',
    priority: 0.9,
    copy: servicesCopy(),
  },
  'a-propos': {
    path: '/a-propos',
    changeFrequency: 'monthly',
    priority: 0.8,
    copy: aboutCopy(),
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
    copy: faqCopy(),
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
  actualites: {
    path: '/actualites',
    changeFrequency: 'weekly',
    priority: 0.7,
    copy: {
      fr: {
        title: 'Actualités',
        description: 'Événements, interviews et annonces de Matchy+.',
      },
      en: {
        title: 'News',
        description: 'Matchy+ events, interviews and announcements.',
      },
      ar: {
        title: 'الأخبار',
        description: 'فعاليات وحوارات وإعلانات Matchy+.',
      },
    },
  },
  utilisation: {
    path: '/utilisation',
    changeFrequency: 'monthly',
    priority: 0.7,
    copy: {
      fr: {
        title: 'Comment utiliser Matchy+',
        description:
          'Trouvez un professionnel en trois étapes, boostez votre visibilité avec Matchy Wallet et découvrez les pros autour de vous.',
      },
      en: {
        title: 'How to use Matchy+',
        description:
          'Find a professional in three steps, boost your visibility with Matchy Wallet and discover pros around you.',
      },
      ar: {
        title: 'كيفية استخدام Matchy+',
        description:
          'اعثر على محترف في ثلاث خطوات، وعزّز ظهورك مع Matchy Wallet واكتشف المحترفين من حولك.',
      },
    },
  },
  recherche: {
    path: '/recherche',
    noindex: true,
    copy: {
      fr: {
        title: 'Résultats de recherche',
        description: 'Les professionnels Matchy+ disponibles pour votre recherche.',
      },
      en: {
        title: 'Search results',
        description: 'Matchy+ professionals available for your search.',
      },
      ar: {
        title: 'نتائج البحث',
        description: 'المحترفون المتاحون على Matchy+ لبحثك.',
      },
    },
  },
};

/** Absolute URL, percent-encoding non-ASCII slugs (`/ar/من-نحن/`) as sitemaps require. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${encodeURI(path)}`;
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
  const hasBrand = copy.title.includes(SITE_NAME);
  const ogTitle = copy.ogTitle ?? (hasBrand ? copy.title : `${copy.title} | ${SITE_NAME}`);
  const ogDescription = copy.ogDescription ?? copy.description;

  return {
    // Titles that already carry the brand (home, À propos) skip the `%s | Matchy+` template.
    title: hasBrand ? { absolute: copy.title } : copy.title,
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

/** Title, description, canonical, hreflang and social tags of one Matchy+ Press article. */
export function pressMetadata(locale: Locale, item: PressItem): Metadata {
  const path = `/actualites/${item.slug}`;
  const { title, summary } = item.text[locale];
  const url = absoluteUrl(localizePath(locale, path));
  const image = item.cover ? { url: item.cover, alt: title } : OG_IMAGE;
  return {
    title,
    description: summary,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: 'article',
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      url,
      title: `${title} | ${SITE_NAME}`,
      description: summary,
      // only a full date: a year-only or month-only date is not a publication time
      ...(/^\d{4}-\d{2}-\d{2}$/.test(item.date) && { publishedTime: item.date }),
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description: summary, images: [image.url] },
    // example news stay out of search results
    ...(item.sample && { robots: { index: false, follow: true } }),
  };
}

/** AboutPage structured data, pointing at the Organization and WebSite the home page defines. */
export function aboutJsonLd(locale: Locale) {
  const { seo } = ABOUT_CONTENT[locale];
  const pageUrl = absoluteUrl(localizePath(locale, PAGES['a-propos'].path));
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: seo.title,
    description: seo.description,
    inLanguage: locale,
    isPartOf: { '@id': `${absoluteUrl(localizePath(locale, '/'))}#website` },
    about: { '@id': `${SITE_URL}/#organization` },
  };
}

/**
 * Services listing and its FAQ. Each category is listed by name only: no `Service` objects, since
 * Matchy+ connects people with providers rather than delivering these services itself.
 */
export function servicesJsonLd(locale: Locale) {
  const content = SERVICES_CONTENT[locale];
  const pageUrl = absoluteUrl(localizePath(locale, PAGES.services.path));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: content.seo.title,
        description: content.seo.description,
        inLanguage: locale,
        isPartOf: { '@id': `${absoluteUrl(localizePath(locale, '/'))}#website` },
        about: { '@id': `${SITE_URL}/#organization` },
        mainEntity: { '@id': `${pageUrl}#services` },
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#services`,
        name: content.popular.title,
        numberOfItems: content.popular.services.length,
        itemListElement: content.popular.services.map((service, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: service.name,
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        inLanguage: locale,
        mainEntity: content.faq.items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };
}

/** FAQPage structured data built from the questions the page displays. */
export function faqJsonLd(locale: Locale) {
  const content = FAQ_CONTENT[locale];
  const pageUrl = absoluteUrl(localizePath(locale, PAGES.faq.path));
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: content.hero.title,
    description: content.seo.description,
    inLanguage: locale,
    isPartOf: { '@id': `${absoluteUrl(localizePath(locale, '/'))}#website` },
    mainEntity: content.categories.flatMap((category) =>
      category.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    ),
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
        sameAs: Object.values(SOCIAL_LINKS),
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
