'use client';

import { matchyBrand } from '@/components/matchy/brand';
import type { LegalDocument } from '@/lib/legal/types';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

type Props = {
  document: LegalDocument;
  isRtl?: boolean;
};

export function LegalDocumentView({ document, isRtl = false }: Props) {
  return (
    <div
      className="w-full"
      style={{
        fontFamily: isRtl ? 'var(--font-cairo), sans-serif' : 'var(--font-baloo), sans-serif',
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Header Hero Banner */}
        <div
          className="mb-8 rounded-3xl bg-white p-6 shadow-xs sm:p-8"
          style={{ border: `1px solid ${matchyBrand.border}` }}
        >
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F8FF] px-3 py-1 text-xs font-bold text-[#2F76BB]">
                <ShieldCheck size={14} />
                <span>{document.heading}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#1A1A2E] sm:text-3xl">
                {document.pageTitle}
              </h1>
              <p className="text-xs font-semibold text-[#888] sm:text-sm">{document.subheading}</p>
            </div>
          </div>
        </div>

        {/* Legal Sections */}
        <div className="space-y-6">
          {document.sections.map((section, sIdx) => (
            <section
              key={section.title}
              className="rounded-3xl bg-white p-6 shadow-xs transition-shadow hover:shadow-sm sm:p-8"
              style={{ border: `1px solid ${matchyBrand.border}` }}
            >
              <h2 className="mb-3.5 text-base font-bold text-[#2F76BB] sm:text-lg">
                {section.title}
              </h2>
              <div className="text-sm leading-relaxed whitespace-pre-line text-[#4A5568] sm:text-[15px]">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        {/* Footer Contact Banner */}
        <div
          className="mt-8 flex items-center gap-3 rounded-2xl p-5 text-center shadow-xs sm:p-6"
          style={{
            background: 'linear-gradient(135deg, #F3F8FF 0%, #EBF4FC 100%)',
            border: '1px solid #D6E6F5',
          }}
        >
          <div className="mx-auto flex max-w-xl items-center justify-center gap-2.5 text-xs font-medium text-[#2F76BB] sm:text-sm">
            <CheckCircle2 size={18} className="shrink-0 text-[#61BCA6]" />
            <p className="leading-relaxed">{document.footer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
