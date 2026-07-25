import * as React from "react";

import { cn } from "@/lib/utils";

const TONES = [
  "bg-emerald-100 text-emerald-800",
  "bg-green-100 text-green-800",
  "bg-teal-100 text-teal-800",
  "bg-lime-100 text-lime-800",
  "bg-slate-200 text-slate-700",
  "bg-cyan-100 text-cyan-800",
];

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function toneFor(name: string) {
  const sum = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TONES[sum % TONES.length];
}

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
} as const;

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: keyof typeof SIZES;
}

/**
 * Deterministic initials avatar. Keeps the app self-contained (no remote
 * image requests) while preserving the identity cue from the design.
 */
export function Avatar({ name, size = "md", className, ...props }: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        SIZES[size],
        toneFor(name),
        className,
      )}
      {...props}
    >
      {initialsOf(name)}
    </span>
  );
}
