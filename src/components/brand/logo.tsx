import Link from "next/link";

import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string;
  className?: string;
  /** Renders the wordmark in white for use on dark surfaces. */
  inverted?: boolean;
  showWordmark?: boolean;
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("h-8 w-8", className)}
    >
      <path
        d="M16 1.5 29 9v14L16 30.5 3 23V9z"
        className="fill-primary"
      />
      <path
        d="M16 5.4 25.6 11v10L16 26.6 6.4 21V11z"
        fill="none"
        className="stroke-white"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M11.6 13.2h8.8M16 13.2v7.2M12.4 20.4h7.2"
        fill="none"
        className="stroke-white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  href = "/",
  className,
  inverted = false,
  showWordmark = true,
}: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      aria-label="Trainora AI home"
    >
      <LogoMark />
      {showWordmark ? (
        <span
          className={cn(
            "text-lg font-bold tracking-tight",
            inverted ? "text-white" : "text-foreground",
          )}
        >
          Trainora AI
        </span>
      ) : null}
    </Link>
  );
}
