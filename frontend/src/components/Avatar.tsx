interface AvatarProps {
  avatarUrl: string | null | undefined;
  className?: string;
  style?: React.CSSProperties;
}

export default function Avatar({ avatarUrl, className, style }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="Avatar"
        className={className}
        style={style}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
          (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute('style');
        }}
      />
    );
  }

  return (
    <div className={`avatar-placeholder ${className ?? ''}`} style={style} aria-label="Avatar">
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="avatar-placeholder__icon">
        <circle cx="20" cy="20" r="20" fill="#D9D9D9" />
        <ellipse cx="20" cy="16" rx="7" ry="7" fill="#A0A0A0" />
        <ellipse cx="20" cy="36" rx="13" ry="10" fill="#A0A0A0" />
      </svg>
    </div>
  );
}
