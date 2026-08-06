'use client';

import { LegalDocumentView } from '@/components/legal/legal-document-view';
import { useI18n } from '@/features/i18n/i18n-provider';
import { getTermsOfService } from '@/features/legal/terms-of-service';

export default function TermsOfServicePage() {
  const { locale } = useI18n();
  return <LegalDocumentView document={getTermsOfService(locale)} />;
}
