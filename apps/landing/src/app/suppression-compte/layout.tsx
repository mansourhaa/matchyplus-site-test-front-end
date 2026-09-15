import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Suppression de Compte',
  description:
    'Instructions et formulaire pour la demande de suppression définitive de votre compte et de vos données personnelles sur Matchy+.',
  alternates: {
    canonical: '/suppression-compte',
  },
  openGraph: {
    title: 'Suppression de Compte | Matchy+',
    description:
      'Instructions et formulaire pour la suppression de votre compte et de vos données sur Matchy+.',
    url: '/suppression-compte',
  },
};

export default function AccountDeletionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
