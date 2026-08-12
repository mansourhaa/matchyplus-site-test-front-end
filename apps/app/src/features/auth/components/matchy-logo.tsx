type LogoSize = 'sm' | 'md' | 'lg';

const HEIGHTS: Record<LogoSize, number> = {
  sm: 24,
  md: 32,
  lg: 44,
};

type MatchyLogoProps = {
  size?: LogoSize;
  className?: string;
};

export function MatchyLogo({ size = 'md', className }: MatchyLogoProps) {
  const height = HEIGHTS[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-matchy.svg"
      alt="Matchy+"
      height={height}
      className={className}
      style={{ height, width: 'auto', flexShrink: 0 }}
    />
  );
}

export function MatchyLogoWhite({ size = 'md', className }: MatchyLogoProps) {
  const height = HEIGHTS[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-matchy-white.svg"
      alt="Matchy+"
      height={height}
      className={className}
      style={{ height, width: 'auto', flexShrink: 0 }}
    />
  );
}
