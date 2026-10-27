import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata('a-propos');

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
