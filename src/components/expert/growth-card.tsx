import Link from "next/link";
import { Check } from "lucide-react";

export function GrowthCard({ benefits }: { benefits: string[] }) {
  return (
    <section
      aria-labelledby="growth-card-title"
      className="relative overflow-hidden rounded-lg bg-forest p-8 text-white shadow-lg"
    >
      {/* Decorative concentric rings echoing the design's badge motif. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-16 h-[420px] w-[420px] rounded-full border border-white/5"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 top-10 h-[300px] w-[300px] rounded-full border border-white/5"
      />

      <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-sm">
          <h2
            id="growth-card-title"
            className="text-2xl font-bold leading-snug tracking-tight"
          >
            Grow your expertise and unlock more opportunities.
          </h2>

          <ul className="mt-6 space-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/dashboard/results"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent focus-visible:ring-offset-forest"
          >
            View my progress
          </Link>
        </div>

        <div className="hidden shrink-0 md:block" aria-hidden="true">
          <AwardBadge />
        </div>
      </div>
    </section>
  );
}

function AwardBadge() {
  return (
    <svg viewBox="0 0 160 180" className="h-44 w-40" role="presentation">
      <defs>
        <linearGradient id="badgeFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>

      <path d="M62 96 40 168l26-12 14 20 14-20 26 12-22-72z" fill="#15803d" />

      <g transform="translate(80 72)">
        {Array.from({ length: 16 }).map((_, index) => (
          <rect
            key={index}
            x="-8"
            y="-70"
            width="16"
            height="26"
            rx="4"
            fill="url(#badgeFill)"
            transform={`rotate(${index * 22.5})`}
          />
        ))}
      </g>

      <circle cx="80" cy="72" r="52" fill="url(#badgeFill)" />
      <circle cx="80" cy="72" r="38" fill="#0f7a44" />
      <path
        d="M62 72l12 13 24-27"
        fill="none"
        stroke="#ffffff"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
