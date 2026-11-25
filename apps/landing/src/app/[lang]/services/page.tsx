import { SERVICES_CONTENT, ServicesPage } from '@/components/services';
import { PageFrame } from '@/components/site-shell';
import { isLocale } from '@/features/i18n/routing';
import { APP_LOGIN_URL, APP_REGISTER_URL, appLink } from '@/lib/constants';
import { servicesJsonLd } from '@/lib/seo';
import { notFound } from 'next/navigation';

// Served at /fr/services/, /en/services/ and /ar/الخدمات/ (the proxy maps translated slugs here).
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <PageFrame>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesJsonLd(lang)) }}
      />
      <ServicesPage
        content={SERVICES_CONTENT[lang]}
        signupHref={appLink(APP_REGISTER_URL, lang)}
        loginHref={appLink(APP_LOGIN_URL, lang)}
      />
    </PageFrame>
  );
}
