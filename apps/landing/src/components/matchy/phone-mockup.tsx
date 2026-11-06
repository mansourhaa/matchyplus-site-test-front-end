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
      sizes="(max-width: 640px) 280px, (max-width: 768px) 310px, (max-width: 1024px) 330px, 360px"
      priority={priority}
      className={`mx-auto h-auto w-[280px] sm:w-[310px] md:w-[330px] lg:w-[350px] xl:w-[360px] shrink-0 object-contain drop-shadow-2xl ${className}`}
    />
  );
}
