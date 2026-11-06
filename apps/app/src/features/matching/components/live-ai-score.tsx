'use client';

import { matchyBrand, scoreTierColor } from '@/components/matchy/brand';
import { useI18n } from '@/features/i18n/i18n-provider';
import { formatRole } from '@/features/matching/lib/format-role';
import type { FeedProfile, ScoreBreakdown } from '@/features/matching/types';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Brain,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  MapPin,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export function AIRightSidebarLocationEmpty() {
  const { locale } = useI18n();

  return (
    <div className="py-6 text-center">
      <p style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>
        {locale === 'en'
          ? 'Live compatibility scores and recommendations will appear here.'
          : locale === 'ar'
            ? 'ستظهر مؤشرات التوافق والتوصيات المخصصة هنا.'
            : 'Les analyses de compatibilité et les suggestions apparaîtront ici.'}
      </p>
    </div>
  );
}

export function AIRightSidebarNoProfileEmpty() {
  const { locale } = useI18n();

  return (
    <div className="py-6 text-center">
      <p style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>
        {locale === 'en'
          ? 'Browse profiles to see real-time compatibility scores.'
          : 'Parcourez les profils pour afficher les scores de compatibilité IA.'}
      </p>
    </div>
  );
}

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
  label,
  size = 'md',
}: {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const color = scoreTierColor(score);
  if (size === 'lg') {
    return (
      <div className="flex flex-col items-start gap-1">
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-white shadow-sm backdrop-blur-md"
          style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.25)' }}
        >
          <Brain size={14} className="text-[#61BCA6]" />
          <span style={{ fontSize: 13, fontWeight: 800 }}>{Math.round(score)}%</span>
          <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.85 }}>IA</span>
        </div>
        {label && (
          <div
            className="rounded-full px-2.5 py-0.5 text-white shadow-xs backdrop-blur-md"
            style={{
              background: 'rgba(47,118,187,0.75)',
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {label}
          </div>
        )}
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
  const { t, locale } = useI18n();
  const [expanded, setExpanded] = useState(true);
  const score = Math.round(profile?.match_score ?? 0);
  const totalDisplay = useCountUp(score, 800, 300);
  const confKey = confidenceKey(
    profile?.confidence || (score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low'),
  );
  const conf = CONFIDENCE_LABELS[confKey];
  const dims: ScoreBreakdown[] = profile?.compatibility ?? [];

  const skillsScore =
    dims.find((d) => d.dimension?.toLowerCase() === 'skills')?.score ??
    dims.find((d) => d.dimension?.toLowerCase() === 'sector')?.score ??
    (profile?.interests && profile.interests.length > 0 ? 70 : 0);

  const proximityScore =
    dims.find((d) => d.dimension?.toLowerCase() === 'proximity')?.score ??
    (profile?.distance_km != null && Number.isFinite(profile.distance_km)
      ? Math.max(10, Math.min(100, Math.round(100 - profile.distance_km * 6)))
      : 50);

  const goalsScore =
    dims.find((d) => d.dimension?.toLowerCase() === 'goals')?.score ??
    (profile?.goals && profile.goals.length > 0 ? 65 : 38);

  const availabilityScore =
    dims.find((d) => d.dimension?.toLowerCase() === 'availability')?.score ??
    (profile?.availability_days && profile.availability_days.length > 0 ? 50 : 30);

  const languagesScore =
    dims.find((d) => d.dimension?.toLowerCase() === 'languages')?.score ?? 60;

  const qualityScore =
    dims.find((d) => d.dimension?.toLowerCase() === 'quality')?.score ??
    (profile?.rating != null ? Math.round(Math.min(100, profile.rating * 16)) : 75);

  if (isComputing) {
    return (
      <div className="animate-pulse space-y-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
        <div className="h-10 rounded-xl bg-slate-100" />
        <div className="h-4 w-4/5 rounded-lg bg-slate-100" />
        <div className="h-4 w-3/5 rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (!profile) return null;

  const dimensions = [
    {
      key: 'skills',
      label: t('matching.aiScore.dimensions.skills'),
      emoji: '🎯',
      score: skillsScore,
      barColor: skillsScore > 0 ? '#10B981' : '#E2E8F0',
      textColor: skillsScore > 0 ? '#10B981' : '#94A3B8',
    },
    {
      key: 'proximity',
      label: t('matching.aiScore.dimensions.proximity'),
      emoji: '📍',
      score: proximityScore,
      barColor: '#10B981',
      textColor: '#10B981',
    },
    {
      key: 'goals',
      label: t('matching.aiScore.dimensions.goals'),
      emoji: '🚀',
      score: goalsScore,
      barColor: goalsScore < 45 ? '#64748B' : '#8B5CF6',
      textColor: goalsScore < 45 ? '#64748B' : '#8B5CF6',
    },
    {
      key: 'availability',
      label: t('matching.aiScore.dimensions.availability'),
      emoji: '⏰',
      score: availabilityScore,
      barColor: '#F5A623',
      textColor: '#F5A623',
    },
    {
      key: 'languages',
      label: t('matching.aiScore.dimensions.languages'),
      emoji: '🌐',
      score: languagesScore,
      barColor: '#F5A623',
      textColor: '#0EA5E9',
    },
    {
      key: 'quality',
      label: t('matching.aiScore.dimensions.quality'),
      emoji: '⭐',
      score: qualityScore,
      barColor: '#2563EB',
      textColor: '#2563EB',
    },
  ];

  const ringRadius = 22;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - totalDisplay / 100);

  return (
    <motion.div
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3.5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-xs"
            style={{ background: 'linear-gradient(135deg, #38B2AC, #0D9488)' }}
          >
            <Brain size={22} color="white" />
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              {locale === 'en'
                ? 'AI MATCHING SCORE'
                : locale === 'ar'
                  ? 'نقاط التوافق بالذكاء الاصطناعي'
                  : 'SCORE IA DE MATCHING'}
            </p>
            <p className="text-[15px] font-bold" style={{ color: conf.color }}>
              {locale === 'en' ? conf.en : locale === 'ar' ? conf.ar : conf.fr}
            </p>
          </div>
        </div>

        {/* Circular Ring Gauge */}
        <div className="relative h-13 w-13 shrink-0">
          <svg width="52" height="52" viewBox="0 0 52 52" className="absolute inset-0">
            <circle cx="26" cy="26" r={ringRadius} fill="none" stroke="#EDF2F7" strokeWidth="4" />
            <circle
              cx="26"
              cy="26"
              r={ringRadius}
              fill="none"
              stroke="#64748B"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              style={{
                transformOrigin: 'center',
                transform: 'rotate(-90deg)',
                transition: 'stroke-dashoffset 0.8s ease',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[13px] font-extrabold text-slate-600">{totalDisplay}%</span>
          </div>
        </div>
      </div>

      {/* Summary bullet highlights */}
      <div className="space-y-2 border-t border-slate-100 py-3 text-[12.5px] font-medium text-slate-600">
        {profile.distance_km != null && Number.isFinite(profile.distance_km) && (
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span>
              {profile.distance_km.toFixed(1)} km{' '}
              {locale === 'fr' ? 'de vous' : locale === 'ar' ? 'عنك' : 'away'}
              {profile.distance_km <= 5 ? ` — ` : ''}
              {profile.distance_km <= 5 && (
                <span className="font-semibold text-slate-700">
                  {t('matching.aiScore.veryClose')}
                </span>
              )}
              {profile.distance_km > 5 && profile.distance_km <= 15 && (
                <span className="font-semibold text-slate-700">
                  {t('matching.aiScore.nearby')}
                </span>
              )}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span>⭐</span>
          <span>
            {locale === 'fr' ? 'Note ' : locale === 'ar' ? 'التقييم ' : 'Rating '}
            {Number.isFinite(profile.rating) ? profile.rating.toFixed(1) : '4.5'}/5
            {profile.reviews != null && profile.reviews > 0 ? (
              <>
                {' · '}
                {profile.reviews} {locale === 'fr' ? 'avis' : locale === 'ar' ? 'تقييم' : 'reviews'}
              </>
            ) : null}
            {' · '}
            <span className="font-medium text-slate-700">{t('matching.available')}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>🚀</span>
          <span>
            {goalsScore >= 70
              ? t('matching.aiScore.highGoalAlignment')
              : goalsScore >= 45
                ? t('matching.aiScore.moderateGoalAlignment')
                : t('matching.aiScore.lowGoalAlignment')}
          </span>
        </div>
      </div>

      {/* DETAILS Collapsible Section */}
      <div className="border-t border-slate-100 pt-1">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between py-2.5 transition-colors hover:opacity-80"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            {locale === 'en' ? 'DETAILS' : locale === 'ar' ? 'التفاصيل' : 'DÉTAILS'}
          </span>
          {expanded ? (
            <ChevronUp size={15} className="text-slate-400" />
          ) : (
            <ChevronDown size={15} className="text-slate-400" />
          )}
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              className="space-y-3 overflow-hidden pt-1 pb-1"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {dimensions.map((d, i) => (
                <div key={d.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <span>{d.emoji}</span>
                      <span>{d.label}</span>
                    </div>
                    <span className="font-bold" style={{ color: d.textColor }}>
                      {d.score}%
                    </span>
                  </div>
                  <AnimatedBar score={d.score} color={d.barColor} delay={i * 60} />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function AIRecommendationItem({
  profile,
  rank,
  onClick,
  onDismiss,
}: {
  profile: FeedProfile;
  rank: number;
  onClick?: () => void;
  onDismiss?: () => void;
}) {
  const isLocked = Boolean(profile.is_locked || rank >= 3);
  const color = scoreTierColor(profile.match_score);
  const count = useCountUp(Math.round(profile.match_score), 600, rank * 80);
  const { t } = useI18n();
  const rawRole = profile.service_type || profile.job || profile.category || '';
  const role = formatRole(rawRole, t);
  const photo = useAuthenticatedMediaUrl(profile.image);

  if (isLocked) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={t('search.lockedProfile')}
        className="relative flex w-full cursor-pointer items-center gap-2.5 overflow-hidden rounded-xl p-2.5 text-left transition-colors hover:bg-[#F5F7FA] active:scale-[0.99]"
        style={{ border: '1px solid #F0F0F0', background: 'white' }}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: rank * 0.06 }}
      >
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{ background: '#F5F5F5' }}
        >
          <span style={{ fontSize: 9, fontWeight: 800, color: '#888' }}>#{rank + 1}</span>
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-200"
          style={{ filter: 'blur(5px)' }}
        >
          <div className="h-full w-full bg-gradient-to-br from-gray-300 to-gray-400" />
        </div>
        <div className="min-w-0 flex-1" style={{ filter: 'blur(4px)', userSelect: 'none' }}>
          <p className="truncate" style={{ fontSize: 12, fontWeight: 700, color: '#353535' }}>
            ███████
          </p>
          <p className="truncate" style={{ fontSize: 10, color: '#888' }}>
            {role || 'Matchy+ User'}
          </p>
        </div>
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'rgba(217,119,6,0.12)', color: '#D97706' }}
        >
          <Lock size={14} color="#D97706" />
        </div>
      </motion.button>
    );
  }

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
      <div className="flex shrink-0 items-center gap-1.5">
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
        {onDismiss && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onDismiss();
              }
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <X size={13} />
          </span>
        )}
      </div>
    </motion.button>
  );
}

export function AIPicksHeader({ count }: { count: number }) {
  const { locale } = useI18n();
  return (
    <div className="flex w-full items-center justify-between">
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
                ? 'أفضل ترشيحات الذكاء الاصطناعي'
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
