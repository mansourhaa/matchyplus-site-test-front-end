import { I18nProvider } from '@/features/i18n/i18n-provider';
import 'flag-icons/css/flag-icons.min.css';
import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import { Baloo_2 } from 'next/font/google';

import './globals.css';

const baloo = Baloo_2({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-baloo',
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.LANDING_URL || 'https://matchyplus.com'),
  title: {
    default: 'Matchy+ | Connect with trusted professionals near you',
    template: '%s | Matchy+',
  },
  description:
    'Connect with trusted professionals near you. Matchy+ is the premier professional networking platform to discover, meet, and collaborate with verified talents.',
  applicationName: 'Matchy+',
  authors: [{ name: 'Matchy+' }],
  creator: 'Matchy+',
  publisher: 'Matchy+',
  keywords: [
    'Matchy+',
    'networking professionnel',
    'trouver des professionnels',
    'collaboration professionnelle',
    'networking',
    'freelance',
    'partenariat',
    'opportunités professionnelles',
    'Algérie',
    'business networking',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    alternateLocale: ['en_US', 'ar_DZ'],
    url: 'https://matchyplus.com',
    siteName: 'Matchy+',
    title: 'Matchy+ | Connect with trusted professionals near you',
    description:
      'Connect with trusted professionals near you. Matchy+ is the premier professional networking platform to discover, meet, and collaborate with verified talents.',
    images: [
      {
        url: '/matchy-logo.png',
        width: 800,
        height: 800,
        alt: 'Matchy+ Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Matchy+ | Connect with trusted professionals near you',
    description:
      'Connect with trusted professionals near you. Matchy+ is the premier professional networking platform to discover, meet, and collaborate with verified talents.',
    images: ['/matchy-logo.png'],
  },
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

const baseUrl = process.env.LANDING_URL || 'https://matchyplus.com';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'Matchy+',
      url: baseUrl,
      logo: `${baseUrl}/matchy-logo.png`,
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
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: 'Matchy+',
      description:
        'Connect with trusted professionals near you. Matchy+ is the premier professional networking platform to discover, meet, and collaborate with verified talents.',
      publisher: { '@id': `${baseUrl}/#organization` },
      inLanguage: ['fr', 'ar', 'en'],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className={`${baloo.variable} ${cairo.variable} ${baloo.className}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
