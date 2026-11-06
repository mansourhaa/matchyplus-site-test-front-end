'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { APP_REGISTER_URL } from '@/lib/constants';
import Image from 'next/image';
import Link from 'next/link';

import { Parallax, Reveal } from './motion';

export function Cta() {
  const { locale, t, dir } = useI18n();
  const isRtl = dir === 'rtl';

  const ctaBtnText =
    locale === 'ar' ? 'اعرف أكثر' : locale === 'en' ? 'Learn More' : 'En Savoir Plus';

  return (
    <section
      className="from-brand-teal relative mt-20 sm:mt-24 md:mt-28 lg:mt-32 xl:mt-36 bg-gradient-to-r via-[#3b9bb8] to-[#2d79be] pt-8 pb-16 sm:pt-10 sm:pb-20 md:pt-12 md:pb-24 lg:pb-28"
      id="download"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-5 md:grid-cols-2 md:gap-10 lg:gap-14">
        <Parallax
          speed={20}
          className="relative z-10 -mt-20 sm:-mt-24 md:-mt-28 lg:-mt-32 xl:-mt-36 flex justify-center"
        >
          <div className="relative flex w-full justify-center drop-shadow-2xl">
            <Image
              src="/showcase/cta-africa-people.png"
              alt={t('landing.ctaImageAlt')}
              width={641}
              height={794}
              sizes="(max-width: 640px) 270px, (max-width: 768px) 320px, (max-width: 1024px) 380px, 480px"
              className="h-auto w-full max-w-[270px] sm:max-w-[320px] md:max-w-[380px] lg:max-w-[440px] xl:max-w-[480px] object-contain drop-shadow-2xl"
            />
          </div>
        </Parallax>

        <Reveal
          direction={isRtl ? 'right' : 'left'}
          className="text-center text-white ltr:md:pl-4 ltr:md:text-left ltr:lg:pl-6 rtl:md:pr-4 rtl:md:text-right rtl:lg:pr-6"
        >
          <h2 className="text-2xl leading-tight font-bold text-balance sm:text-3xl md:text-3xl lg:text-[2.4rem]">
            <span className="block lg:whitespace-nowrap">{t('landing.downloadTitle')}</span>
            <span className="block">{t('landing.downloadTitleLine2')}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-pretty text-white/90 md:text-base ltr:md:mr-auto ltr:md:ml-0 rtl:md:mr-0 rtl:md:ml-auto">
            {t('landing.downloadBody')}
          </p>
          <div className="mt-7 sm:mt-8">
            <Link
              href={APP_REGISTER_URL}
              className="inline-block rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-[#2d79be] shadow-xl transition-transform hover:scale-[1.03]"
            >
              {ctaBtnText}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
