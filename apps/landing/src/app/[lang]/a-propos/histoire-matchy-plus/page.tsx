import { StoryPage } from '@/components/matchy/story-page';
import { PageFrame } from '@/components/site-shell';
import { isLocale } from '@/features/i18n/routing';
import { localizedMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';

export const generateMetadata = localizedMetadata('histoire');

/** "Découvrez l'histoire de Matchy+", opened from "Découvrir notre histoire" on the home page. */
export default async function StoryRoute({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <PageFrame>
      <StoryPage />
    </PageFrame>
  );
}
