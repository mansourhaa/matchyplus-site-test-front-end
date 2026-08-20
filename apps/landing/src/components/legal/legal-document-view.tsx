import type { LegalDocument } from '@/lib/legal/types';

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
      <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-2xl sm:p-10">
        <div className="space-y-6">
          {document.sections.map((section, sIdx) => (
            <div
              key={section.title}
              className={sIdx === 0 ? '' : 'border-t border-neutral-100 pt-6'}
            >
              <h2 className="text-brand-blue mb-2.5 text-lg font-bold sm:text-xl">
                {section.title}
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-neutral-600 sm:text-base">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        <div className="from-brand-blue/10 via-brand-teal/10 to-brand-teal/5 border-brand-teal/20 mt-8 rounded-2xl border bg-gradient-to-r p-4 text-center">
          <p className="text-brand-navy text-xs leading-relaxed font-medium sm:text-sm">
            {document.footer}
          </p>
        </div>
      </div>
    </div>
  );
}
