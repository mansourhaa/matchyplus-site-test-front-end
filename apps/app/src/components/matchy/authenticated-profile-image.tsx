'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';

type AuthenticatedProfileImageProps = {
  image: string | null | undefined;
  name: string;
  className?: string;
  /** Extra classes for the fallback initial letter. */
  initialClassName?: string;
};

/**
 * Profile photos under `/uploads/photos/...` need an authenticated fetch.
 * Never put the raw stored path in `<img src>` — it 401s in the browser.
 */
export function AuthenticatedProfileImage({
  image,
  name,
  className = 'h-full w-full object-cover',
  initialClassName,
}: AuthenticatedProfileImageProps) {
  const photo = useAuthenticatedMediaUrl(image);
  const initial = (name.trim().slice(0, 1) || '?').toUpperCase();

  if (photo.url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo.url} alt="" className={className} />;
  }

  return (
    <span className={initialClassName} style={initialClassName ? undefined : { color: 'inherit' }}>
      {initial}
    </span>
  );
}

/** Rounded tile with brand gradient behind the photo / initial. */
export function AuthenticatedProfileAvatar({
  image,
  name,
  sizeClassName = 'h-16 w-16',
  roundedClassName = 'rounded-xl',
  textClassName = 'text-lg font-bold text-white',
}: {
  image: string | null | undefined;
  name: string;
  sizeClassName?: string;
  roundedClassName?: string;
  textClassName?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden ${sizeClassName} ${roundedClassName} ${textClassName}`}
      style={{ background: matchyBrand.gradient135 }}
    >
      <AuthenticatedProfileImage image={image} name={name} />
    </div>
  );
}
