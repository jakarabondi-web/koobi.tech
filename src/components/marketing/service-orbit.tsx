"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils/cn";
import { GLOBE_LAND_DOTS } from "@/components/shared/globe-dots";
import type { FeatureBentoItem } from "@/components/marketing/feature-bento";

/**
 * The homepage "What we do" band: an auto-playing orbit selector over a live
 * sonar-pulse world map. Satellites (one per service) ring a central hub;
 * every few seconds the next service rotates in, and hovering/focusing any
 * satellite takes over. The map behind reuses the same land-dot data as
 * WorldNetworkMap but replaces its city-to-city arcs with soft expanding
 * rings — steadier, less "shooting star" — per design review.
 *
 * Mobile (< md) is a different layout, not a shrunken orbit: the wheel is
 * replaced by a horizontally swipeable icon+name chip strip above the same
 * detail card. A tap pauses autoplay briefly so reading isn't interrupted.
 */

export type ServiceOrbitItem = FeatureBentoItem & {
  /** Short display name for the satellite label / mobile chip. */
  label: string;
  chips: string[];
};

const ACCENT_VARS = ["--primary", "--accent-violet", "--accent-teal", "--accent-amber"] as const;
const accent = (i: number) => `var(${ACCENT_VARS[i % ACCENT_VARS.length]})`;

const CITIES: [number, number][] = [
  [-122.42, 37.77], [-79.38, 43.65], [-99.13, 19.43], [-46.63, -23.55], [-58.38, -34.6],
  [-0.13, 51.51], [13.4, 52.52], [3.38, 6.52], [31.24, 30.04], [36.82, -1.29],
  [72.88, 19.08], [77.59, 12.97], [103.82, 1.35], [120.98, 14.6], [139.69, 35.68],
  [126.98, 37.57], [151.21, -33.87],
];

const AUTOPLAY_MS = 4500;
const TOUCH_RESUME_MS = 8000;

function SonarMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const ctx = canvas.getContext("2d");
    if (!parent || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    let raf = 0;
    type Ripple = { c: [number, number]; start: number; dur: number };
    let ripples: Ripple[] = [];

    const project = (lon: number, lat: number): [number, number] => [
      ((lon + 180) / 360) * W * 1.15 - W * 0.075,
      ((78 - lat) / 150) * H * 1.25,
    ];

    function resize() {
      if (!canvas || !parent || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = parent.getBoundingClientRect();
      W = r.width;
      H = r.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawBase() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(129,140,248,0.34)";
      for (const [lon, lat] of GLOBE_LAND_DOTS) {
        const [x, y] = project(lon, lat);
        if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
        ctx.beginPath();
        ctx.arc(x, y, 1.1, 0, 7);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(147,180,255,0.5)";
      for (const [lon, lat] of CITIES) {
        const [x, y] = project(lon, lat);
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 7);
        ctx.fill();
      }
    }

    function frame(now: number) {
      if (!ctx) return;
      drawBase();
      ripples = ripples.filter((p) => now - p.start < p.dur);
      while (ripples.length < 6) {
        ripples.push({
          c: CITIES[(Math.random() * CITIES.length) | 0],
          start: now - Math.random() * 600,
          dur: 2600 + Math.random() * 1400,
        });
      }
      for (const p of ripples) {
        const t = Math.min((now - p.start) / p.dur, 1);
        const [x, y] = project(p.c[0], p.c[1]);
        ctx.strokeStyle = `rgba(147,180,255,${0.38 * (1 - t)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, 3 + t * 26, 0, 7);
        ctx.stroke();
        if (t < 0.5) {
          ctx.strokeStyle = `rgba(190,210,255,${0.3 * (1 - t * 2)})`;
          ctx.beginPath();
          ctx.arc(x, y, 3 + t * 13, 0, 7);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(frame);
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (reduceMotion) drawBase();
    });
    observer.observe(parent);
    resize();

    if (reduceMotion) drawBase();
    else raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduceMotion) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function IconBadge({ index, size, children }: { index: number; size: string; children: React.ReactNode }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-2xl"
      style={{
        width: size,
        height: size,
        color: accent(index),
        background: `color-mix(in oklch, ${accent(index)} 22%, rgba(10,16,34,.5))`,
      }}
    >
      {children}
    </span>
  );
}

export function ServiceOrbit({ items }: { items: ServiceOrbitItem[] }) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const count = items.length;

  const pause = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const arm = useCallback(() => {
    pause();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timerRef.current = setInterval(() => setActive((a) => (a + 1) % count), AUTOPLAY_MS);
  }, [count, pause]);

  useEffect(() => {
    arm();
    return () => {
      pause();
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, [arm, pause]);

  // keep the active mobile chip centered in the strip
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || strip.offsetParent === null) return;
    const chip = strip.children[active] as HTMLElement | undefined;
    if (!chip) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    strip.scrollTo({ left: chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2, behavior });
  }, [active]);

  const onTouchStart = useCallback(() => {
    pause();
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(arm, TOUCH_RESUME_MS);
  }, [arm, pause]);

  // swipe left/right on the detail card moves to the next/previous service
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const onSwipeStart = useCallback((e: React.TouchEvent) => {
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const onSwipeEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = swipeStart.current;
      swipeStart.current = null;
      if (!start) return;
      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 2) return;
      setActive((a) => (a + (dx < 0 ? 1 : count - 1)) % count);
    },
    [count]
  );

  const it = items[active];

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-navy p-5 sm:p-8 lg:p-10"
      onMouseEnter={pause}
      onMouseLeave={arm}
      onFocus={pause}
      onBlur={arm}
      onTouchStart={onTouchStart}
    >
      <SonarMap />
      <div className="pointer-events-none absolute -top-24 -right-24 z-[1] size-72 rounded-full bg-accent-violet/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 z-[1] size-72 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative z-[2] grid items-center gap-6 py-2 md:min-h-[29rem] md:grid-cols-[minmax(0,30rem)_1fr] md:gap-10 md:py-4">
        {/* mobile: swipeable capability strip */}
        <div
          ref={stripRef}
          className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pt-1 pb-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden"
        >
          {items.map((item, i) => (
            <button
              key={item.title}
              type="button"
              aria-label={item.title}
              onClick={() => setActive(i)}
              className={cn(
                "flex shrink-0 snap-center items-center gap-2 rounded-full border-[1.5px] border-white/15 bg-[rgba(10,16,34,.72)] py-2 pr-3.5 pl-2 backdrop-blur transition-all duration-300",
                i === active &&
                  "border-[var(--sat)] shadow-[0_0_0_3px_color-mix(in_oklch,var(--sat)_20%,transparent),0_0_16px_color-mix(in_oklch,var(--sat)_40%,transparent)]"
              )}
              style={{ "--sat": accent(i) } as CSSProperties}
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4"
                style={{ color: accent(i), background: `color-mix(in oklch, ${accent(i)} 22%, rgba(10,16,34,.5))` }}
              >
                {item.icon}
              </span>
              <span className={cn("text-xs font-semibold whitespace-nowrap", i === active ? "text-white" : "text-white/75")}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* desktop: the orbit wheel */}
        <div className="relative mx-auto hidden aspect-square w-full max-w-[23rem] md:block">
          <div className="absolute inset-[8%] animate-[orbit-spin_70s_linear_infinite] rounded-full border-[1.5px] border-dashed border-white/15" />
          <div className="absolute inset-[20%] rounded-full border border-white/[0.07]" />
          <div className="absolute inset-[29%] flex flex-col items-center justify-center gap-2 rounded-full border border-white/15 bg-[rgba(10,16,34,.6)] p-4 text-center shadow-[0_0_40px_rgba(0,0,0,.35)] backdrop-blur-md">
            <div key={it.title} className="flex animate-[orbit-pop_.3s_ease] flex-col items-center gap-2">
              <IconBadge index={active} size="3.4rem">{it.icon}</IconBadge>
              <h3 className="text-sm leading-snug font-bold text-white">{it.title}</h3>
            </div>
          </div>
          {items.map((item, i) => {
            const ang = (i / count) * Math.PI * 2 - Math.PI / 2;
            const cos = Math.cos(ang);
            const sin = Math.sin(ang);
            const sx = 50 + 40 * cos;
            const sy = 50 + 40 * sin;
            // labels sit above/below their satellite and drift toward the
            // circle's center axis so they can't clip the panel edge or
            // reach into the text column
            const inward = 50 - cos * 28;
            return (
              <span key={item.title}>
                <button
                  type="button"
                  aria-label={item.title}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className={cn(
                    "absolute -m-6 flex size-12 items-center justify-center rounded-full border-2 border-white/15 bg-[rgba(10,16,34,.78)] backdrop-blur transition-all duration-300",
                    i === active &&
                      "scale-[1.16] border-[var(--sat)] shadow-[0_0_0_4px_color-mix(in_oklch,var(--sat)_22%,transparent),0_0_22px_color-mix(in_oklch,var(--sat)_50%,transparent)]"
                  )}
                  style={{ left: `${sx}%`, top: `${sy}%`, color: accent(i), "--sat": accent(i) } as CSSProperties}
                >
                  {item.icon}
                </button>
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute text-xs font-semibold whitespace-nowrap transition-colors duration-300 [text-shadow:0_1px_8px_rgba(0,0,0,.7)]",
                    i === active ? "text-white" : "text-white/60"
                  )}
                  style={{
                    left: `${sx}%`,
                    top: `${sy + (sin <= 0 ? -10.5 : 10.5)}%`,
                    transform: `translate(-${inward}%, -50%)`,
                  }}
                >
                  {item.label}
                </span>
              </span>
            );
          })}
        </div>

        {/* detail card — horizontal swipe moves to the next/previous service */}
        <div onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd} className="touch-pan-y">
          <div key={it.title} className="flex min-h-[16rem] animate-[orbit-pop_.3s_ease] flex-col justify-center md:min-h-0">
            <span className="mb-2 block font-mono text-[11px] tracking-[.1em] text-white/50 uppercase">{it.tag}</span>
            <h3 className="text-2xl font-bold tracking-tight text-white">{it.title}</h3>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/75 sm:text-base sm:leading-7">{it.desc}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {it.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/[0.18] bg-[rgba(10,16,34,.45)] px-3.5 py-1.5 text-xs font-semibold text-white/80"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            {items.map((item, i) => (
              <button
                key={item.title}
                type="button"
                aria-label={item.title}
                onClick={() => setActive(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === active ? "w-6" : "w-2 bg-white/20"
                )}
                style={i === active ? { background: accent(i) } : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
