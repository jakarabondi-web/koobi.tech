"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils/cn";
import { GLOBE_LAND_DOTS, GLOBE_OCEAN_DOTS } from "@/components/shared/globe-dots";

/**
 * The signature visual: a live cartographic network diagram, not a generic
 * particle field. Traivr's actual business is literal — specialists spread
 * across the globe feed a shared pipeline — so the background draws that
 * directly: a dot-matrix world map (real coastlines from Natural Earth
 * 110m, see globe-dots.ts — land dots denser and brighter, ocean dots
 * sparse and faint) with animated great-circle-style connections that fire
 * directly between pairs of real cities, not everything converging on one
 * arbitrary point in the ocean.
 *
 * Same performance discipline as NeuralMesh: DPR-aware, pauses off-screen
 * tabs, renders one static frame under prefers-reduced-motion, and batches
 * the ~3,000 dots into two fill() calls (one per tier) rather than one
 * call per dot.
 */

type City = { name: string; domain: string; lat: number; lon: number };

const CITIES: City[] = [
  { name: "San Francisco", domain: "Software", lat: 37.77, lon: -122.42 },
  { name: "Toronto", domain: "Finance", lat: 43.65, lon: -79.38 },
  { name: "Mexico City", domain: "Linguistics", lat: 19.43, lon: -99.13 },
  { name: "São Paulo", domain: "Research", lat: -23.55, lon: -46.63 },
  { name: "Buenos Aires", domain: "Law", lat: -34.6, lon: -58.38 },
  { name: "London", domain: "Finance", lat: 51.51, lon: -0.13 },
  { name: "Berlin", domain: "Engineering", lat: 52.52, lon: 13.4 },
  { name: "Lagos", domain: "Software", lat: 6.52, lon: 3.38 },
  { name: "Cairo", domain: "Mathematics", lat: 30.04, lon: 31.24 },
  { name: "Nairobi", domain: "Science", lat: -1.29, lon: 36.82 },
  { name: "Mumbai", domain: "Medicine", lat: 19.08, lon: 72.88 },
  { name: "Bangalore", domain: "Software", lat: 12.97, lon: 77.59 },
  { name: "Singapore", domain: "Research", lat: 1.35, lon: 103.82 },
  { name: "Manila", domain: "Linguistics", lat: 14.6, lon: 120.98 },
  { name: "Tokyo", domain: "Engineering", lat: 35.68, lon: 139.69 },
  { name: "Seoul", domain: "Science", lat: 37.57, lon: 126.98 },
  { name: "Sydney", domain: "Mathematics", lat: -33.87, lon: 151.21 },
];

type Arc = { from: City; to: City; start: number; duration: number };

export function WorldNetworkMap({
  className,
  opacity = 1,
  /** "dark" (default) is tuned for a navy backdrop: light blue dots and
   *  connections. "light" darkens and saturates them for a white/near-white
   *  surface instead. */
  tone = "dark",
}: {
  className?: string;
  opacity?: number;
  tone?: "dark" | "light";
}) {
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

    const palette =
      tone === "light"
        ? {
            land: "rgba(20, 62, 122, 0.55)",
            ocean: "rgba(20, 62, 122, 0.12)",
            city: "16, 80, 160",
            arc: "24, 104, 190",
            lead: "8, 66, 140",
          }
        : {
            land: "rgba(195, 220, 255, 0.6)",
            ocean: "rgba(195, 220, 255, 0.12)",
            city: "180, 215, 255",
            arc: "150, 205, 255",
            lead: "205, 230, 255",
          };

    const project = (lat: number, lon: number) => ({
      x: ((lon + 180) / 360) * width,
      // Compressed vertically (0.62) — a full equirectangular map wastes
      // most of its height on open ocean at the poles no city sits near.
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

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = opacity;

      // Ocean — sparse, faint texture so the map reads as a full world,
      // not just floating continent-shaped dot clusters on empty space.
      ctx.beginPath();
      for (const [lon, lat] of GLOBE_OCEAN_DOTS) {
        const p = project(lat, lon);
        ctx.moveTo(p.x + 0.6, p.y);
        ctx.arc(p.x, p.y, 0.6, 0, Math.PI * 2);
      }
      ctx.fillStyle = palette.ocean;
      ctx.fill();

      // Land — the actual map, denser and brighter than ocean.
      ctx.beginPath();
      for (const [lon, lat] of GLOBE_LAND_DOTS) {
        const p = project(lat, lon);
        ctx.moveTo(p.x + 1, p.y);
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
      }
      ctx.fillStyle = palette.land;
      ctx.fill();

      ctx.globalAlpha = 1;

      for (const city of CITIES) {
        const p = project(city.lat, city.lon);
        ctx.fillStyle = `rgba(${palette.city}, ${0.55 * opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Arcs — directly between two real cities, not converging on one
      // arbitrary hub point (which tended to land in open ocean).
      arcs = arcs.filter((a) => now - a.start < a.duration);
      for (const arc of arcs) {
        const p0 = project(arc.from.lat, arc.from.lon);
        const p1 = project(arc.to.lat, arc.to.lon);
        const progress = Math.min(1, (now - arc.start) / arc.duration);
        // Ease so the arc accelerates in, then settles at the destination.
        const eased = 1 - Math.pow(1 - progress, 3);
        const midX = (p0.x + p1.x) / 2;
        const midY = Math.min(p0.y, p1.y) - 36 - Math.abs(p0.x - p1.x) * 0.06;

        ctx.strokeStyle = `rgba(${palette.arc}, ${0.55 * (1 - progress * 0.3) * opacity})`;
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
        ctx.fillStyle = `rgba(${palette.lead}, ${0.9 * opacity})`;
        ctx.beginPath();
        ctx.arc(leadX, leadY, 2, 0, Math.PI * 2);
        ctx.fill();

        if (progress < 0.35) {
          ctx.strokeStyle = `rgba(${palette.lead}, ${(1 - progress / 0.35) * 0.7 * opacity})`;
          ctx.beginPath();
          ctx.arc(p0.x, p0.y, 2 + progress * 20, 0, Math.PI * 2);
          ctx.stroke();
        }
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
      for (let i = 0; i < 5; i++) spawnArc(-i * 500);
      frame = requestAnimationFrame(loop);
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(0);
    });
    observer.observe(canvas);

    const onVisibility = () => {
      if (reduceMotion) return;
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(loop);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [opacity, tone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}
