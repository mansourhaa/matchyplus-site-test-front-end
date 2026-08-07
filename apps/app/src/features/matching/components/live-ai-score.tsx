'use client';

import { matchyBrand, scoreTierColor } from '@/components/matchy/brand';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { FeedProfile, ScoreBreakdown } from '@/features/matching/types';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

const CONFIDENCE_LABELS = {
  high: { fr: 'Très compatible', en: 'Highly compatible', ar: 'متوافق جداً', color: '#61BCA6' },
  medium: { fr: 'Bonne compatibilité', en: 'Good match', ar: 'توافق جيد', color: '#2F76BB' },
  low: {
    fr: 'Partiellement compatible',
    en: 'Partial match',
    ar: 'توافق جزئي',
    color: '#F5A623',
  },
} as const;

function useCountUp(target: number, duration = 700, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = Date.now() + delay;
    let raf = 0;
    const tick = () => {
      const now = Date.now();
      if (now < start) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return value;
}

function AnimatedBar({
  score,
  color,
  delay = 0,
}: {
  score: number;
  color: string;
  delay?: number;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), delay);
    return () => clearTimeout(t);
  }, [score, delay]);

  return (
    <div
      className="h-1.5 flex-1 overflow-hidden rounded-full"
      style={{ background: 'rgba(0,0,0,0.06)' }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: color,
          transition: 'width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />
    </div>
  );
}

function confidenceKey(raw: string): keyof typeof CONFIDENCE_LABELS {
  if (raw === 'high' || raw === 'medium' || raw === 'low') return raw;
  return 'medium';
}

export function AIThinkingAnimation() {
  const { locale } = useI18n();
  const labels = {
    fr: 'Analyse IA en cours',
    en: 'AI analyzing',
    ar: 'جارٍ التحليل بالذكاء الاصطناعي',
  };
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setDot((d) => (d + 1) % 4), 350);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2"
      style={{ background: 'rgba(47,118,187,0.08)', border: '1px solid rgba(47,118,187,0.15)' }}
    >
      <div
        className="flex h-6 w-6 items-center justify-center rounded-lg"
        style={{ background: matchyBrand.gradient135 }}
      >
        <Brain size={12} color="white" />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: matchyBrand.blue }}>
        {labels[locale]}
        {'...'.slice(0, dot)}
      </span>
    </div>
  );
}

