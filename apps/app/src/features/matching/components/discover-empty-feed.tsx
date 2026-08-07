'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useI18n } from '@/features/i18n/i18n-provider';
import { motion } from 'framer-motion';
import { Compass, Heart, MapPin, RefreshCw, Search, Users } from 'lucide-react';
import Link from 'next/link';

type DiscoverEmptyFeedProps = {
  errorKey?: string | null;
  refreshing?: boolean;
  onRefresh: () => void;
};

export function DiscoverEmptyFeed({ errorKey, refreshing, onRefresh }: DiscoverEmptyFeedProps) {
  const { t } = useI18n();
  const isError = Boolean(errorKey);

  return (
    <motion.div
      className="flex w-full max-w-md flex-col items-center px-6 text-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #61BCA633 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
        />
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-[28px] shadow-sm"
          style={{ background: matchyBrand.gradient135 }}
        >
          <Users size={34} color="white" strokeWidth={2.2} />
        </div>
        <motion.div
          className="absolute -right-1 -bottom-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-md"
          style={{ border: `1px solid ${matchyBrand.border}` }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <MapPin size={18} color={matchyBrand.teal} />
        </motion.div>
        <motion.div
          className="absolute -top-1 -left-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-md"
          style={{ border: `1px solid ${matchyBrand.border}` }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <Compass size={16} color={matchyBrand.blue} />
        </motion.div>
      </div>

      <h2
        className="mb-2 text-[22px] font-extrabold tracking-tight"
        style={{ color: matchyBrand.textDark }}
      >
        {isError ? t('matching.errors.feed') : t('matching.noProfilesTitle')}
      </h2>
      <p className="mb-6 text-[14px] leading-relaxed" style={{ color: matchyBrand.muted }}>
        {isError ? t('matching.noProfilesErrorHint') : t('matching.noProfilesDesc')}
      </p>

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-70"
        style={{ background: matchyBrand.gradient }}
      >
        <RefreshCw size={17} className={refreshing ? 'animate-spin' : undefined} />
        {t('matching.refreshFeed')}
      </button>

      {!isError && (
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Link
            href="/home?tab=search"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-bold transition-colors"
            style={{
              background: 'white',
              border: `1.5px solid ${matchyBrand.borderStrong}`,
              color: matchyBrand.blue,
            }}
          >
            <Search size={15} />
            {t('matching.trySearch')}
          </Link>
          <Link
            href="/matches"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-bold transition-colors"
            style={{
              background: matchyBrand.softTeal,
              border: `1.5px solid ${matchyBrand.teal}33`,
              color: '#2A8A74',
            }}
          >
            <Heart size={15} />
            {t('matching.checkMatches')}
          </Link>
        </div>
      )}
    </motion.div>
  );
}

export function DiscoverEmptyPicks() {
  const { t } = useI18n();
  return (
    <motion.div
      className="flex flex-col items-center rounded-2xl px-4 py-8 text-center"
      style={{ background: 'white', border: `1px dashed ${matchyBrand.borderStrong}` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <div
        className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ background: matchyBrand.softBlue }}
      >
        <Compass size={20} color={matchyBrand.blue} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: matchyBrand.textDark }}>
        {t('matching.noPicksTitle')}
      </p>
      <p className="mt-1" style={{ fontSize: 11, color: matchyBrand.muted, lineHeight: 1.45 }}>
        {t('matching.noPicksDesc')}
      </p>
    </motion.div>
  );
}
