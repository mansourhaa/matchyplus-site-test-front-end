import { FAQ_CONTENT, FaqPage } from '@/components/faq';
import { PageFrame } from '@/components/site-shell';
import { isLocale, localizePath } from '@/features/i18n/routing';
import { faqJsonLd } from '@/lib/seo';
import { notFound } from 'next/navigation';

// Served at /fr/faq/, /en/faq/ and /ar/الأسئلة-الشائعة/ (the proxy maps translated slugs here).
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <PageFrame>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(lang)) }}
      />
      <FaqPage
        locale={lang}
        content={FAQ_CONTENT[lang]}
        contactHref={localizePath(lang, '/contact')}
      />
    </PageFrame>
  );
}
