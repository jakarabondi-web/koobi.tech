"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils/cn";
import { CONTINENT_RINGS } from "@/components/shared/globe-continents";
import { GLOBE_LAND_DOTS } from "@/components/shared/globe-dots";

/**
 * Four candidate reworks of the homepage's world map, all using real
 * coastline geometry (world-atlas 110m, extracted once into
 * globe-continents.ts) instead of the dot-matrix's implied shapes — the
 * complaint was that the dot cloud didn't read as a map. Throwaway preview
 * components, same pattern as hero-bg-options/usecase-showcase-options.
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

export type MapStyle = "filled-dots" | "outline" | "glassy-fill" | "hybrid";

export function WorldMapPreview({ className, style }: { className?: string; style: MapStyle }) {
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
        if (style === "filled-dots" || style === "glassy-fill" || style === "hybrid") ctx.fill();
        if (style === "outline" || style === "hybrid") ctx.stroke();
      }
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      if (style === "filled-dots") {
        ctx.fillStyle = "rgba(140, 175, 230, 0.16)";
        traceContinents();
        // Dot texture on top of the faint fill so it reads as both a map
        // and the original circuit-board texture — reuses the precomputed
        // land-dot positions (already known to sit on land) rather than
        // testing every pixel against every ring live, which is far too
        // slow to do every animation frame.
        ctx.fillStyle = "rgba(195, 220, 255, 0.6)";
        ctx.beginPath();
        for (const [lon, lat] of GLOBE_LAND_DOTS) {
          const p = project(lat, lon);
          ctx.moveTo(p.x + 0.9, p.y);
          ctx.arc(p.x, p.y, 0.9, 0, Math.PI * 2);
        }
        ctx.fill();
      } else if (style === "outline") {
        ctx.strokeStyle = "rgba(195, 220, 255, 0.65)";
        ctx.lineWidth = 1.1;
        ctx.shadowColor = "rgba(150, 200, 255, 0.5)";
        ctx.shadowBlur = 3;
        traceContinents();
        ctx.shadowBlur = 0;
      } else if (style === "glassy-fill") {
        ctx.fillStyle = "rgba(150, 190, 255, 0.14)";
        ctx.strokeStyle = "rgba(195, 220, 255, 0.4)";
        ctx.lineWidth = 1;
        traceContinents();
      } else if (style === "hybrid") {
        ctx.fillStyle = "rgba(140, 175, 230, 0.1)";
        ctx.strokeStyle = "rgba(195, 220, 255, 0.55)";
        ctx.lineWidth = 1;
        traceContinents();
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
  }, [style]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}
