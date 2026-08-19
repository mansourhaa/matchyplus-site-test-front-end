'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { APP_LOGIN_URL } from '@/lib/constants';
import Link from 'next/link';

import { Parallax, Reveal } from './motion';

export function Cta() {
  const { locale, t } = useI18n();

  const ctaBtnText =
    locale === 'ar'
      ? 'اعرف أكثر'
      : locale === 'en'
        ? 'Learn More'
        : 'En Savoir Plus';

  return (
    <section
      className="from-brand-teal via-[#3b9bb8] to-[#2d79be] relative mt-28 bg-gradient-to-r pt-8 pb-16 sm:mt-36 sm:pt-10 sm:pb-20 md:mt-40 md:pt-12 md:pb-24 lg:mt-48 lg:pb-28"
      id="download"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-5 md:grid-cols-12 md:gap-8 lg:gap-10">
        <Parallax speed={20} className="relative z-10 -mt-28 flex justify-center sm:-mt-36 md:-mt-40 lg:-mt-52 md:col-span-5 lg:col-span-5">
          <div className="relative flex w-full justify-center drop-shadow-2xl">
            <img
              src="/showcase/cta-africa-people.png"
              alt="Professionnels inspirants d'Afrique"
              className="h-auto max-h-[460px] w-full max-w-[340px] object-contain sm:max-w-[400px] md:max-h-[500px] md:max-w-[420px] lg:max-h-[580px] lg:max-w-[500px]"
            />
          </div>
        </Parallax>

        <Reveal
          direction="left"
          className="text-white text-center md:text-left md:col-span-7 lg:col-span-7 md:pl-4 lg:pl-6"
        >
          <h2 className="text-2xl leading-tight font-bold text-balance sm:text-3xl md:text-3xl lg:text-[2.6rem]">
            {t('landing.downloadTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-lg leading-relaxed text-pretty text-sm text-white/90 md:mx-0 md:text-base">
            {t('landing.downloadBody')}
          </p>
          <div className="mt-7 sm:mt-8">
            <Link
              href={APP_LOGIN_URL}
              className="text-[#2d79be] inline-block rounded-xl bg-white px-8 py-3.5 text-sm font-bold shadow-xl transition-transform hover:scale-[1.03]"
            >
              {ctaBtnText}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}


