'use client';

import { cn } from '@/lib/utils';
import { type MotionValue, motion, useTransform } from 'framer-motion';
import Image from 'next/image';

import type { BeltService } from './belt-data';
import { type StageSize, beltPose, stageGeometry } from './belt-geometry';

/** Spring used when a professional steps forward (focus) or the belt turns to one. */
export const FOCUS_SPRING = { type: 'spring', stiffness: 120, damping: 22 } as const;

/** One professional on the belt: photo, floor shadow and the name / price tag shown on hover. */
export function BeltPerson({
  service,
  index,
  count,
  angle,
  motionBlur,
  size,
  selected,
  hidden,
  wide,
  isRtl,
  entered,
  label,
  tag,
  onOpen,
  buttonRef,
}: {
  service: BeltService;
  index: number;
  count: number;
  angle: MotionValue<number>;
  motionBlur: MotionValue<number>;
  size: StageSize;
  selected: boolean;
  hidden: boolean;
  wide: boolean;
  isRtl: boolean;
  entered: boolean;
  label: string;
  /** Name and price shown beside the pro on hover, before the click. */
  tag: string;
  onOpen: (index: number) => void;
  buttonRef: (node: HTMLButtonElement | null) => void;
}) {
  const { radii, centerX, centerY, baseHeight } = stageGeometry(size);
  const pose = (a: number) => beltPose(a, index, count, radii);

  const x = useTransform(angle, (a) => pose(a).x);
  const y = useTransform(angle, (a) => pose(a).y);
  const scale = useTransform(angle, (a) => pose(a).scale);
  const opacity = useTransform(angle, (a) => pose(a).opacity);
  const zIndex = useTransform(angle, (a) => pose(a).zIndex);
  const filter = useTransform([angle, motionBlur], ([a, blur]: number[]) => {
    const p = pose(a);
    return `blur(${(p.blur + blur * (0.4 + p.depth)).toFixed(2)}px)`;
  });

  const width = baseHeight * (service.image.width / service.image.height);
  const focusShift = wide ? size.width * (isRtl ? 0.2 : -0.2) : 0;

  return (
    // Full-stage layer: scaling it around the front spot enlarges the selected professional in place.
    <motion.div
      className="pointer-events-none absolute inset-0"
      style={{
        zIndex: selected ? 300 : zIndex,
        transformOrigin: `${centerX}px ${centerY + radii.ry}px`,
      }}
      initial={{ opacity: 0, y: 60 }}
      animate={
        !entered
          ? { opacity: 0, y: 60 }
          : selected
            ? { scale: wide ? 1.25 : 1.12, x: focusShift, y: 0, opacity: 1, filter: 'blur(0px)' }
            : hidden
              ? { scale: 0.92, x: 0, y: 0, opacity: 0, filter: 'blur(12px)' }
              : { scale: 1, x: 0, y: 0, opacity: 1, filter: 'blur(0px)' }
      }
      // People step onto the belt one after another, and come back the same way.
      transition={selected ? FOCUS_SPRING : { ...FOCUS_SPRING, delay: index * 0.09 }}
    >
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={() => onOpen(index)}
        disabled={hidden}
        aria-label={label}
        className={cn(
          'group absolute origin-bottom cursor-pointer outline-none',
          'focus-visible:ring-brand-teal focus-visible:ring-4 focus-visible:ring-offset-4',
          hidden ? 'pointer-events-none' : 'pointer-events-auto',
        )}
        style={{
          left: centerX - width / 2,
          top: centerY - baseHeight,
          width,
          height: baseHeight,
          x,
          y,
          scale,
          opacity,
          filter: selected ? 'none' : filter,
        }}
      >
        <span
          aria-hidden="true"
          className="absolute -bottom-3 left-1/2 h-6 w-[80%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgba(47,118,187,0.35),transparent_70%)]"
        />
        <span className="relative block h-full w-full transition-[transform,filter] duration-300 ease-out group-hover:-translate-y-2 group-hover:drop-shadow-[0_18px_24px_rgba(45,121,190,0.3)] group-focus-visible:-translate-y-2">
          <Image
            src={service.image.src}
            alt=""
            width={service.image.width}
            height={service.image.height}
            sizes="(max-width: 768px) 130px, 210px"
            draggable={false}
            className="h-full w-full object-contain object-bottom select-none"
          />
        </span>
        {/* hover tag beside the chest: name and price, before the click */}
        {!selected && (
          <span
            aria-hidden="true"
            className="border-brand-navy text-brand-navy absolute top-[34%] translate-y-1 rounded-[3px] border bg-white px-2 py-1 font-mono text-[11px] font-semibold tracking-wider whitespace-nowrap uppercase opacity-0 shadow-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 ltr:left-[58%] rtl:right-[58%]"
          >
            {tag}
          </span>
        )}
      </motion.button>
    </motion.div>
  );
}
