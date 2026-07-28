'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useI18n } from '@/features/i18n/i18n-provider';
import { toast } from '@/lib/toast';
import type { ReactNode } from 'react';

type StubScreenProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  showAction?: boolean;
  actionLabel?: string;
};

/** Visual placeholder for screens without backend wiring yet. */
export function StubScreen({
  title,
  description,
  children,
  showAction = true,
  actionLabel,
}: StubScreenProps) {
  const { t } = useI18n();

  return (
    <div className="h-full overflow-y-auto" style={{ background: matchyBrand.bg }}>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 md:px-8">
        <div
          className="rounded-3xl bg-white p-6 shadow-sm"
          style={{ border: `1px solid ${matchyBrand.border}` }}
        >
          <h2 className="text-xl font-extrabold" style={{ color: matchyBrand.textDark }}>
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm leading-relaxed" style={{ color: matchyBrand.muted }}>
              {description}
            </p>
          )}
          {children}
          {showAction && (
            <button
              type="button"
              onClick={() => toast.message(t('settings.comingSoon'))}
              className="mt-5 w-full rounded-2xl py-3.5 text-sm font-bold text-white"
              style={{ background: matchyBrand.gradient }}
            >
              {actionLabel || t('settings.comingSoon')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
