import { useI18n } from '@/features/i18n/i18n-provider';
import { LangPickerLight } from '@/features/onboarding/components/lang-picker-light';
import type { ReactNode } from 'react';

import { MatchyLogoWhite } from './matchy-logo';

function AuthFeatures() {
  const { t } = useI18n();

  return [
    {
      emoji: '⚡',
      title: t('layout.featureInstantMatching'),
      desc: t('layout.featureInstantMatchingDesc'),
    },
    {
      emoji: '📍',
      title: t('layout.featureGeolocation'),
      desc: t('layout.featureGeolocationDesc'),
    },
    {
      emoji: '🎥',
      title: t('layout.featureVideoAI'),
      desc: t('layout.featureVideoAIDesc'),
    },
    {
      emoji: '💬',
      title: t('layout.featureChat'),
      desc: t('layout.featureChatDesc'),
    },
    {
      emoji: '👑',
      title: t('layout.featureFreemium'),
      desc: t('layout.featureFreemiumDesc'),
    },
  ];
}

type AuthLayoutProps = {
  children: ReactNode;
  activeFeature?: number;
  step?: number;
  totalSteps?: number;
  stepLabel?: string;
  panelImage?: string;
  hideVideoFeature?: boolean;
  /** When false, hide the floating corner picker (child screens that already render their own). */
  showPanelLangPicker?: boolean;
};

/**
 * The two-pane brand shell every auth screen sits in: a gradient brand panel (desktop
 * only) on the left, and the actual screen content on the right. Ported from the old
 * app's AuthLayout — same colors/spacing/copy, single-language (French) for now.
 */
export function AuthLayout({
  children,
  activeFeature,
  step,
  totalSteps,
  stepLabel,
  panelImage,
  hideVideoFeature = false,
  showPanelLangPicker = true,
}: AuthLayoutProps) {
  const { t } = useI18n();
  const features = AuthFeatures();
  const panelFeatures = hideVideoFeature
    ? features.filter((_, index: number) => index !== 2)
    : features;

  return (
    <div className="flex min-h-dvh min-h-screen" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
      {/* Left brand panel (desktop only) */}
      <div
        className="relative hidden flex-col overflow-hidden md:flex"
        style={{
          width: '420px',
          minWidth: '360px',
          background: 'linear-gradient(160deg, #0f4c8a 0%, #2F76BB 45%, #61BCA6 100%)',
          flexShrink: 0,
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {panelImage && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={panelImage} alt="" className="h-full w-full object-cover opacity-20" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(160deg, rgba(15,76,138,0.85) 0%, rgba(47,118,187,0.75) 50%, rgba(97,188,166,0.8) 100%)',
              }}
            />
          </div>
        )}

        <div className="relative z-10 flex h-full flex-col px-8 py-8">
          <div className="mb-8 flex items-center justify-between">
            <MatchyLogoWhite size="md" />
          </div>

          {step !== undefined && totalSteps !== undefined && (
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                  {t('layout.stepOf', { step, total: totalSteps })}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>
                  {t('layout.stepProgress', { progress: Math.round((step / totalSteps) * 100) })}
                </span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(step / totalSteps) * 100}%`, background: '#61BCA6' }}
                />
              </div>
              {stepLabel && (
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginTop: '8px' }}>
                  {stepLabel}
                </p>
              )}
            </div>
          )}

          <div className="mb-8">
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
              {t('layout.professionalMatching')}
              <br />
              {t('layout.matching')}
              <br />
              <span style={{ color: '#61BCA6' }}>{t('layout.geoLocalized')}</span>
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.65)',
                marginTop: '12px',
                lineHeight: 1.6,
              }}
            >
              {t('layout.professionalMatchingDesc')}
            </p>
          </div>

          <div className="flex-1 space-y-4">
            {panelFeatures.map((feature, index) => {
              const isActive = activeFeature === index;
              return (
                <div
                  key={feature.title}
                  className="flex items-start gap-3 rounded-2xl p-3 transition-all"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
                    border: isActive ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                      fontSize: '18px',
                    }}
                  >
                    {feature.emoji}
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>
                      {feature.title}
                    </p>
                    <p
                      style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}
                    >
                      {feature.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '24px' }}>
            {t('layout.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>

      {/* Right content panel */}
      <div className="relative flex min-h-dvh min-h-screen flex-1 flex-col overflow-hidden">
        {showPanelLangPicker ? (
          <div className="absolute top-4 right-4 z-10">
            <LangPickerLight />
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
