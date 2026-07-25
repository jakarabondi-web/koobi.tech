"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Faint blueprint grid with a slow vertical scan, sitting behind dashboard
 * content. Deliberately low-contrast: it should register as texture, never
 * compete with data. Pauses when hidden and renders a static grid (no scan)
 * under `prefers-reduced-motion`.
 */
export function AmbientGrid({
  className,
  cell = 34,
  lineOpacity = 0.055,
}: {
  className?: string;
  cell?: number;
  lineOpacity?: number;
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
    let t = 0;
    let frame = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, width * dpr);
      canvas.height = Math.max(1, height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = `rgba(110, 135, 175, ${lineOpacity})`;
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += cell) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += cell) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }

      if (!reduceMotion) {
        const scanY = ((t % 9) / 9) * (height + 160) - 80;
        const gradient = ctx.createLinearGradient(0, scanY - 70, 0, scanY + 70);
        gradient.addColorStop(0, "rgba(110, 135, 175, 0)");
        gradient.addColorStop(0.5, "rgba(125, 155, 195, 0.07)");
        gradient.addColorStop(1, "rgba(110, 135, 175, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, scanY - 70, width, 140);
      }
    };

    const loop = () => {
      t += 0.014;
      draw();
      frame = requestAnimationFrame(loop);
    };

    resize();
    if (reduceMotion) {
      draw();
    } else {
      loop();
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw();
    });
    observer.observe(canvas);

    const onVisibility = () => {
      if (reduceMotion) return;
      cancelAnimationFrame(frame);
      if (!document.hidden) loop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [cell, lineOpacity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}
