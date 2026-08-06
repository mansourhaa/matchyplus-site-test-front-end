'use client';

import { LegalDocumentView } from '@/components/legal/legal-document-view';
import { useI18n } from '@/features/i18n/i18n-provider';
import { getPrivacyPolicy } from '@/features/legal/privacy-policy';

export default function PrivacyPolicyPage() {
  const { locale } = useI18n();
  return <LegalDocumentView document={getPrivacyPolicy(locale)} />;
}
