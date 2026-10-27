import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata('privacy-policy');

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
