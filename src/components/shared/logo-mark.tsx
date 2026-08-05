import Image from "next/image";

/**
 * The real Traivr brand mark (see public/branding/, from the approved
 * logo package) — replaces the generic gradient-badge + Sparkles-icon
 * placeholder that stood in for a logo everywhere before one existed.
 *
 * Icon-only: the mark itself has no light/dark-dependent color (it's just
 * the blue trefoil, no black or white wordmark baked in), so one asset
 * works unmodified against any background — no separate reversed variant
 * needed here. `alt` defaults to empty because every call site pairs this
 * with the visible "Traivr" wordmark text right next to it; screen readers
 * would otherwise announce the name twice.
 */
export function LogoMark({
  size = 32,
  alt = "",
  priority,
  className,
}: {
  size?: number;
  alt?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/branding/favicon/traivr-favicon-256.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
