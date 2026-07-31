'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks';
import {
  fetchOnboardingProfile,
  selectOnboarding,
} from '@/features/onboarding/store/onboarding-slice';
import { toast } from '@/lib/toast';
import { Check, Copy, Download, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';

// Plain outlined "M+" mark for the QR code's center, matching legacy's logo badge —
// a white circle with a thin border, not a filled block.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="15" fill="white" stroke="#E0E0E0" stroke-width="1.5"/><text x="16" y="21" font-family="Georgia, serif" font-size="12" font-weight="700" fill="${matchyBrand.textDark}" text-anchor="middle">M +</text></svg>`;
const LOGO_DATA_URI = `data:image/svg+xml,${encodeURIComponent(LOGO_SVG)}`;

export function QrCodeView() {
  const dispatch = useAppDispatch();
  const { profile, loading, error } = useAppSelector(selectOnboarding);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchOnboardingProfile());
  }, [dispatch]);

  if (!profile && loading) {
    return <div className="py-16 text-center text-sm text-[#888]">Chargement du code QR…</div>;
  }
  if (!profile && error) {
    return (
      <div className="mx-4 my-10 rounded-2xl bg-white p-6 text-center shadow-sm" role="alert">
        <p className="text-sm text-[#E24E59]">Impossible de charger votre profil.</p>
        <button
          type="button"
          onClick={() => dispatch(fetchOnboardingProfile())}
          className="mt-4 rounded-xl bg-[#2F76BB] px-5 py-2.5 text-sm font-bold text-white"
        >
          Réessayer
        </button>
      </div>
    );
  }
  if (!profile) return null;

  // The public profile page is served by this same Next.js app, not the API, so the
  // link is built from window.location.origin rather than NEXT_PUBLIC_API_URL.
  const profileUrl = `${window.location.origin}/profile/${profile.id}`;
  const displayUrl = profileUrl.replace(/^https?:\/\//, '');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success('Lien copié !');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien.');
    }
  };

  const shareLink = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Mon profil Matchy+', url: profileUrl });
      } catch {
        // The user dismissed the native share sheet — not a failure to report.
      }
      return;
    }
    await copyLink();
  };

  const downloadCode = () => {
    const svg = codeRef.current?.querySelector('svg');
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const firstName = (profile.name || 'matchy').trim().split(/\s+/)[0]?.toLowerCase() || 'matchy';
    const link = document.createElement('a');
    link.href = url;
    link.download = `matchy-qr-${firstName}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="mb-5 text-center text-sm text-[#888]">
        Partagez votre profil facilement avec votre code QR personnel
      </p>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex justify-center">
          <span className="inline-flex items-baseline gap-0.5">
            <span style={{ fontSize: 22, fontWeight: 800, color: matchyBrand.blue }}>Matchy</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: matchyBrand.teal }}>+</span>
          </span>
        </div>

        <div
          ref={codeRef}
          className="mx-auto flex w-fit flex-col items-center rounded-2xl border border-[#E8F0FA] p-5"
        >
          <QRCodeSVG
            value={profileUrl}
            size={200}
            level="H"
            fgColor={matchyBrand.textDark}
            bgColor="#FFFFFF"
            imageSettings={{
              src: LOGO_DATA_URI,
              height: 32,
              width: 32,
              excavate: true,
            }}
          />
          <p className="mt-3 text-sm font-bold text-[#353535]">{profile.name || 'Votre nom'}</p>
          {profile.job && <p className="text-xs text-[#888]">{profile.job}</p>}
          <div className="my-3 w-full border-t border-dashed border-[#E0E0E0]" />
          <p className="text-center text-[11px] text-[#AAA]">
            Scannez ce code pour accéder à mon profil Matchy+
          </p>
        </div>
      </section>

      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
        <span className="min-w-0 flex-1 truncate text-xs text-[#555]">{displayUrl}</span>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="flex shrink-0 items-center gap-1 rounded-full bg-[#EEF5FF] px-3 py-1.5 text-xs font-semibold text-[#2F76BB]"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copié' : 'Copier'}
        </button>
      </div>

      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={downloadCode}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#E0E0E0] bg-white py-3 text-sm font-bold text-[#555]"
        >
          <Download size={16} /> Télécharger
        </button>
        <button
          type="button"
          onClick={() => void shareLink()}
          className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white shadow-md"
          style={{ background: matchyBrand.gradient }}
        >
          <Share2 size={16} /> Partager
        </button>
      </div>
    </div>
  );
}
