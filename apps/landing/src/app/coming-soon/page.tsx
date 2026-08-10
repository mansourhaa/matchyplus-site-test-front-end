'use client';

import { PageFrame } from '@/components/site-shell';
import { useI18n } from '@/features/i18n/i18n-provider';
import { Smartphone } from 'lucide-react';
import Link from 'next/link';

const data: Record<'fr' | 'en' | 'ar', string[]> = {
  fr: [
    'Bientôt disponible',
    'Notre application mobile est en cours de développement. Elle sera très bientôt disponible sur Google Play et l’App Store.',
    'Retour à l’accueil',
  ],
  en: [
    'Coming Soon',
    'Our mobile application is under development. It will be available very soon on Google Play and the App Store.',
    'Back to Home',
  ],
  ar: [
    'قريباً جداً',
    'تطبيق الهاتف المحمول الخاص بنا قيد التطوير حاليًا وسيكون متاحًا قريبًا على Google Play و App Store.',
    'العودة للرئيسية',
  ],
};

export default function ComingSoon() {
  const { locale } = useI18n();
  const t = data[locale];

  return (
    <PageFrame>
      <main className="inner-page">
        <div className="narrow container flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-brand-teal/15 text-brand-teal mb-6 flex h-16 w-16 items-center justify-center rounded-full">
            <Smartphone className="h-8 w-8" />
          </div>
          <span className="eyebrow">Matchy+ Mobile</span>
          <h1 className="mt-2">{t[0]}</h1>
          <p className="lead mx-auto mt-4 max-w-md">{t[1]}</p>
          <div className="mt-8">
            <Link href="/" className="button button-primary">
              {t[2]}
            </Link>
          </div>
        </div>
      </main>
    </PageFrame>
  );
}
