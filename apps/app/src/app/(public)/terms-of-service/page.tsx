'use client';

import { LegalDocumentView } from '@/components/legal/legal-document-view';
import { useI18n } from '@/features/i18n/i18n-provider';
import { getTermsOfService } from '@/lib/legal/terms-of-service';
import { parseLegalLocale } from '@/lib/legal/types';

export default function PublicTermsOfServicePage() {
  const { locale } = useI18n();
  const legalLocale = parseLegalLocale(locale);
  const doc = getTermsOfService(legalLocale);
  const isRtl = legalLocale === 'ar';

  return (
    <div className="h-full overflow-y-auto">
      <LegalDocumentView document={doc} isRtl={isRtl} />
    </div>
  );
}
