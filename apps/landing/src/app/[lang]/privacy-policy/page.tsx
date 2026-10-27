'use client';

import { LegalDocumentView } from '@/components/legal/legal-document-view';
import { PageFrame } from '@/components/site-shell';
import { SubpageHero } from '@/components/subpage-hero';
import { useI18n } from '@/features/i18n/i18n-provider';
import { getPrivacyPolicy } from '@/lib/legal/privacy-policy';

export default function PrivacyPolicyPage() {
  const { locale } = useI18n();
  const doc = getPrivacyPolicy(locale);
  const isRtl = locale === 'ar';

  return (
    <PageFrame>
      <main className="bg-neutral-50/60 pb-28">
        <SubpageHero eyebrow="Matchy+ Legal" title={doc.pageTitle} subtitle={doc.subheading} />

        <div className="relative z-20 -mt-10 w-full px-4 sm:-mt-14 sm:px-6 md:px-8">
          <LegalDocumentView document={doc} isRtl={isRtl} />
        </div>
      </main>
    </PageFrame>
  );
}
