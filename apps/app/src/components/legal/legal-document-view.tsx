'use client';

import { matchyBrand } from '@/components/matchy/brand';
import type { LegalDocument } from '@/lib/legal/types';
import { CheckCircle2 } from 'lucide-react';

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
      <div className="w-full px-4 pt-6 pb-12 sm:px-6 sm:pt-8 md:px-8 md:pt-10">
        {/* Centered Document Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-3xl">
            {document.heading}
          </h1>
          <p className="mt-2 text-xs font-medium text-[#64748B] sm:text-sm">
            {document.subheading}
          </p>
        </div>

        {/* Legal Document Main Card */}
        <div
          className="space-y-8 rounded-3xl bg-white p-6 shadow-xs sm:p-10"
          style={{ border: `1px solid ${matchyBrand.border}` }}
        >
          {document.sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-base font-bold text-[#2F76BB] sm:text-lg">{section.title}</h2>
              <div className="text-sm leading-relaxed font-normal whitespace-pre-line text-[#334155] sm:text-[15px]">
                {section.content}
              </div>
            </section>
          ))}

          {/* Footer Contact Banner inside card */}
          {document.footer && (
            <div className="border-t border-[#F1F5F9] pt-6">
              <div className="flex items-center gap-2.5 text-xs font-medium text-[#2F76BB] sm:text-sm">
                <CheckCircle2 size={18} className="shrink-0 text-[#61BCA6]" />
                <p className="leading-relaxed">{document.footer}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
