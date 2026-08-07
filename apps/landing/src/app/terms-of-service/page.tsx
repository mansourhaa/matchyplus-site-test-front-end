import { LegalDocumentView } from '@/components/legal/legal-document-view';
import { getTermsOfService } from '@/lib/legal/terms-of-service';
import { parseLegalLocale } from '@/lib/legal/types';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service · Matchy+',
};

type PageProps = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function TermsOfServicePage({ searchParams }: PageProps) {
  const { lang } = await searchParams;
  const locale = parseLegalLocale(lang);
  const doc = getTermsOfService(locale);
  const isRtl = locale === 'ar';

  return (
    <div className="flex min-h-dvh flex-col" style={{ background: '#F5F7FA' }}>
      <div
        className="flex shrink-0 items-center gap-3 px-4 py-3"
        style={{ background: 'white', borderBottom: '1px solid #EEF0F3' }}
      >
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-[#F5F7FA]"
          aria-label="Back"
        >
          <ArrowLeft
            size={18}
            color="#555"
            style={{ transform: isRtl ? 'scaleX(-1)' : undefined }}
          />
        </Link>
        <p className="font-bold text-[#1A1A2E]">{doc.pageTitle}</p>
      </div>
      <div className="min-h-0 flex-1">
        <LegalDocumentView document={doc} isRtl={isRtl} />
      </div>
    </div>
  );
}
