'use client';

import { matchyBrand, scoreTierColor } from '@/components/matchy/brand';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { FeedProfile, ScoreBreakdown } from '@/features/matching/types';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Brain,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Rocket,
  Sparkles,
  Star,
  Target,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export function AIRightSidebarLocationEmpty({
  onActivate,
  activating,
}: {
  onActivate: () => void;
  activating: boolean;
}) {
  const { locale } = useI18n();
  const isRtl = locale === 'ar';

  return (
    <div className="flex flex-col gap-3 p-1">
      <div
        className="relative overflow-hidden rounded-2xl p-4 text-center shadow-xs"
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F9FF 100%)',
          border: '1px solid #E2E8F0',
        }}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#61BCA6]/20 to-[#2F76BB]/20 text-[#2F76BB]">
          <Sparkles size={22} className="animate-pulse" />
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }} className="mb-1">
          {locale === 'en'
            ? 'Live AI Matching'
            : locale === 'ar'
              ? 'تحليل التوافق بالذكاء الاصطناعي'
              : 'Matchs IA en direct'}
        </h3>
        <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }} className="mb-4">
          {locale === 'en'
            ? 'Enable location to unlock live AI compatibility scoring and top recommendations near you.'
            : locale === 'ar'
              ? 'قم بتمكين الموقع الجغرافي لتفعيل التوافق المباشر وأفضل التوصيات القريبة منك.'
              : 'Activez la localisation pour calculer en direct votre score IA et débloquer les recommandations Top Picks.'}
        </p>

        <div className={`mb-4 space-y-2 ${isRtl ? 'text-right' : 'text-left'}`}>
          <div className="flex items-center gap-2.5 rounded-xl border border-[#EDF2F7] bg-white p-2.5 shadow-xs">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF5FF] text-[#2F76BB]">
              <BrainCircuit size={15} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#2D3748' }}>
                {locale === 'en'
                  ? 'AI Compatibility'
                  : locale === 'ar'
                    ? 'التوافق بالذكاء الاصطناعي'
                    : 'Affinité IA'}
              </p>
              <p style={{ fontSize: 10, color: '#718096' }}>
                {locale === 'en'
                  ? 'Real-time match scoring'
                  : locale === 'ar'
                    ? 'حساب التوافق في الوقت الفعلي'
                    : 'Score calculé en temps réel'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-[#EDF2F7] bg-white p-2.5 shadow-xs">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E6F7F3] text-[#61BCA6]">
              <Star size={15} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#2D3748' }}>
                {locale === 'en'
                  ? 'Top AI Picks'
                  : locale === 'ar'
                    ? 'أفضل ترشيحات الذكاء الاصطناعي'
                    : 'Top AI Picks'}
              </p>
              <p style={{ fontSize: 10, color: '#718096' }}>
                {locale === 'en'
                  ? 'Personalized recommendations'
                  : locale === 'ar'
                    ? 'توصيات مخصصة لك'
                    : 'Recommandations sur-mesure'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-[#EDF2F7] bg-white p-2.5 shadow-xs">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FFF5E6] text-[#F5A623]">
              <MapPin size={15} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#2D3748' }}>
                {locale === 'en'
                  ? 'Proximity Filter'
                  : locale === 'ar'
                    ? 'ميزة القرب الجغرافي'
                    : 'Proximité'}
              </p>
              <p style={{ fontSize: 10, color: '#718096' }}>
                {locale === 'en'
                  ? 'Profiles near your area'
                  : locale === 'ar'
                    ? 'ملفات شخصية قريبة منك'
                    : 'Profils autour de chez vous'}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onActivate}
          disabled={activating}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-60"
          style={{ background: matchyBrand.gradient, fontSize: 12 }}
        >
          {activating ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
          <span>
            {activating
              ? locale === 'en'
                ? 'Activating...'
                : locale === 'ar'
                  ? 'جارٍ التفعيل...'
                  : 'Activation...'
              : locale === 'en'
                ? 'Enable location'
                : locale === 'ar'
                  ? 'تفعيل الموقع'
                  : 'Activer la localisation'}
          </span>
        </button>
      </div>
    </div>
  );
}

export function AIRightSidebarNoProfileEmpty() {
  const { locale } = useI18n();
  const isRtl = locale === 'ar';

  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl p-4 text-center shadow-xs"
      style={{
        background: 'white',
        border: '1px solid #E2E8F0',
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF5FF] text-[#2F76BB]">
        <Sparkles size={20} />
      </div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }} className="mb-1">
        {locale === 'en'
          ? 'AI Match Insights'
          : locale === 'ar'
            ? 'تحليلات التوافق بالذكاء الاصطناعي'
            : 'Analyse IA Matchy'}
      </h3>
      <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
        {locale === 'en'
          ? 'Browse profiles to see real-time compatibility scores and personalized AI suggestions.'
          : locale === 'ar'
            ? 'تصفح الملفات الشخصية لعرض نقاط التوافق في الوقت الفعلي واقتراحات الذكاء الاصطناعي المخصصة لك.'
            : 'Parcourez les profils pour afficher les scores de compatibilité IA et les suggestions personnalisées.'}
      </p>
    </div>
  );
}

const CONFIDENCE_LABELS = {
  high: { fr: 'Très compatible', en: 'Highly compatible', ar: 'متوافق جداً', color: '#10B981' },
  medium: { fr: 'Bonne compatibilité', en: 'Good match', ar: 'توافق جيد', color: '#2F76BB' },
  low: {
    fr: 'Partiellement compatible',
    en: 'Partial match',
    ar: 'توافق جزئي',
    color: '#F59E0B',
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
    <div className="h-[7px] w-full overflow-hidden rounded-full" style={{ background: '#F1F5F9' }}>
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
  return 'low';
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

type DimensionItem = {
  key: string;
  label: string;
  score: number;
  color: string;
  icon: React.ReactNode;
};

export function LiveScorePanel({
  profile,
  isComputing = false,
}: {
  profile: FeedProfile | null;
  isComputing?: boolean;
}) {
  const { locale } = useI18n();
  const [expanded, setExpanded] = useState(true);
  const score = Math.round(profile?.match_score ?? 54);
  const totalDisplay = useCountUp(score, 800, 300);
  const confKey = confidenceKey(
    profile?.confidence || (score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low'),
  );
  const conf = CONFIDENCE_LABELS[confKey];
  const ringColor = confKey === 'low' ? '#F59E0B' : scoreTierColor(score);

  const rawDims: ScoreBreakdown[] = profile?.compatibility ?? [];

  const getDimensionScore = (dimensionKey: string, fallback: number): number => {
    const found = rawDims.find(
      (d) =>
        d.dimension.toLowerCase() === dimensionKey.toLowerCase() ||
        d.dimension.toLowerCase().includes(dimensionKey.toLowerCase()),
    );
    return found ? Math.round(found.score) : fallback;
  };

  const skillsScore = getDimensionScore(
    'interests',
    profile?.interests?.length ? Math.min(100, profile.interests.length * 20) : 0,
  );
  const geoScore = getDimensionScore(
    'geo',
    profile?.distance_km != null
      ? Math.max(0, Math.min(100, Math.round(100 - (profile.distance_km / 25) * 80)))
      : 88,
  );
  const goalScore = getDimensionScore('goals', 38);
  const availScore = getDimensionScore('availability', 50);
  const langScore = getDimensionScore('languages', 60);
  const qualityScore = getDimensionScore(
    'quality',
    Math.round(Math.min(100, Math.max(40, ((profile?.rating || 4.9) / 5) * 75))),
  );

  const getColorForScore = (val: number, defaultColor?: string) => {
    if (defaultColor) return defaultColor;
    if (val >= 80) return '#10B981';
    if (val >= 70) return '#2563EB';
    if (val >= 50) return '#F59E0B';
    if (val >= 30) return '#64748B';
    return '#94A3B8';
  };

  const dimensions: DimensionItem[] = [
    {
      key: 'skills_interests',
      label:
        locale === 'en'
          ? 'Skills & interests'
          : locale === 'ar'
            ? 'المهارات والاهتمامات'
            : "Compétences & centres d'intérêt",
      score: skillsScore,
      color: skillsScore === 0 ? '#94A3B8' : getColorForScore(skillsScore),
      icon: <Target size={16} className="text-[#EC4899]" />,
    },
    {
      key: 'geographic_proximity',
      label:
        locale === 'en'
          ? 'Geographic proximity'
          : locale === 'ar'
            ? 'القرب الجغرافي'
            : 'Proximité géographique',
      score: geoScore,
      color: '#10B981',
      icon: <MapPin size={16} className="text-[#E11D48]" />,
    },
    {
      key: 'goal_alignment',
      label:
        locale === 'en'
          ? 'Goal alignment'
          : locale === 'ar'
            ? 'توافق الأهداف'
            : 'Alignement des objectifs',
      score: goalScore,
      color: '#64748B',
      icon: <Rocket size={16} className="text-[#EC4899]" />,
    },
    {
      key: 'shared_availability',
      label:
        locale === 'en'
          ? 'Shared availability'
          : locale === 'ar'
            ? 'التوفر المشترك'
            : 'Disponibilité partagée',
      score: availScore,
      color: '#F59E0B',
      icon: <Clock size={16} className="text-[#EC4899]" />,
    },
    {
      key: 'common_languages',
      label:
        locale === 'en'
          ? 'Common languages'
          : locale === 'ar'
            ? 'اللغات المشتركة'
            : 'Langues communes',
      score: langScore,
      color: '#F59E0B',
      icon: <Globe size={16} className="text-[#0EA5E9]" />,
    },
    {
      key: 'profile_quality',
      label:
        locale === 'en'
          ? 'Profile quality'
          : locale === 'ar'
            ? 'جودة الملف الشخصي'
            : 'Qualité du profil',
      score: qualityScore,
      color: '#2563EB',
      icon: <Star size={16} className="fill-[#F59E0B] text-[#F59E0B]" />,
    },
  ];

  const distanceKm = profile?.distance_km ?? 1.9;
  const proximityQualifier =
    distanceKm <= 3
      ? locale === 'en'
        ? 'very close'
        : locale === 'ar'
          ? 'قريب جداً'
          : 'très proche'
      : distanceKm <= 10
        ? locale === 'en'
          ? 'nearby'
          : locale === 'ar'
            ? 'بالقرب منك'
            : 'à proximité'
        : locale === 'en'
          ? 'in your area'
          : locale === 'ar'
            ? 'في منطقتك'
            : 'dans votre région';

  const goalAlignmentLabel =
    goalScore < 45
      ? locale === 'en'
        ? 'Low goal alignment'
        : locale === 'ar'
          ? 'توافق أهداف منخفض'
          : 'Faible alignement des objectifs'
      : goalScore < 75
        ? locale === 'en'
          ? 'Moderate goal alignment'
          : locale === 'ar'
            ? 'توافق أهداف متوسط'
            : 'Alignement modéré des objectifs'
        : locale === 'en'
          ? 'High goal alignment'
          : locale === 'ar'
            ? 'توافق أهداف مرتفع'
            : 'Fort alignement des objectifs';

  const ratingVal = (profile?.rating || 4.9).toFixed(1);
  const reviewsCount = profile?.rating ? 62 : 62;

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
      className="overflow-hidden rounded-3xl shadow-xs"
      style={{
        background: '#FFFDF7',
        border: '1.5px solid #F6E6CC',
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-xs"
            style={{ background: 'linear-gradient(135deg, #38B2AC 0%, #2B6CB0 100%)' }}
          >
            <Brain size={20} color="white" strokeWidth={2.2} />
          </div>
          <div>
            <p
              className="text-[11.5px] font-bold tracking-[0.04em] uppercase"
              style={{ color: '#475569' }}
            >
              {locale === 'en'
                ? 'AI MATCHING SCORE'
                : locale === 'ar'
                  ? 'نقاط التوافق بالذكاء الاصطناعي'
                  : 'SCORE IA DE MATCHING'}
            </p>
            <p className="text-[14px] font-bold" style={{ color: conf.color }}>
              {locale === 'en' ? conf.en : locale === 'ar' ? conf.ar : conf.fr}
            </p>
          </div>
        </div>

        {/* Circular Radial Donut Progress */}
        <div className="relative h-13 w-13">
          <svg width="52" height="52" viewBox="0 0 52 52" className="absolute inset-0">
            <circle cx="26" cy="26" r="21" fill="none" stroke="#F1F5F9" strokeWidth="4.5" />
            <circle
              cx="26"
              cy="26"
              r="21"
              fill="none"
              stroke={ringColor}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 21}`}
              strokeDashoffset={`${2 * Math.PI * 21 * (1 - totalDisplay / 100)}`}
              style={{
                transformOrigin: 'center',
                transform: 'rotate(-90deg)',
                transition: 'stroke-dashoffset 0.8s ease',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[13px] font-extrabold" style={{ color: ringColor }}>
              {totalDisplay}%
            </span>
          </div>
        </div>
      </div>

      {/* Quick Highlights list */}
      <div
        className="space-y-2 px-4 pt-1 pb-3.5 text-[12px] font-medium"
        style={{ color: '#475569' }}
      >
        <div className="flex items-center gap-2">
          <MapPin size={15} className="shrink-0 text-[#E11D48]" />
          <span>
            {distanceKm} km away — {proximityQualifier}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Star size={15} className="shrink-0 fill-[#F59E0B] text-[#F59E0B]" />
          <span>
            {locale === 'en'
              ? `Rating ${ratingVal}/5 · ${reviewsCount} reviews · Available`
              : locale === 'ar'
                ? `التقييم ${ratingVal}/5 · ${reviewsCount} تقييم · متاح`
                : `Note ${ratingVal}/5 · ${reviewsCount} avis · Disponible`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Rocket size={15} className="shrink-0 text-[#EC4899]" />
          <span>{goalAlignmentLabel}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#F2EADB]" />

      {/* Collapsible Details Section */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-2.5 transition-colors hover:bg-[#FDF8EE]"
        onClick={() => setExpanded(!expanded)}
      >
        <span
          className="text-[11.5px] font-bold tracking-[0.05em] uppercase"
          style={{ color: '#64748B' }}
        >
          {locale === 'en' ? 'DETAILS' : locale === 'ar' ? 'التفاصيل' : 'DÉTAILS'}
        </span>
        {expanded ? (
          <ChevronUp size={15} color="#94A3B8" />
        ) : (
          <ChevronDown size={15} color="#94A3B8" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="space-y-2.5 px-4 pt-1 pb-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {dimensions.map((dim, i) => (
              <div key={dim.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {dim.icon}
                    <span className="text-[12.5px] font-semibold text-[#334155]">{dim.label}</span>
                  </div>
                  <span className="text-[12.5px] font-bold" style={{ color: dim.color }}>
                    {dim.score}%
                  </span>
                </div>
                <AnimatedBar score={dim.score} color={dim.color} delay={i * 60} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
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
  const isLocked = Boolean(profile.is_locked || rank >= 3);
  const color = scoreTierColor(profile.match_score);
  const count = useCountUp(Math.round(profile.match_score), 600, rank * 80);
  const role = profile.service_type || profile.job || profile.category || '';
  const photo = useAuthenticatedMediaUrl(profile.image);

  if (isLocked) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        className="relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl p-2.5 text-left transition-colors hover:bg-[#F5F7FA]"
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
          className="flex items-center gap-1 rounded-lg px-2 py-1"
          style={{ background: 'rgba(47,118,187,0.1)', color: '#2F76BB' }}
        >
          <Lock size={12} color="#2F76BB" />
          <span style={{ fontSize: 10, fontWeight: 700 }}>VIP</span>
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
