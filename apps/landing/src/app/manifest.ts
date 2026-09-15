import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Matchy+ | Networking Professionnel',
    short_name: 'Matchy+',
    description:
      'Connectez-vous avec des professionnels vérifiés et développez vos opportunités d’affaires.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#18181b',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
