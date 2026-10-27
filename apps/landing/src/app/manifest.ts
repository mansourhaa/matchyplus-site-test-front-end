import { PAGES } from '@/lib/seo';
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PAGES.home.copy.fr.title,
    short_name: 'Matchy+',
    description: PAGES.home.copy.fr.description,
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
