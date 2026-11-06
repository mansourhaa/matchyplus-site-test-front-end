import Image from 'next/image';

type Props = {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
};

export function PhoneMockup({ src, alt, priority = false, className = '' }: Props) {
  return (
    <Image
      src={src}
      alt={alt}
      width={323}
      height={639}
      sizes="(max-width: 640px) 240px, 300px"
      priority={priority}
      className={`mx-auto h-auto w-[clamp(230px,min(24vw,38svh),300px)] shrink-0 object-contain drop-shadow-2xl ${className}`}
    />
  );
}
