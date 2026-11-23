import { Check, X } from 'lucide-react';
import type { CSSProperties } from 'react';

/** Where the app's two buttons sit inside hero-phone.png (323 × 639 px), in %. */
export const PASS_BUTTON: CSSProperties = {
  left: '12.38%',
  top: '84.35%',
  width: '31.58%',
  height: '5.95%',
};
export const CONNECT_BUTTON: CSSProperties = {
  left: '47.99%',
  top: '84.35%',
  width: '39.32%',
  height: '5.95%',
};

/**
 * The screenshot's tab labels are in French: each one is covered by a translated label,
 * centred under its icon (x in %), on the label row only (below the icons). Fixed width, so a
 * short word still hides a long one.
 */
const TAB_CENTERS = ['18.6%', '40.2%', '62.2%', '81.8%'] as const;
const TAB_ROW: CSSProperties = { top: '96.45%', height: '1.4%', width: '13%' };

/** The phone screen's shape in the screenshot: the labels never spill onto the frame's corners. */
const SCREEN_CLIP: CSSProperties = { clipPath: 'inset(0 5.6% 2.2% 5% round 11.8% / 5.9%)' };

/**
 * The screenshot's Pass / Connect buttons and bottom tabs, redrawn on top of it so their labels
 * follow the page language (the screenshot itself is in French).
 */
export function HeroPhoneOverlay({
  passLabel,
  connectLabel,
  tabs,
}: {
  passLabel: string;
  connectLabel: string;
  /** The app's 4 tab labels; the first one is the active tab. */
  tabs: string[];
}) {
  return (
    <div aria-hidden="true" className="@container pointer-events-none absolute inset-0">
      <span
        className="absolute flex items-center justify-center gap-[2cqw] rounded-[14px] border border-[#E2E8F0] bg-white text-[4.3cqw] font-bold whitespace-nowrap text-[#475569]"
        style={PASS_BUTTON}
      >
        <X className="h-[4.6cqw] w-[4.6cqw] text-[#64748B]" strokeWidth={2.5} />
        {passLabel}
      </span>
      <span
        className="absolute flex items-center justify-center gap-[2cqw] rounded-[14px] bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] text-[4.3cqw] font-bold whitespace-nowrap text-white"
        style={CONNECT_BUTTON}
      >
        <Check className="h-[4.6cqw] w-[4.6cqw]" strokeWidth={2.5} />
        {connectLabel}
      </span>
      <div className="absolute inset-0" style={SCREEN_CLIP}>
        {tabs.map((label, index) => (
          <span
            key={label}
            className={`absolute flex -translate-x-1/2 items-center justify-center bg-white px-[1cqw] text-[2.9cqw] leading-none whitespace-nowrap ${index === 0 ? 'text-brand-blue font-bold' : 'text-[#64748B]'}`}
            style={{ ...TAB_ROW, left: TAB_CENTERS[index] }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
