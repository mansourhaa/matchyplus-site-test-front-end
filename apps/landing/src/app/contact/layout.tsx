import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contactez l’équipe Matchy+ pour toute question, idée ou demande de renseignement. Nous vous répondrons dans les plus brefs délais.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact | Matchy+',
    description:
      'Contactez l’équipe Matchy+ pour toute question, idée ou demande de renseignement.',
    url: '/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
