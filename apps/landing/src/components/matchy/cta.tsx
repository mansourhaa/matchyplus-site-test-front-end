'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { Apple, Download, Play } from 'lucide-react';

import { Parallax, Reveal } from './motion';
import { PhoneFrame } from './phone-frame';
import { ContactsScreen } from './screens';

function StoreButton({
  icon: Icon,
  top,
  bottom,
}: {
  icon: typeof Apple;
  top: string;
  bottom: string;
}) {
  return (
    <a
      href="#"
      className="bg-brand-navy flex items-center gap-2 rounded-lg px-4 py-2.5 text-white transition-transform hover:scale-[1.03]"
    >
      <Icon className="h-6 w-6" />
      <span className="text-left leading-tight">
        <span className="block text-[10px] opacity-80">{top}</span>
        <span className="block text-sm font-semibold">{bottom}</span>
      </span>
    </a>
  );
}

export function Cta() {
  const { t } = useI18n();

  return (
    <section
      className="from-brand-blue to-brand-teal relative mt-16 bg-gradient-to-br"
      id="download"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-5 pt-4 pb-16 md:grid-cols-2">
        <Parallax speed={60} className="flex justify-center md:justify-start">
          <div className="-mt-24">
            <PhoneFrame>
              <ContactsScreen />
            </PhoneFrame>
          </div>
        </Parallax>

        <Reveal direction="left" className="text-white">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/80">
            <Download className="h-4 w-4" /> {t('landing.downloadBadge')}
          </div>
          <h2 className="text-3xl leading-tight font-bold text-balance md:text-4xl">
            {t('landing.downloadTitle')}
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-pretty text-white/85">
            {t('landing.downloadBody')}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <StoreButton icon={Play} top={t('landing.getItOn')} bottom={t('landing.googlePlay')} />
            <StoreButton icon={Apple} top="Download on the" bottom="App Store" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
