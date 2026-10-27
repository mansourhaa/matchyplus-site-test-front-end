import { ABOUT_CONTENT, AboutPage } from '@/components/about';
import { PageFrame } from '@/components/site-shell';
import { isLocale } from '@/features/i18n/routing';
import { APP_REGISTER_URL } from '@/lib/constants';
import { aboutJsonLd } from '@/lib/seo';
import { notFound } from 'next/navigation';

// Served at /fr/a-propos/, /en/about-us/ and /ar/من-نحن/ (the proxy maps translated slugs here).
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <PageFrame>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd(lang)) }}
      />
      <AboutPage
        content={ABOUT_CONTENT[lang]}
        customerHref={APP_REGISTER_URL}
        professionalHref={APP_REGISTER_URL}
      />
    </PageFrame>
  );
}
