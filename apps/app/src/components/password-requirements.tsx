'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import {
  PASSWORD_REQUIREMENT_ORDER,
  type PasswordRequirementId,
  getPasswordRequirementStatus,
} from '@/lib/password-policy';
import { Check, X } from 'lucide-react';

const LABEL_KEYS: Record<PasswordRequirementId, string> = {
  minLength: 'auth.passwordReq.minLength',
  lowercase: 'auth.passwordReq.lowercase',
  uppercase: 'auth.passwordReq.uppercase',
  digit: 'auth.passwordReq.digit',
  special: 'auth.passwordReq.special',
};

/** Live checklist shown under new-password fields (signup / reset / change). */
export function PasswordRequirements({ password }: { password: string }) {
  const { t } = useI18n();
  const status = getPasswordRequirementStatus(password);
  const show = password.length > 0;

  if (!show) {
    return (
      <p style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>
        {t('auth.passwordReq.hint')}
      </p>
    );
  }

  return (
    <ul className="mt-2 space-y-1" aria-live="polite">
      {PASSWORD_REQUIREMENT_ORDER.map((id) => {
        const ok = status[id];
        return (
          <li key={id} className="flex items-center gap-1.5" style={{ fontSize: '11px' }}>
            {ok ? <Check size={12} color="#61BCA6" /> : <X size={12} color="#E74C3C" />}
            <span style={{ color: ok ? '#61BCA6' : '#E74C3C', fontWeight: ok ? 600 : 500 }}>
              {t(LABEL_KEYS[id])}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
