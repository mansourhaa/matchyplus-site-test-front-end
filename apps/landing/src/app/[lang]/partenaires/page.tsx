import { PartnersPage } from '@/components/matchy/partners-page';
import { PageFrame } from '@/components/site-shell';
import { isLocale } from '@/features/i18n/routing';
import { localizedMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';

export const generateMetadata = localizedMetadata('partenaires');

/** Our partners (from the footer's "Partenaires" link) and what a Matchy+ partnership brings. */
export default async function PartnersRoute({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <PageFrame>
      <PartnersPage />
    </PageFrame>
  );
}
