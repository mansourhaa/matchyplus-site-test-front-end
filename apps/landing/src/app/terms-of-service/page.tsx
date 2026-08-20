'use client';

import { LegalDocumentView } from '@/components/legal/legal-document-view';
import { PageFrame } from '@/components/site-shell';
import { SubpageHero } from '@/components/subpage-hero';
import { useI18n } from '@/features/i18n/i18n-provider';
import { getTermsOfService } from '@/lib/legal/terms-of-service';

export default function TermsOfServicePage() {
  const { locale } = useI18n();
  const doc = getTermsOfService(locale);
  const isRtl = locale === 'ar';

  return (
    <PageFrame>
      <main className="bg-neutral-50/60 pb-28">
        <SubpageHero eyebrow="Matchy+ Legal" title={doc.pageTitle} subtitle={doc.subheading} />

        <div className="relative z-20 container -mt-10 max-w-4xl sm:-mt-14">
          <LegalDocumentView document={doc} isRtl={isRtl} />
        </div>
      </main>
    </PageFrame>
  );
}
