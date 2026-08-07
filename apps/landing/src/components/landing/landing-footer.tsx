'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

const LOGO_SRC = '/logo-matchy.svg';

export type LandingFooterCopy = {
  footerDesc: string;
  quickLinks: string;
  howItWorks: string;
  ourServices: string;
  legal: string;
  privacy: string;
  terms: string;
  allRights: string;
  joinToday: string;
};

type LandingFooterProps = {
  t: LandingFooterCopy;
  onJoin: () => void;
};

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  const className =
    'text-sm text-white/65 transition-colors duration-200 hover:text-white focus-visible:text-white focus-visible:outline-none';

  if (href.startsWith('#')) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function LandingFooter({ t, onJoin }: LandingFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-[#0B1F33]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(97,188,166,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(47,118,187,0.22),transparent_50%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#61BCA6]/70 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-8 md:pt-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr] md:gap-12">
          <div className="max-w-md space-y-4">
            <img src={LOGO_SRC} alt="Matchy+" className="h-7 brightness-0 invert" />
            <p className="text-sm leading-relaxed text-white/65">{t.footerDesc}</p>
            <button
              type="button"
              onClick={onJoin}
              className="inline-flex items-center rounded-full bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t.joinToday}
            </button>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold tracking-[0.14em] text-white/45 uppercase">
              {t.quickLinks}
            </h4>
            <ul className="space-y-3">
              <li>
                <FooterLink href="#how-it-works">{t.howItWorks}</FooterLink>
              </li>
              <li>
                <FooterLink href="#services">{t.ourServices}</FooterLink>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold tracking-[0.14em] text-white/45 uppercase">
              {t.legal}
            </h4>
            <ul className="space-y-3">
              <li>
                <FooterLink href="/privacy-policy">{t.privacy}</FooterLink>
              </li>
              <li>
                <FooterLink href="/terms-of-service">{t.terms}</FooterLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-center text-xs text-white/45 sm:flex-row sm:text-start">
          <p>
            &copy; {year} Matchy+. {t.allRights}.
          </p>
          <p className="bg-gradient-to-r from-[#61BCA6] to-[#2F76BB] bg-clip-text font-semibold text-transparent">
            Matchy+
          </p>
        </div>
      </div>
    </footer>
  );
}
