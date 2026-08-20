type AdminAvatarImageProps = {
  photoUrl: string | null;
  name: string;
  className: string;
  fontSize: number;
};

/** Renders a resolved photo, or a gradient initial while there is none (yet). */
export function AdminAvatarImage({ photoUrl, name, className, fontSize }: AdminAvatarImageProps) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt={name} className={`shrink-0 object-cover ${className}`} />;
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${className}`}
      style={{ background: 'linear-gradient(135deg, #2F76BB, #61BCA6)' }}
    >
      <span className="text-white" style={{ fontSize, fontWeight: 800 }}>
        {name.charAt(0)}
      </span>
    </div>
  );
}
