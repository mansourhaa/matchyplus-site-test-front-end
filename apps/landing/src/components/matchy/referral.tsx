'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { APP_REGISTER_URL } from '@/lib/constants';
import { Check, Copy, Gift } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';

/** Sign-up link carrying a referral code, e.g. …/register?ref=MP-7K2Q9. */
export function referralUrl(base: string, code: string): string {
  const url = new URL(base);
  url.searchParams.set('ref', code);
  return url.toString();
}

/**
 * Referral block at the top of the sample pro card: the member's code (with a copy button),
 * a QR code to the sign-up page, and the points the member earns.
 * Matchy+ has no referral system yet: the code and the points are samples.
 */
export function ReferralCode() {
  const { t } = useI18n();
  const code = t('landing.referralSampleCode');
  const link = referralUrl(APP_REGISTER_URL, code);

  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // clipboard blocked (old browser, no permission): the code stays visible to copy by hand
    }
  };

  return (
    <div className="bg-brand-navy relative overflow-hidden p-5 text-white">
      <div
        aria-hidden="true"
        className="bg-brand-teal/30 absolute -top-12 h-32 w-32 rounded-full blur-2xl ltr:-right-10 rtl:-left-10"
      />
      <div className="relative flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs text-white/80">
            <Gift className="text-brand-teal h-4 w-4 shrink-0" />
            {t('landing.referralCodeLabel')}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border-2 border-dashed border-white/30 bg-white/10 py-1.5 ps-3 pe-1.5">
            <span dir="ltr" className="font-mono text-lg font-bold tracking-wider">
              {code}
            </span>
            <button
              type="button"
              onClick={copyCode}
              aria-label={t('landing.referralCopy')}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 transition-colors outline-none hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <span
            role="status"
            className="block min-h-4 pt-1 text-[11px] font-semibold text-[#BFF0E4]"
          >
            {copied ? t('landing.referralCopied') : ''}
          </span>
        </div>
        <div className="shrink-0 rounded-xl bg-white p-1.5 shadow-lg">
          <QRCodeSVG
            value={link}
            title={t('landing.referralQr')}
            size={68}
            level="M"
            fgColor="#1A4367"
            bgColor="#FFFFFF"
          />
        </div>
      </div>
      <div className="relative mt-1 flex">
        <span className="text-brand-navy inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold">
          <Gift className="h-3 w-3" />
          {t('landing.referralYou')}
        </span>
      </div>
    </div>
  );
}
