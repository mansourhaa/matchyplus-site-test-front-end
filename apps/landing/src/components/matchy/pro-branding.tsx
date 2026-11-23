'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { APP_REGISTER_URL } from '@/lib/constants';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Eye, MapPin, Star, Store, Target } from 'lucide-react';
import Link from 'next/link';

import { toProfiles } from './belt-data';
import { Reveal } from './motion';
import { ReferralCode } from './referral';

/** One icon per benefit, in order: profile, targeted requests, local visibility, credibility. */
const ICONS = [Store, Target, Eye, Star];

/** "Your pro storefront": what a professional gets on Matchy+, beside a sample profile. */
export function ProBranding() {
  const { t, dir, tRows } = useI18n();
  const points = tRows('landing.brandPoints');
  const isRtl = dir === 'rtl';
  // Same sample plumber as in the services belt, so every section tells one story.
  const sample = toProfiles(tRows('landing.beltProfiles')).PLB;
  const stats = tRows('landing.brandSampleStats');

  return (
    <section className="relative z-10 bg-[#F4F8FC] py-20 md:py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 lg:grid-cols-2">
        <Reveal direction={isRtl ? 'right' : 'left'}>
          {/* side heading, same as steps / security / explore */}
          <p className="text-brand-teal text-sm font-semibold tracking-wide">
            {t('landing.brandEyebrow')}
          </p>
          <h2 className="text-brand-blue mt-2 text-2xl font-extrabold text-balance sm:text-3xl md:text-4xl">
            {t('landing.brandTitle')}
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg text-sm leading-relaxed md:text-base">
            {t('landing.brandBody')}
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {points.map(([title, text], index) => {
              const Icon = ICONS[index % ICONS.length];
              return (
                <li
                  key={title}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <span className="bg-brand-teal/15 text-brand-teal grid h-10 w-10 place-items-center rounded-xl">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-brand-navy mt-3 font-bold">{title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{text}</p>
                </li>
              );
            })}
          </ul>
        </Reveal>

        <Reveal direction={isRtl ? 'left' : 'right'} className="flex justify-center">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
            className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-[#2F76BB]/20"
          >
            <ReferralCode />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-brand-navy text-xl font-extrabold">{sample?.name}</p>
                  <p className="text-muted-foreground text-sm">{t('landing.brandSampleRole')}</p>
                </div>
                <span className="bg-brand-blue rounded-xl px-3 py-1.5 text-sm font-bold text-white">
                  {t('landing.beltPrice', { price: sample?.price ?? '' })}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-[#353535]">
                  <Star size={12} color="#F5A623" fill="#F5A623" />
                  {sample?.rating} ({sample?.reviews})
                </span>
                <span className="bg-brand-teal flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white">
                  <BadgeCheck size={13} />
                  {t('landing.beltAvailable')}
                </span>
              </div>
              <p className="text-muted-foreground mt-3 flex items-center gap-1 text-sm">
                <MapPin size={14} className="text-brand-teal" />
                {t('landing.brandSampleZone')}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {stats.map(([value, label]) => (
                  <div key={label} className="rounded-xl bg-slate-50 py-2">
                    <p className="text-brand-blue text-lg font-extrabold">
                      {value
                        .replace('{reviews}', sample?.reviews ?? '')
                        .replace('{score}', String(sample?.score ?? ''))}
                    </p>
                    <p className="text-muted-foreground text-[11px]">{label}</p>
                  </div>
                ))}
              </div>
              {/* the call to action sits inside the card, as the manager asked */}
              <Link
                href={APP_REGISTER_URL}
                className="bg-brand-blue hover:bg-brand-navy mt-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-colors md:text-base"
              >
                {t('landing.brandCta')}
                <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
