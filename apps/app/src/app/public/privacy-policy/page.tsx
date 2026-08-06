'use client';

import { LegalDocumentView } from '@/components/legal/legal-document-view';
import { getPrivacyPolicy } from '@/features/legal/privacy-policy';
import { useI18n } from '@/features/i18n/i18n-provider';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PublicPrivacyPolicyPage() {
  const { locale } = useI18n();
  const doc = getPrivacyPolicy(locale);

  return (
    <div className="flex h-dvh flex-col" style={{ background: '#F5F7FA' }}>
      <div
        className="flex shrink-0 items-center gap-3 px-4 py-3"
        style={{ background: 'white', borderBottom: '1px solid #EEF0F3' }}
      >
        <Link href="/login" className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-[#F5F7FA]">
          <ArrowLeft size={18} color="#555" />
        </Link>
        <p className="font-bold text-[#1A1A2E]">{doc.pageTitle}</p>
      </div>
      <div className="min-h-0 flex-1">
        <LegalDocumentView document={doc} fullHeight />
      </div>
    </div>
  );
}
