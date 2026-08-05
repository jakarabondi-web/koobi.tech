import Image from "next/image";

import { cn } from "@/lib/utils/cn";

/**
 * The full Traivr lockup — trefoil mark + wordmark in one approved image
 * (public/branding/) — used as the main logo everywhere, replacing the
 * earlier icon-image + HTML-text pairing.
 *
 * The primary asset's wordmark is black and the reversed asset's is white,
 * so which file renders depends on the background behind it:
 * - tone="auto" (default): primary in light mode, reversed in dark mode —
 *   for surfaces that follow the page theme (marketing header/footer, auth).
 * - tone="reversed": always the white-wordmark version — for surfaces that
 *   are dark in both themes (the dashboard sidebar).
 *
 * Size via className heights (e.g. "h-14 lg:h-24 w-auto"); the intrinsic
 * width/height only fix the 4096x1721 aspect ratio.
 */
const RATIO = 4096 / 1721;
const H = 160;
const W = Math.round(H * RATIO);

export function LogoLockup({
  tone = "auto",
  priority,
  className = "h-12 w-auto",
}: {
  tone?: "auto" | "reversed";
  priority?: boolean;
  className?: string;
}) {
  if (tone === "reversed") {
    return (
      <Image
        src="/branding/traivr-logo-reversed.png"
        alt="Traivr"
        width={W}
        height={H}
        priority={priority}
        className={className}
      />
    );
  }
  return (
    <>
      <Image
        src="/branding/traivr-logo-primary.png"
        alt="Traivr"
        width={W}
        height={H}
        priority={priority}
        className={cn(className, "dark:hidden")}
      />
      <Image
        src="/branding/traivr-logo-reversed.png"
        alt="Traivr"
        width={W}
        height={H}
        priority={priority}
        className={cn(className, "hidden dark:block")}
      />
    </>
  );
}
