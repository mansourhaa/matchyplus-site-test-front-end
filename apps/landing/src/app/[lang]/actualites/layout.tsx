import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata('actualites');

export default function PressLayout({ children }: { children: React.ReactNode }) {
  return children;
}
