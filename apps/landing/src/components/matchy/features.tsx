'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { BriefcaseBusiness, Sparkles, UsersRound, WalletCards } from 'lucide-react';

import { Parallax, Reveal } from './motion';

function Feature({
  icon: Icon,
  title,
  text,
  align,
  delay,
}: {
  icon: typeof BriefcaseBusiness;
  title: string;
  text: string;
  align: 'left' | 'right';
  delay: number;
}) {
  return (
    <Reveal
      direction={align}
      delay={delay}
      className={align === 'right' ? 'text-center lg:text-left' : 'text-center lg:text-right'}
    >
      <div
        className={`flex flex-col ${align === 'right' ? 'items-center lg:items-start' : 'items-center lg:items-end'}`}
      >
        <span className="bg-brand-teal shadow-brand-teal/30 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg">
          <Icon className="h-6 w-6" />
        </span>
        <h3 className="text-brand-navy mt-4 text-lg font-semibold">{title}</h3>
        <div className="bg-brand-teal/50 mt-1 h-0.5 w-10 rounded" />
        <p className="text-muted-foreground mt-3 max-w-[280px] text-sm leading-relaxed">{text}</p>
      </div>
    </Reveal>
  );
}

export function Features() {
  const { t } = useI18n();

  const left = [
    {
      icon: BriefcaseBusiness,
      title: t('landing.swipeTitle'),
      text: t('landing.swipeText'),
    },
    {
      icon: WalletCards,
      title: t('landing.growTitle'),
      text: t('landing.growText'),
    },
  ];

  const right = [
    {
      icon: UsersRound,
      title: t('landing.nearTitle'),
      text: t('landing.nearText'),
    },
    {
      icon: Sparkles,
      title: t('landing.aiTitle'),
      text: t('landing.aiText'),
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 py-20" id="services">
      <Reveal className="mx-auto max-w-2xl text-center">
        <div className="bg-brand-teal mx-auto mb-4 h-1 w-10 rounded" />
        <h2 className="text-brand-blue text-3xl font-bold text-balance md:text-4xl">
          {t('landing.title')}
        </h2>
        <p className="text-muted-foreground mt-4 leading-relaxed text-pretty">
          {t('landing.body')}
        </p>
      </Reveal>

      <div className="mt-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-3 lg:gap-8 xl:gap-12">
        <div className="flex flex-col gap-10 sm:gap-12 order-2 lg:order-1">
          {left.map((f, i) => (
            <Feature key={f.title} {...f} align="left" delay={i * 0.1} />
          ))}
        </div>

        <Parallax speed={20} className="flex justify-center order-1 lg:order-2">
          <div className="relative flex justify-center drop-shadow-2xl">
            <img
              src="/showcase/features-phone.png"
              alt="Matchy+ Profil Professionnel et Services"
              className="h-auto max-h-[480px] w-auto max-w-[280px] object-contain sm:max-w-[320px] md:max-h-[520px] md:max-w-[340px] lg:max-h-[560px] lg:max-w-[350px]"
            />
          </div>
        </Parallax>

        <div className="flex flex-col gap-10 sm:gap-12 order-3 lg:order-3">
          {right.map((f, i) => (
            <Feature key={f.title} {...f} align="right" delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}
