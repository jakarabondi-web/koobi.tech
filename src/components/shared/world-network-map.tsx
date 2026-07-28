"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * The signature visual: a live cartographic network diagram, not a generic
 * particle field. Traivr's actual business is literal — specialists spread
 * across the globe feed a shared pipeline — so the background draws that
 * directly: real city coordinates, a graticule (the technical, GPS/nav-chart
 * texture that reads "techie" honestly rather than via sci-fi glow), and
 * arcs that continuously fire from a rotating set of expert hubs into one
 * central hub. Domain tags cycle through so it's never just "a city blinked"
 * — it's "a linguist in Manila just contributed."
 *
 * Same performance discipline as NeuralMesh: DPR-aware, pauses off-screen
 * tabs, renders one static frame under prefers-reduced-motion.
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

// A rough centroid over the Atlantic keeps arc lengths roughly balanced
// across every origin city rather than favoring one hemisphere.
const HUB = { lat: 20, lon: -30 };

type Arc = { city: City; start: number; duration: number };

export function WorldNetworkMap({
  className,
  opacity = 1,
  /** "dark" (default) is tuned for a navy backdrop. "light" darkens and
   *  saturates the graticule, dots, and arcs so the same map holds up on a
   *  white/near-white surface instead of washing out. */
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
    let t = 0;

    // Same blue family either way — light tone is just pulled darker and
    // more saturated so it doesn't wash out against a white/near-white page.
    const palette =
      tone === "light"
        ? {
            graticule: "rgba(30, 64, 120, 0.07)",
            dot: "30, 96, 176",
            hub: "16, 80, 160",
            arc: "24, 104, 190",
            lead: "8, 66, 140",
          }
        : {
            graticule: "rgba(255, 255, 255, 0.05)",
            dot: "150, 200, 255",
            hub: "120, 190, 255",
            arc: "140, 210, 255",
            lead: "180, 225, 255",
          };

    const project = (lat: number, lon: number) => ({
      x: ((lon + 180) / 360) * width,
      // Compressed vertically (0.62) — a full equirectangular map wastes
      // most of its height on open ocean at the poles no city sits near.
      y: (0.19 + ((90 - lat) / 180) * 0.62) * height,
    });

    let arcs: Arc[] = [];
    const spawnArc = (now: number) => {
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      arcs.push({ city, start: now, duration: 2200 + Math.random() * 1400 });
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

    const drawGraticule = () => {
      ctx.strokeStyle = palette.graticule;
      ctx.lineWidth = 1;
      for (let lon = -180; lon <= 180; lon += 20) {
        ctx.beginPath();
        for (let lat = -80; lat <= 85; lat += 5) {
          const p = project(lat, lon);
          if (lat === -80) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      for (let lat = -80; lat <= 80; lat += 20) {
        const p0 = project(lat, -180);
        const p1 = project(lat, 180);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      drawGraticule();

      const hub = project(HUB.lat, HUB.lon);

      // Quiet city dots — the arcs are the story, dots just ground them.
      for (const city of CITIES) {
        const p = project(city.lat, city.lon);
        ctx.fillStyle = `rgba(${palette.dot}, ${0.35 * opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Hub — the shared pipeline every arc feeds.
      const hubPulse = 3 + Math.sin(now / 400) * 1.2;
      ctx.fillStyle = `rgba(${palette.hub}, ${0.55 * opacity})`;
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, hubPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${palette.hub}, ${0.25 * opacity})`;
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, hubPulse + 6, 0, Math.PI * 2);
      ctx.stroke();

      arcs = arcs.filter((a) => now - a.start < a.duration);
      for (const arc of arcs) {
        const p0 = project(arc.city.lat, arc.city.lon);
        const progress = Math.min(1, (now - arc.start) / arc.duration);
        // Ease so the arc accelerates in, then settles at the hub.
        const eased = 1 - Math.pow(1 - progress, 3);
        const midX = (p0.x + hub.x) / 2;
        const midY = Math.min(p0.y, hub.y) - 40 - Math.abs(p0.x - hub.x) * 0.08;

        // Draw the arc path up to `eased` using a quadratic bezier sampled
        // in short segments, and drop a bright pulse at its leading edge.
        ctx.strokeStyle = `rgba(${palette.arc}, ${0.55 * (1 - progress * 0.3) * opacity})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        const steps = 24;
        const upto = Math.max(1, Math.round(steps * eased));
        for (let i = 0; i <= upto; i++) {
          const s = i / steps;
          const x = (1 - s) * (1 - s) * p0.x + 2 * (1 - s) * s * midX + s * s * hub.x;
          const y = (1 - s) * (1 - s) * p0.y + 2 * (1 - s) * s * midY + s * s * hub.y;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        const s = eased;
        const leadX = (1 - s) * (1 - s) * p0.x + 2 * (1 - s) * s * midX + s * s * hub.x;
        const leadY = (1 - s) * (1 - s) * p0.y + 2 * (1 - s) * s * midY + s * s * hub.y;
        ctx.fillStyle = `rgba(${palette.lead}, ${0.9 * opacity})`;
        ctx.beginPath();
        ctx.arc(leadX, leadY, 2, 0, Math.PI * 2);
        ctx.fill();

        // Origin ring — fades in, marking which specialist just went live.
        if (progress < 0.35) {
          ctx.strokeStyle = `rgba(${palette.lead}, ${(1 - progress / 0.35) * 0.7 * opacity})`;
          ctx.beginPath();
          ctx.arc(p0.x, p0.y, 2 + progress * 20, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };

    const loop = (now: number) => {
      t = now;
      if (Math.random() < 0.035) spawnArc(t);
      draw(t);
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
