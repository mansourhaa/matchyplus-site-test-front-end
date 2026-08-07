'use client';

import Link from 'next/link';

type MatchyLogoProps = {
  href?: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
};

const HEIGHTS = {
  sm: 22,
  md: 28,
} as const;

export function MatchyLogo({ href = '/home', size = 'sm', onClick }: MatchyLogoProps) {
  const height = HEIGHTS[size];
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-matchy.svg" alt="Matchy+" height={height} style={{ height, width: 'auto' }} />
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="inline-flex">
        {image}
      </button>
    );
  }

  return (
    <Link href={href} className="inline-flex">
      {image}
    </Link>
  );
}
