"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Depth-shaded particle mesh used as an ambient background.
 *
 * Nodes carry a `z` depth that drives hue, size, and brightness, so the mesh
 * reads with dimension rather than as a flat field of one colour. Hues span
 * the Slate palette's range (pale steel → deeper slate blue) and are the one
 * place in the UI allowed real chroma, since the chrome itself stays quiet.
 *
 * Honours `prefers-reduced-motion` (renders a static frame) and pauses
 * entirely while the tab is hidden so it costs nothing in the background.
 *
 * `tone="light"` swaps the pale, dark-surface palette for a darker, more
 * saturated one tuned for a white/near-white background — same hue range,
 * inverted lightness, so it still reads as "the same mesh" on either surface.
 */

type Node = { x: number; y: number; vx: number; vy: number; z: number };

export function NeuralMesh({
  className,
  density = 0.00012,
  maxNodes = 70,
  linkDistance = 110,
  /** "up" fades the mesh out toward the top, "none" keeps it even. */
  fade = "none",
  opacity = 1,
  /**
   * "dark" (default) is tuned for the navy surfaces this started on — pale,
   * low-saturation lines that read as a soft glow. "light" is for a white/
   * near-white surface: the same blue hue range, but pulled much darker and
   * more saturated so the mesh doesn't wash out against a light background.
   */
  tone = "dark",
}: {
  className?: string;
  density?: number;
  maxNodes?: number;
  linkDistance?: number;
  fade?: "up" | "down" | "none";
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
    let nodes: Node[] = [];
    let frame = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, width * dpr);
      canvas.height = Math.max(1, height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = Math.min(maxNodes, Math.max(12, Math.round(width * height * density)));
      nodes = Array.from({ length: target }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.24,
        vy: (Math.random() - 0.5) * 0.24,
        z: Math.random(),
      }));
    };

    // Mesh strength by vertical position, so it can dissolve toward an edge
    // instead of competing with foreground text.
    const fadeAt = (y: number) => {
      if (fade === "none") return 1;
      const t = y / Math.max(1, height);
      return fade === "up" ? Math.min(1, 0.2 + t * 1.25) : Math.min(1, 1.2 - t * 1.1);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const n of nodes) {
        if (!reduceMotion) {
          n.x += n.vx;
          n.y += n.vy;
        }
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist >= linkDistance) continue;
          const f = ((fadeAt(a.y) + fadeAt(b.y)) / 2) * opacity;
          const hue = 205 + ((a.z + b.z) / 2) * 40;
          const alpha = (1 - dist / linkDistance) * (tone === "light" ? 0.5 : 0.34) * f;
          ctx.strokeStyle =
            tone === "light" ? `hsla(${hue}, 62%, 42%, ${alpha})` : `hsla(${hue}, 52%, 70%, ${alpha})`;
          ctx.lineWidth = tone === "light" ? 0.9 : 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const f = fadeAt(n.y) * opacity;
        const hue = 205 + n.z * 40;
        const alpha = (0.35 + n.z * 0.52) * f;
        ctx.fillStyle =
          tone === "light"
            ? `hsla(${hue}, 68%, ${32 + n.z * 14}%, ${alpha})`
            : `hsla(${hue}, 58%, ${64 + n.z * 16}%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1 + n.z * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = () => {
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

    // Don't burn frames on a tab nobody is looking at.
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
  }, [density, maxNodes, linkDistance, fade, opacity, tone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}
