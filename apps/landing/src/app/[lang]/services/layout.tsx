import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata('services');

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
