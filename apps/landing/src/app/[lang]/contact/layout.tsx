import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata('contact');

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
