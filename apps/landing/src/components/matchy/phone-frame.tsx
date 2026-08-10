import { cn } from '@/lib/utils';
import { BatteryFull, Signal, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';

export function PhoneFrame({
  children,
  className,
  dark = false,
  time = '9:41',
}: {
  children: ReactNode;
  className?: string;
  dark?: boolean;
  time?: string;
}) {
  return (
    <div
      className={cn(
        'border-foreground/90 bg-foreground/90 shadow-brand-navy/30 relative w-[248px] shrink-0 rounded-[2.5rem] border-[6px] p-1 shadow-2xl',
        className,
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-[2rem]',
          dark ? 'bg-neutral-900 text-white' : 'text-brand-navy bg-white',
        )}
      >
        {/* notch */}
        <div className="bg-foreground/90 pointer-events-none absolute top-0 left-1/2 z-20 h-5 w-28 -translate-x-1/2 rounded-b-2xl" />
        {/* status bar */}
        <div
          className={cn(
            'flex items-center justify-between px-5 pt-2 pb-1 text-[10px] font-semibold',
            dark ? 'text-white' : 'text-brand-navy',
          )}
        >
          <span>{time}</span>
          <div className="flex items-center gap-1">
            <Signal className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <BatteryFull className="h-3 w-3" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
