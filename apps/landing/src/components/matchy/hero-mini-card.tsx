import { Brain, Check, MapPin, Star } from 'lucide-react';
import Image from 'next/image';

import type { BeltService } from './belt-data';
import { type BeltProfile, confidenceTier } from './belt-profile-card';

/** One demo profile swiping on the hero phone. */
export type DemoCard = { service: BeltService; profile: BeltProfile };

/** Same colours as the belt card: very / good / partial match. */
const TIER_COLORS = ['#61BCA6', '#2F76BB', '#F5A623'] as const;

/** Small version of the app's profile card, sized in container units to fit the phone. */
export function MiniCard({
  card,
  labels,
}: {
  card: DemoCard;
  labels: { available: string; ai: string; confidence: string; distance: string; price: string };
}) {
  const { service, profile } = card;
  const tierColor = TIER_COLORS[confidenceTier(profile.score)];
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[6cqw] bg-gradient-to-br from-[#61BCA6] to-[#2F76BB] shadow-lg">
      <Image
        src={service.image.src}
        alt=""
        width={service.image.width}
        height={service.image.height}
        sizes="240px"
        draggable={false}
        className="absolute bottom-0 left-1/2 h-[94%] w-auto max-w-none -translate-x-1/2"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 34%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.3) 100%)',
        }}
      />

      <div className="absolute top-[4cqw] flex flex-col items-start gap-[2cqw] ltr:left-[4cqw] rtl:right-[4cqw]">
        <span
          dir="ltr"
          className="flex items-center gap-[1cqw] rounded-full bg-white/95 px-[2.6cqw] py-[1cqw] text-[4.6cqw] font-bold text-[#353535]"
        >
          <Star className="h-[4.4cqw] w-[4.4cqw]" color="#F5A623" fill="#F5A623" />
          {profile.rating}
        </span>
        <span
          dir="ltr"
          className="flex items-center gap-[1.4cqw] rounded-full bg-black/55 px-[2.6cqw] py-[1cqw] text-[4.6cqw] font-extrabold text-white"
        >
          <Brain className="h-[4.4cqw] w-[4.4cqw] text-[#61BCA6]" />
          {profile.score}%<span className="text-[3.2cqw] opacity-85">{labels.ai}</span>
        </span>
        <span
          className="rounded-full border bg-black/35 px-[2.4cqw] py-[0.6cqw] text-[3.6cqw] font-bold"
          style={{ color: tierColor, borderColor: `${tierColor}99` }}
        >
          {labels.confidence}
        </span>
      </div>
      <span className="absolute top-[4cqw] flex items-center gap-[1cqw] rounded-full bg-[rgba(97,188,166,0.9)] px-[2.6cqw] py-[1.2cqw] text-[4.2cqw] font-bold text-white ltr:right-[4cqw] rtl:left-[4cqw]">
        <Check className="h-[4cqw] w-[4cqw]" strokeWidth={3} />
        {labels.available}
      </span>

      <div className="absolute inset-x-0 bottom-0 p-[5cqw] text-white">
        <div className="flex items-end justify-between gap-[3cqw]">
          <div className="min-w-0">
            <p className="truncate text-[8cqw] leading-tight font-bold">
              {profile.name}, {profile.age}
            </p>
            <p className="text-[5cqw] opacity-90">{service.title}</p>
          </div>
          <span
            dir="ltr"
            className="bg-brand-blue shrink-0 rounded-[3cqw] px-[3cqw] py-[1.6cqw] text-[4.8cqw] font-bold"
          >
            {labels.price}
          </span>
        </div>
        <p className="mt-[1.5cqw] flex items-center gap-[1cqw] text-[4.4cqw] opacity-85">
          <MapPin className="h-[4.4cqw] w-[4.4cqw]" color="#61BCA6" />
          {labels.distance}
        </p>
        <ul className="mt-[2.5cqw] flex flex-wrap gap-[1.6cqw]">
          {profile.tags.slice(0, 2).map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-[rgba(97,188,166,0.65)] px-[2.6cqw] py-[0.8cqw] text-[3.8cqw]"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
