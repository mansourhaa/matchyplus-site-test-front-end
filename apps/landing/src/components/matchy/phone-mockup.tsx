import Image from 'next/image';

type Props = {
  src: string;
  alt: string;
  priority?: boolean;
};

export function PhoneMockup({ src, alt, priority = false }: Props) {
  return (
    <Image
      src={src}
      alt={alt}
      width={323}
      height={639}
      sizes="280px"
      priority={priority}
      className="mx-auto h-auto w-[280px] shrink-0"
    />
  );
}
