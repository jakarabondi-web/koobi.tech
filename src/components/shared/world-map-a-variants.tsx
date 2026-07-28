"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils/cn";
import { CONTINENT_RINGS } from "@/components/shared/globe-continents";
import { GLOBE_LAND_DOTS } from "@/components/shared/globe-dots";

/**
 * Five refinements of Option A (filled continents + dot texture) from the
 * map-preview batch — throwaway comparison components, same pattern as the
 * rest of that batch.
 */

type City = { name: string; lat: number; lon: number };

const CITIES: City[] = [
  { name: "San Francisco", lat: 37.77, lon: -122.42 },
  { name: "Toronto", lat: 43.65, lon: -79.38 },
  { name: "São Paulo", lat: -23.55, lon: -46.63 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "Lagos", lat: 6.52, lon: 3.38 },
  { name: "Nairobi", lat: -1.29, lon: 36.82 },
  { name: "Mumbai", lat: 19.08, lon: 72.88 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
];

type Arc = { from: City; to: City; start: number; duration: number };

export type AVariant = 1 | 2 | 3 | 4 | 5;

export function WorldMapAVariant({ className, variant }: { className?: string; variant: AVariant }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let frame = 0;

    const project = (lat: number, lon: number) => ({
      x: ((lon + 180) / 360) * width,
      y: (0.19 + ((90 - lat) / 180) * 0.62) * height,
    });

    let arcs: Arc[] = [];
    const spawnArc = (now: number) => {
      const from = CITIES[Math.floor(Math.random() * CITIES.length)];
      let to = from;
      while (to === from) to = CITIES[Math.floor(Math.random() * CITIES.length)];
      arcs.push({ from, to, start: now, duration: 2200 + Math.random() * 1400 });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, width * dpr);
      canvas.height = Math.max(1, height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const traceContinents = () => {
      for (const ring of CONTINENT_RINGS) {
        ctx.beginPath();
        ring.forEach(([lon, lat], i) => {
          const p = project(lat, lon);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fill();
        if (variant === 1) ctx.stroke();
      }
    };

    const drawLandDots = (size: number, color: string, jitter = 0) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const [lon, lat] of GLOBE_LAND_DOTS) {
        const p = project(lat, lon);
        const jx = jitter ? (Math.random() - 0.5) * jitter : 0;
        const jy = jitter ? (Math.random() - 0.5) * jitter : 0;
        ctx.moveTo(p.x + jx + size, p.y + jy);
        ctx.arc(p.x + jx, p.y + jy, size, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      if (variant === 1) {
        // Crisper fill + glowing coastline edge.
        ctx.fillStyle = "rgba(140, 175, 230, 0.2)";
        ctx.strokeStyle = "rgba(150, 205, 255, 0.35)";
        ctx.lineWidth = 1;
        ctx.shadowColor = "rgba(150, 200, 255, 0.45)";
        ctx.shadowBlur = 4;
        traceContinents();
        ctx.shadowBlur = 0;
        drawLandDots(0.9, "rgba(195, 220, 255, 0.6)");
      } else if (variant === 2) {
        // Finer, denser dot texture (double-pass with jitter).
        ctx.fillStyle = "rgba(140, 175, 230, 0.16)";
        traceContinents();
        drawLandDots(0.6, "rgba(195, 220, 255, 0.55)");
        drawLandDots(0.5, "rgba(195, 220, 255, 0.35)", 2.4);
      } else if (variant === 3) {
        // Gradient depth fill — lighter "lit" edge fading down.
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, "rgba(160, 195, 255, 0.26)");
        grad.addColorStop(1, "rgba(110, 145, 210, 0.12)");
        ctx.fillStyle = grad;
        traceContinents();
        drawLandDots(0.9, "rgba(195, 220, 255, 0.55)");
      } else if (variant === 4) {
        // Dual-tone dots — a scattered subset rendered brighter/larger for
        // sparkle/depth, rest at the base tone.
        ctx.fillStyle = "rgba(140, 175, 230, 0.16)";
        traceContinents();
        ctx.fillStyle = "rgba(195, 220, 255, 0.45)";
        ctx.beginPath();
        for (const [lon, lat] of GLOBE_LAND_DOTS) {
          const p = project(lat, lon);
          ctx.moveTo(p.x + 0.8, p.y);
          ctx.arc(p.x, p.y, 0.8, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.fillStyle = "rgba(220, 235, 255, 0.9)";
        ctx.beginPath();
        GLOBE_LAND_DOTS.forEach(([lon, lat], i) => {
          if (i % 9 !== 0) return;
          const p = project(lat, lon);
          ctx.moveTo(p.x + 1.3, p.y);
          ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
        });
        ctx.fill();
      } else {
        // variant 5 — warmer overall tint (indigo-violet blend) instead of
        // pure blue, plus a soft glow behind each city hub.
        ctx.fillStyle = "rgba(150, 165, 235, 0.18)";
        traceContinents();
        drawLandDots(0.9, "rgba(205, 215, 255, 0.6)");
        for (const city of CITIES) {
          const p = project(city.lat, city.lon);
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 22);
          glow.addColorStop(0, "rgba(190, 170, 255, 0.35)");
          glow.addColorStop(1, "rgba(190, 170, 255, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const city of CITIES) {
        const p = project(city.lat, city.lon);
        ctx.fillStyle = "rgba(180, 215, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      arcs = arcs.filter((a) => now - a.start < a.duration);
      for (const arc of arcs) {
        const p0 = project(arc.from.lat, arc.from.lon);
        const p1 = project(arc.to.lat, arc.to.lon);
        const progress = Math.min(1, (now - arc.start) / arc.duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const midX = (p0.x + p1.x) / 2;
        const midY = Math.min(p0.y, p1.y) - 36 - Math.abs(p0.x - p1.x) * 0.06;

        ctx.strokeStyle = `rgba(150, 205, 255, ${0.55 * (1 - progress * 0.3)})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        const steps = 24;
        const upto = Math.max(1, Math.round(steps * eased));
        for (let i = 0; i <= upto; i++) {
          const s = i / steps;
          const x = (1 - s) * (1 - s) * p0.x + 2 * (1 - s) * s * midX + s * s * p1.x;
          const y = (1 - s) * (1 - s) * p0.y + 2 * (1 - s) * s * midY + s * s * p1.y;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        const s = eased;
        const leadX = (1 - s) * (1 - s) * p0.x + 2 * (1 - s) * s * midX + s * s * p1.x;
        const leadY = (1 - s) * (1 - s) * p0.y + 2 * (1 - s) * s * midY + s * s * p1.y;
        ctx.fillStyle = "rgba(205, 230, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(leadX, leadY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (now: number) => {
      if (Math.random() < 0.035) spawnArc(now);
      draw(now);
      frame = requestAnimationFrame(loop);
    };

    resize();
    if (reduceMotion) {
      draw(0);
    } else {
      for (let i = 0; i < 4; i++) spawnArc(-i * 500);
      frame = requestAnimationFrame(loop);
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(0);
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}
