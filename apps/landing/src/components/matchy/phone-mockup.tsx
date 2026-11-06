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
      sizes="(max-width: 640px) 240px, (max-width: 768px) 260px, (max-width: 1024px) 280px, 310px"
      priority={priority}
      className={`mx-auto h-auto w-[240px] sm:w-[260px] md:w-[280px] lg:w-[300px] xl:w-[310px] max-w-[85vw] shrink-0 object-contain drop-shadow-2xl ${className}`}
    />
  );
}
