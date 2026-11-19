'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { inPageScript } from '@/features/onboarding/video-analysis';
import { Sparkles } from 'lucide-react';

type AiProposalsProps = {
  /** Options from the video analysis (already in the page alphabet). */
  options?: string[];
  /** Current field value: an option equal to it is not shown. */
  current: string;
  onPick: (value: string) => void;
};

/**
 * One-click proposals under a field, from the intro-video analysis (the 2.0.8 « suggest »
 * chips): what the AI heard but is not sure enough to write by itself.
 */
export function AiProposals({ options, current, onPick }: AiProposalsProps) {
  const { t, locale } = useI18n();
  const visible = (options ?? []).filter(
    (option) => option !== current && inPageScript(option, locale),
  );
  if (!visible.length) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span
        className="flex items-center gap-1"
        style={{ fontSize: '12px', color: '#2F76BB', fontWeight: 600 }}
      >
        <Sparkles size={13} />
        {t('onboarding.identity.aiProposal')}
      </span>
      {visible.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onPick(option)}
          className="rounded-full px-3 py-1 transition-all"
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#2F76BB',
            background: '#EAF3FF',
            border: '1px dashed #2F76BB',
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
