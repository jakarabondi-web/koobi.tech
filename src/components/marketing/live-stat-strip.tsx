"use client";

import { useEffect, useRef, useState } from "react";

type Stat = { value: number; suffix: string; label: string; decimals?: number };

const STATS: Stat[] = [
  { value: 12400, suffix: "", label: "Tasks / week" },
  { value: 340, suffix: "", label: "Verified experts" },
  { value: 94.2, suffix: "%", label: "Reviewer agreement", decimals: 1 },
];

function formatCount(n: number, decimals = 0) {
  return decimals > 0
    ? n.toFixed(decimals)
    : n >= 1000
      ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
      : Math.round(n).toString();
}

/** Counts up once, the moment the strip actually enters view. */
function useCountUp(target: number, decimals: number, active: boolean) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      const frame = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(frame);
    }
    const duration = 1400;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target]);

  return formatCount(value, decimals);
}

function StatTile({ stat, active }: { stat: Stat; active: boolean }) {
  const display = useCountUp(stat.value, stat.decimals ?? 0, active);
  return (
    <div className="flex-1 border-l border-white/10 px-6 py-4 first:border-l-0">
      <div className="flex items-baseline gap-1 font-mono text-2xl font-semibold tabular-nums text-white sm:text-3xl">
        {display}
        <span className="text-lg text-white/70 sm:text-xl">{stat.suffix}</span>
      </div>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-white/50">{stat.label}</p>
    </div>
  );
}

export function LiveStatStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex items-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 border-r border-white/10 px-5 py-4">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-white/60">Live</span>
      </div>
      {STATS.map((s) => (
        <StatTile key={s.label} stat={s} active={active} />
      ))}
    </div>
  );
}
