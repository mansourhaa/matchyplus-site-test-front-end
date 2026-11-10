import { ActivationView } from '@/features/auth/components/activation-view';
import { Loader2 } from 'lucide-react';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Activation de votre compte — Matchy+',
  description: 'Activez votre compte et configurez votre mot de passe pour accéder à Matchy+.',
};

function ActivationLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2F76BB]">
        <Loader2 className="animate-spin" size={28} />
      </div>
      <p className="text-sm font-semibold text-slate-700">Chargement de l’activation...</p>
    </div>
  );
}

export default function ActiverPage() {
  return (
    <Suspense fallback={<ActivationLoading />}>
      <ActivationView />
    </Suspense>
  );
}
