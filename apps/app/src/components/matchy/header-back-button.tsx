'use client';

import { ArrowLeft } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

export type HeaderBackButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label?: string;
  onClick?: () => void;
  className?: string;
};

/**
 * Unified back navigation button for screen headers across Login, Onboarding, and Legal pages.
 */
export function HeaderBackButton({
  label,
  onClick,
  className = '',
  ...props
}: HeaderBackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group inline-flex items-center gap-1.5 rounded-xl border border-[#E8E8E8] bg-white px-2.5 py-1.5 text-xs font-bold text-[#334155] shadow-2xs transition-colors hover:bg-[#F5F5F5] hover:text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F76BB] active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:text-[13px] ${className}`}
      {...props}
    >
      <ArrowLeft
        size={16}
        className="shrink-0 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0.5"
      />
      {label && <span>{label}</span>}
    </button>
  );
}
