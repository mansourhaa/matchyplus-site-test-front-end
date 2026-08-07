import type { LegalDocument } from '@/lib/legal/types';

type Props = {
  document: LegalDocument;
  isRtl?: boolean;
};

export function LegalDocumentView({ document, isRtl = false }: Props) {
  return (
    <div
      className="min-h-full overflow-y-auto"
      style={{
        background: '#F5F7FA',
        fontFamily: isRtl ? 'var(--font-cairo), sans-serif' : 'var(--font-baloo), sans-serif',
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold text-[#1A1A2E]">{document.heading}</h1>
          <p className="text-sm text-[#888]">{document.subheading}</p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
          {document.sections.map((section, sIdx) => (
            <div
              key={section.title}
              className={sIdx === 0 ? '' : 'mt-5 border-t border-[#F0F0F0] pt-5'}
            >
              <h2 className="mb-2 text-base font-bold text-[#2F76BB]">{section.title}</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-[#555]">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg bg-blue-50 p-3" style={{ border: '1px solid #D4E1EE' }}>
          <p className="text-center text-xs text-[#555]">{document.footer}</p>
        </div>
      </div>
    </div>
  );
}
