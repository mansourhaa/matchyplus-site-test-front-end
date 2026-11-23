import { Analytics } from '@/components/analytics';
import { I18nProvider } from '@/features/i18n/i18n-provider';
import { SUPPORTED_LOCALES } from '@/features/i18n/messages';
import { isLocale, localeDir } from '@/features/i18n/routing';
import { siteMetadata } from '@/lib/seo';
import 'flag-icons/css/flag-icons.min.css';
import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import { Baloo_2 } from 'next/font/google';
import { notFound } from 'next/navigation';
import Script from 'next/script';

import '../globals.css';

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

type LangParams = { params: Promise<{ lang: string }> };

// Only /fr, /en and /ar exist; every other first segment is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? siteMetadata(lang) : {};
}

export default async function RootLayout({
  children,
  params,
}: LangParams & { children: React.ReactNode }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <html lang={lang} dir={localeDir(lang)}>
      <body className={`${baloo.variable} ${cairo.variable} ${baloo.className}`}>
        {/* Google Tag Manager (gtm.js) */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtm.js?id=G-R7FNSWEW2C"
        />
        <Script id="gtm-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());`}
        </Script>

        {/* Google tag (gtag.js) */}
        <Script
          id="google-tag-script"
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-GBBJJXX8S4"
        />
        <Script id="google-tag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'G-GBBJJXX8S4');`}
        </Script>

        <I18nProvider locale={lang}>{children}</I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
