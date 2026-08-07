'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { MapPin, RefreshCw } from 'lucide-react';

type LocationRequiredOverlayProps = {
  message?: string | null;
  onActivate: () => void;
  busy: boolean;
};

export function LocationRequiredOverlay({
  message,
  onActivate,
  busy,
}: LocationRequiredOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center px-6"
      style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)' }}
    >
      <div className="w-full max-w-md rounded-3xl border border-[#E5EEF8] bg-white p-6 text-center shadow-xl">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: '#EEF5FF' }}
        >
          <MapPin size={24} color="#2F76BB" />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#353535' }}>Localisation requise</h3>
        <p className="mt-2" style={{ fontSize: 13, lineHeight: 1.6, color: '#666' }}>
          Activez la localisation pour afficher les profils dans Home et Recherche. Sans
          autorisation, aucun profil ne sera visible.
        </p>
        {message && (
          <p className="mt-3" style={{ fontSize: 12, lineHeight: 1.5, color: '#B45309' }}>
            {message}
          </p>
        )}
        <button
          type="button"
          onClick={onActivate}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-white transition-all active:scale-95"
          style={{
            background: matchyBrand.gradient,
            fontSize: 15,
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(47,118,187,0.4)',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? <RefreshCw size={18} className="animate-spin" /> : <MapPin size={18} />}
          {busy ? 'Activation…' : 'Activer la localisation'}
        </button>
        <p className="mt-3" style={{ fontSize: 11, color: '#888' }}>
          Autorisez la localisation lorsque le navigateur vous le demande.
        </p>
      </div>
    </div>
  );
}
