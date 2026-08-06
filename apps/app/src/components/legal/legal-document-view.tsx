'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import type { LegalDocument } from '@/features/legal/types';
import { motion } from 'framer-motion';

type Props = {
  document: LegalDocument;
  /** When true, fill the viewport (public pages). Dashboard already scrolls in shell. */
  fullHeight?: boolean;
};

export function LegalDocumentView({ document, fullHeight = false }: Props) {
  const { locale } = useI18n();
  const isRtl = locale === 'ar';

  return (
    <div
      className={fullHeight ? 'h-full overflow-y-auto' : 'h-full overflow-y-auto'}
      style={{
        background: '#F5F7FA',
        fontFamily: isRtl ? "'Cairo', sans-serif" : "'Baloo 2', sans-serif",
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl font-bold text-[#1A1A2E]">{document.heading}</h1>
            <p className="text-sm text-[#888]">{document.subheading}</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl bg-white p-4 shadow-sm"
            style={{ border: '1px solid #F0F0F0' }}
          >
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 rounded-lg bg-blue-50 p-3"
            style={{ border: '1px solid #D4E1EE' }}
          >
            <p className="text-center text-xs text-[#555]">{document.footer}</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
