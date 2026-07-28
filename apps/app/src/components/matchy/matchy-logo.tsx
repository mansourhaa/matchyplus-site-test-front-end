'use client';

import Link from 'next/link';

type MatchyLogoProps = {
  href?: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
};

export function MatchyLogo({ href = '/home', size = 'sm', onClick }: MatchyLogoProps) {
  const mainSize = size === 'md' ? 28 : 22;
  const plusSize = size === 'md' ? 20 : 16;

  const content = (
    <span className="inline-flex items-baseline gap-0.5">
      <span style={{ fontSize: mainSize, fontWeight: 800, color: '#2F76BB' }}>Matchy</span>
      <span style={{ fontSize: plusSize, fontWeight: 800, color: '#61BCA6' }}>+</span>
    </span>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="inline-flex">
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  );
}
