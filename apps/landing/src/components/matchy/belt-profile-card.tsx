'use client';

import { cn } from '@/lib/utils';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Brain, Check, MapPin, Star, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { type RefObject, useState } from 'react';

export type BeltProfile = {
  name: string;
  age: string;
  distanceKm: string;
  rating: string;
  reviews: string;
  score: number;
  price: string;
  bio: string;
  tags: string[];
};

export type BeltProfileLabels = {
  role: string;
  available: string;
  seeDetails: string;
  ai: string;
  confidence: string;
  distance: string;
  price: string;
  pass: string;
  like: string;
  close: string;
  sample: string;
};

type CardImage = { src: string; width: number; height: number };

/** Same thresholds and colours as the matching engine's confidence labels. */
export function confidenceTier(score: number): 0 | 1 | 2 {
  if (score >= 75) return 0;
  if (score >= 55) return 1;
  return 2;
}

const TIER_COLORS = ['#61BCA6', '#2F76BB', '#F5A623'] as const;

/** Drag distance (px) or speed (px/s) that counts as a swipe. */
const SWIPE_OFFSET = 110;
const SWIPE_VELOCITY = 600;

export function BeltProfileCard({
  className,
  image,
  profile,
  labels,
  detailsHref,
  titleId,
  reduceMotion,
  onPass,
  onLike,
  onClose,
  closeRef,
}: {
  className?: string;
  image: CardImage;
  profile: BeltProfile;
  labels: BeltProfileLabels;
  detailsHref: string;
  titleId: string;
  reduceMotion: boolean;
  onPass: () => void;
  onLike: () => void;
  onClose: () => void;
  closeRef: RefObject<HTMLButtonElement | null>;
}) {
  // -1 = flying out to the left (pass), 1 = to the right (like), 0 = resting.
  const [leaving, setLeaving] = useState<-1 | 0 | 1>(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-14, 14]);
  const likeStamp = useTransform(x, [30, 140], [0, 1]);
  const passStamp = useTransform(x, [-140, -30], [1, 0]);
  const tierColor = TIER_COLORS[confidenceTier(profile.score)];

  const swipe = (direction: -1 | 1) => {
    if (leaving !== 0) return;
    if (reduceMotion) {
      if (direction === 1) onLike();
      else onPass();
      return;
    }
    setLeaving(direction);
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className={cn('relative flex w-full flex-col', className)}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.92, rotate: -4 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={
        reduceMotion ? { duration: 0.2 } : { type: 'spring', stiffness: 170, damping: 18 }
      }
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={labels.close}
        className="text-brand-navy focus-visible:ring-brand-teal absolute -top-3 z-30 grid h-9 w-9 place-items-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition-transform outline-none hover:scale-105 focus-visible:ring-2 ltr:-right-3 rtl:-left-3"
      >
        <X className="h-4 w-4" />
      </button>

      <motion.div
        drag={leaving === 0 ? 'x' : false}
        dragSnapToOrigin
        dragElastic={0.7}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_OFFSET || info.velocity.x > SWIPE_VELOCITY) swipe(1);
          else if (info.offset.x < -SWIPE_OFFSET || info.velocity.x < -SWIPE_VELOCITY) swipe(-1);
        }}
        style={{ x, rotate }}
        animate={leaving !== 0 ? { x: leaving * 720, rotate: leaving * 22, opacity: 0 } : undefined}
        transition={{ duration: 0.35, ease: 'easeIn' }}
        onAnimationComplete={() => {
          if (leaving === 1) onLike();
          else if (leaving === -1) onPass();
        }}
        className="relative min-h-0 w-full flex-1 cursor-grab touch-pan-y overflow-hidden rounded-2xl shadow-2xl shadow-black/20 select-none active:cursor-grabbing"
      >
        {/* photo: the cut-out professional on the brand gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#61BCA6] to-[#2F76BB]" />
        <Image
          src={image.src}
          alt=""
          width={image.width}
          height={image.height}
          sizes="360px"
          draggable={false}
          className="absolute bottom-0 left-1/2 h-[96%] w-auto max-w-none -translate-x-1/2 object-contain object-bottom"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 38%, rgba(0,0,0,0.1) 62%, rgba(0,0,0,0.35) 100%)',
          }}
        />

        {/* swipe stamps */}
        <motion.span
          aria-hidden="true"
          style={{ opacity: likeStamp }}
          className="absolute top-24 left-5 z-20 -rotate-12 rounded-lg border-4 border-[#22C55E] px-3 py-1 text-2xl font-extrabold tracking-wider text-[#22C55E] uppercase"
        >
          {labels.like}
        </motion.span>
        <motion.span
          aria-hidden="true"
          style={{ opacity: passStamp }}
          className="absolute top-24 right-5 z-20 rotate-12 rounded-lg border-4 border-[#EF4444] px-3 py-1 text-2xl font-extrabold tracking-wider text-[#EF4444] uppercase"
        >
          {labels.pass}
        </motion.span>

        {/* top left: rating, then AI score */}
        <div className="absolute top-3 z-10 flex flex-col items-start gap-2 ltr:left-3 rtl:right-3">
          <span
            dir="ltr"
            className="flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 shadow-xs backdrop-blur-md"
          >
            <Star size={13} color="#F5A623" fill="#F5A623" />
            <span className="text-[13px] font-bold text-[#353535]">{profile.rating}</span>
            <span className="text-[11px] text-[#888]">({profile.reviews})</span>
          </span>
          <span
            dir="ltr"
            className="flex items-center gap-1.5 rounded-full border border-white/25 bg-black/55 px-3 py-1 text-white shadow-sm backdrop-blur-md"
          >
            <Brain size={14} className="text-[#61BCA6]" />
            <span className="text-[13px] font-extrabold">{profile.score}%</span>
            <span className="text-[9px] font-bold opacity-85">{labels.ai}</span>
          </span>
          <span
            className="rounded-full border bg-black/35 px-2.5 py-0.5 text-[11px] font-bold backdrop-blur-md"
            style={{ color: tierColor, borderColor: `${tierColor}99` }}
          >
            {labels.confidence}
          </span>
        </div>

        {/* top right: available + see details */}
        <div className="absolute top-3 z-10 flex flex-col items-end gap-1.5 ltr:right-3 rtl:left-3">
          <span className="flex h-8 items-center gap-1 rounded-full bg-[rgba(97,188,166,0.9)] px-2.5 text-[12px] font-bold text-white shadow-xs backdrop-blur-md">
            <Check size={13} strokeWidth={3} />
            {labels.available}
          </span>
          <Link
            href={detailsHref}
            className="flex items-center gap-1 rounded-full bg-[rgba(47,118,187,0.85)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs backdrop-blur-md transition-transform hover:scale-105"
          >
            <span aria-hidden="true">👆</span>
            {labels.seeDetails}
          </Link>
        </div>

        {/* bottom: identity, bio, tags, then the swipe buttons */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-4 text-white">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3 id={titleId} className="truncate text-2xl leading-tight font-bold">
                {profile.name}, {profile.age}
              </h3>
              <p className="text-sm font-medium opacity-90">{labels.role}</p>
            </div>
            <span
              dir="ltr"
              className="bg-brand-blue shrink-0 rounded-xl px-3 py-1.5 text-sm font-bold shadow-md"
            >
              {labels.price}
            </span>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-xs opacity-80">
            <MapPin size={13} color="#61BCA6" />
            {labels.distance}
          </p>
          <p className="mt-2 line-clamp-2 text-[13px] leading-snug opacity-85">{profile.bio}</p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {profile.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-[rgba(97,188,166,0.4)] bg-[rgba(97,188,166,0.65)] px-2.5 py-0.5 text-[11px]"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* action buttons: same as the app's discover view */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <motion.button
          type="button"
          onClick={() => swipe(-1)}
          whileTap={{ scale: 0.98 }}
          className="focus-visible:ring-brand-teal flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white py-3 text-[15px] font-bold whitespace-nowrap text-[#475569] shadow-xs transition-all outline-none hover:bg-[#F8FAFC] focus-visible:ring-2"
        >
          <X size={18} className="text-[#64748B]" strokeWidth={2.5} />
          <span>{labels.pass}</span>
        </motion.button>
        <motion.button
          type="button"
          onClick={() => swipe(1)}
          whileTap={{ scale: 0.98 }}
          className="focus-visible:ring-brand-navy flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] py-3 text-[15px] font-bold whitespace-nowrap text-white shadow-md transition-all outline-none hover:brightness-105 focus-visible:ring-2"
        >
          <Check size={18} strokeWidth={2.5} className="text-white" />
          <span>{labels.like}</span>
        </motion.button>
      </div>

      <p className="text-muted-foreground absolute inset-x-0 -bottom-6 text-center text-[11px]">
        {labels.sample}
      </p>
    </motion.div>
  );
}