export function MatchScoreBadge({
  score,
  size = 'md',
}: {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const color = scoreTierColor(score);
  if (size === 'lg') {
    return (
      <div
        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
        style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.22)' }}
      >
        <Brain size={14} color="#FFFFFF" />
        <span style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>
          {Math.round(score)}%
        </span>
        <span style={{ fontSize: 10, color: '#FFFFFF', opacity: 0.8 }}>IA</span>
      </div>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5"
      style={{
        background: `${color}22`,
        border: `1px solid ${color}55`,
        fontSize: 10,
        fontWeight: 700,
        color,
      }}
    >
      <Brain size={9} />
      {Math.round(score)}%
    </span>
  );
}

export function LiveScorePanel({
  profile,
  isComputing = false,
}: {
  profile: FeedProfile | null;
  isComputing?: boolean;
}) {
  const { locale } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const score = Math.round(profile?.match_score ?? 0);
  const totalDisplay = useCountUp(score, 800, 300);
  const confKey = confidenceKey(profile?.confidence || 'medium');
  const conf = CONFIDENCE_LABELS[confKey];
  const mainColor = scoreTierColor(score);
  const dims: ScoreBreakdown[] = profile?.compatibility ?? [];

  if (isComputing) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-8 rounded-xl" style={{ background: '#F0F0F0' }} />
        <div className="h-4 rounded-lg" style={{ background: '#F5F5F5', width: '80%' }} />
        <div className="h-4 rounded-lg" style={{ background: '#F5F5F5', width: '60%' }} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <motion.div
      className="overflow-hidden rounded-2xl"
      style={{ background: 'white', border: `1.5px solid ${mainColor}40` }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: `linear-gradient(135deg, ${mainColor}18, ${mainColor}08)` }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{ background: matchyBrand.gradient135 }}
          >
            <Brain size={16} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: '0.5px' }}>
              {locale === 'en'
                ? 'AI MATCHING SCORE'
                : locale === 'ar'
                  ? 'نقاط التوافق بالذكاء الاصطناعي'
                  : 'SCORE IA DE MATCHING'}
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: conf.color }}>
              {locale === 'en' ? conf.en : locale === 'ar' ? conf.ar : conf.fr}
            </p>
          </div>
        </div>
        <div className="relative h-14 w-14">
          <svg width="56" height="56" viewBox="0 0 56 56" className="absolute inset-0">
            <circle cx="28" cy="28" r="24" fill="none" stroke="#F0F0F0" strokeWidth="4" />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke={mainColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - totalDisplay / 100)}`}
              style={{
                transformOrigin: 'center',
                transform: 'rotate(-90deg)',
                transition: 'stroke-dashoffset 0.8s ease',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontSize: 13, fontWeight: 800, color: mainColor }}>{totalDisplay}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 border-b px-4 py-3" style={{ borderColor: `${mainColor}20` }}>
        <p style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>
          {profile.match_type_label || conf.fr}
        </p>
        {profile.liked_me && (
          <p style={{ fontSize: 11, color: matchyBrand.teal, fontWeight: 600 }}>
            {locale === 'en'
              ? 'Already liked you'
              : locale === 'ar'
                ? 'أعجب بك مسبقاً'
                : 'Vous a déjà liké'}
          </p>
        )}
      </div>

      {dims.length > 0 && (
        <>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-2.5"
            onClick={() => setExpanded(!expanded)}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: '0.5px' }}>
              {locale === 'en' ? 'DETAILS' : locale === 'ar' ? 'التفاصيل' : 'DÉTAIL'}
            </span>
            {expanded ? (
              <ChevronUp size={14} color="#AAA" />
            ) : (
              <ChevronDown size={14} color="#AAA" />
            )}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                className="space-y-2.5 px-4 pt-2 pb-3"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                {dims.map((d, i) => {
                  const color = scoreTierColor(d.score);
                  return (
                    <div key={d.dimension}>
                      <div className="mb-1 flex items-center justify-between">
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#555' }}>
                          {d.dimension}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color }}>
                          {Math.round(d.score)}%
                        </span>
                      </div>
                      <AnimatedBar score={d.score} color={color} delay={i * 80} />
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

export function AIRecommendationItem({
  profile,
  rank,
  onClick,
}: {
  profile: FeedProfile;
  rank: number;
  onClick: () => void;
}) {
  const color = scoreTierColor(profile.match_score);
  const count = useCountUp(Math.round(profile.match_score), 600, rank * 80);
  const role = profile.service_type || profile.job || profile.category || '';
  const photo = useAuthenticatedMediaUrl(profile.image);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition-colors hover:bg-[#F5F7FA]"
      style={{ border: '1px solid #F0F0F0', background: 'white' }}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.06 }}
    >
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{
          background:
            rank <= 1
              ? 'linear-gradient(135deg, #F5A623, #E74C3C)'
              : rank <= 3
                ? matchyBrand.gradient135
                : '#F5F5F5',
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 800, color: rank <= 3 ? 'white' : '#888' }}>
          #{rank + 1}
        </span>
      </div>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold text-white"
        style={{ background: matchyBrand.gradient135 }}
      >
        {photo.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt="" className="h-full w-full object-cover" />
        ) : (
          profile.name.slice(0, 1)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate" style={{ fontSize: 12, fontWeight: 700, color: '#353535' }}>
          {profile.name}
        </p>
        <p className="truncate" style={{ fontSize: 10, color: '#888' }}>
          {role}
        </p>
      </div>
      <div className="relative h-9 w-9 shrink-0">
        <svg width="36" height="36" viewBox="0 0 36 36" className="absolute inset-0">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#F0F0F0" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 14}`}
            strokeDashoffset={`${2 * Math.PI * 14 * (1 - count / 100)}`}
            style={{
              transformOrigin: 'center',
              transform: 'rotate(-90deg)',
              transition: 'stroke-dashoffset 0.7s ease',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: 9, fontWeight: 800, color }}>{count}%</span>
        </div>
      </div>
    </motion.button>
  );
}

export function AIPicksHeader({ count }: { count: number }) {
  const { locale } = useI18n();
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <motion.div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: matchyBrand.gradient135 }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        >
          <Zap size={14} color="white" />
        </motion.div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#353535' }}>
            {locale === 'en'
              ? 'Top AI Picks'
              : locale === 'ar'
                ? 'أفضل اقتراحات الذكاء الاصطناعي'
                : 'Top suggestions IA'}
          </p>
          <p style={{ fontSize: 10, color: '#888' }}>
            {locale === 'en'
              ? 'Ranked by compatibility'
              : locale === 'ar'
                ? 'مرتّبة حسب التوافق'
                : 'Classés par compatibilité'}
          </p>
        </div>
      </div>
      <span
        className="rounded-full px-2 py-0.5"
        style={{ background: '#E8F0FA', color: '#2F76BB', fontSize: 11, fontWeight: 700 }}
      >
        {count}
      </span>
    </div>
  );
}
