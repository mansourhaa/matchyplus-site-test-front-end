type LogoSize = 'sm' | 'md' | 'lg';

const SCALES: Record<LogoSize, { icon: number; m: number; plus: number }> = {
  sm: { icon: 32, m: 19, plus: 14 },
  md: { icon: 42, m: 26, plus: 19 },
  lg: { icon: 60, m: 38, plus: 28 },
};

const WHITE_SCALES: Record<LogoSize, { icon: number; m: number; plus: number }> = {
  sm: { icon: 32, m: 19, plus: 14 },
  md: { icon: 48, m: 32, plus: 23 },
  lg: { icon: 68, m: 44, plus: 32 },
};

export function MatchyLogo({ size = 'md' }: { size?: LogoSize }) {
  const s = SCALES[size];
  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Icon.svg"
        alt="Matchy+"
        width={s.icon}
        height={s.icon}
        style={{ borderRadius: '22%', objectFit: 'cover' }}
      />
      <div className="flex items-baseline gap-0">
        <span style={{ fontSize: `${s.m}px`, fontWeight: 800, color: '#2F76BB' }}>Matchy</span>
        <span style={{ fontSize: `${s.plus}px`, fontWeight: 800, color: '#61BCA6' }}>+</span>
      </div>
    </div>
  );
}

export function MatchyLogoWhite({ size = 'md' }: { size?: LogoSize }) {
  const s = WHITE_SCALES[size];
  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Icon.svg"
        alt="Matchy+"
        width={s.icon}
        height={s.icon}
        style={{ borderRadius: '22%', objectFit: 'cover' }}
      />
      <div className="flex items-baseline gap-0">
        <span style={{ fontSize: `${s.m}px`, fontWeight: 800, color: 'white' }}>Matchy</span>
        <span style={{ fontSize: `${s.plus}px`, fontWeight: 800, color: 'rgba(255,255,255,0.75)' }}>
          +
        </span>
      </div>
    </div>
  );
}
