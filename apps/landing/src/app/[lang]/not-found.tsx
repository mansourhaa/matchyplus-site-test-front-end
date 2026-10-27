'use client';

import { PageFrame } from '@/components/site-shell';
import { SubpageHero } from '@/components/subpage-hero';
import { useI18n } from '@/features/i18n/i18n-provider';
import { localizePath } from '@/features/i18n/routing';
import Link from 'next/link';

const data: Record<'fr' | 'en' | 'ar', { title: string; desc: string; back: string }> = {
  fr: {
    title: 'Page introuvable',
    desc: 'La page que vous recherchez n’existe pas ou a été déplacée.',
    back: 'Retour à l’accueil',
  },
  en: {
    title: 'Page not found',
    desc: 'The page you are looking for does not exist or has been moved.',
    back: 'Back to Home',
  },
  ar: {
    title: 'الصفحة غير موجودة',
    desc: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.',
    back: 'العودة للرئيسية',
  },
};

export default function NotFound() {
  const { locale } = useI18n();
  const t = data[locale];

  return (
    <PageFrame>
      <main className="pb-16">
        <SubpageHero eyebrow="404" title={t.title} subtitle={t.desc}>
          <Link
            href={localizePath(locale, '/')}
            className="text-brand-blue inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-bold shadow-xl shadow-black/10 transition-all hover:scale-[1.03] sm:text-base"
          >
            {t.back}
          </Link>
        </SubpageHero>
      </main>
    </PageFrame>
  );
}
