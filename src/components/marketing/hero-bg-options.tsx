"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Five candidate animated backgrounds for the marketing hero. Built to be
 * screenshotted side by side and narrowed to one — not all five are meant
 * to ship. Each is self-contained (own canvas loop, own resize/visibility
 * handling) so picking a winner is just deleting the others.
 */

function useCanvasLoop(
  ref: React.RefObject<HTMLCanvasElement | null>,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number, t: number) => void
) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let frame = 0;
    let start = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, width * dpr);
      canvas.height = Math.max(1, height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const loop = (now: number) => {
      draw(ctx, width, height, reduceMotion ? 0 : now - start);
      frame = requestAnimationFrame(loop);
    };

    resize();
    if (reduceMotion) {
      draw(ctx, width, height, 0);
    } else {
      frame = requestAnimationFrame(loop);
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(ctx, width, height, 0);
    });
    observer.observe(canvas);

    const onVisibility = () => {
      if (reduceMotion) return;
      cancelAnimationFrame(frame);
      if (!document.hidden) {
        start = performance.now();
        frame = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ---------------------------------------------------------------------- */
/* 1. Full Mesh — the current NeuralMesh, but every node links to nearly   */
/*    every node in range, so the web reads as fully interconnected       */
/*    rather than a sparse scatter of occasional lines.                   */
/* ---------------------------------------------------------------------- */

type MeshNode = { x: number; y: number; vx: number; vy: number; z: number };

export function HeroBgFullMesh({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<MeshNode[]>([]);

  useCanvasLoop(ref, (ctx, width, height) => {
    if (width === 0) return;
    if (nodesRef.current.length === 0 || Math.abs(nodesRef.current.length - Math.round(width * height * 0.00022)) > 20) {
      const target = Math.min(140, Math.max(24, Math.round(width * height * 0.00022)));
      nodesRef.current = Array.from({ length: target }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        z: Math.random(),
      }));
    }
    const nodes = nodesRef.current;
    ctx.clearRect(0, 0, width, height);

    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;
    }

    const linkDistance = 210;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist >= linkDistance) continue;
        const hue = 205 + ((a.z + b.z) / 2) * 40;
        const alpha = (1 - dist / linkDistance) * 0.55;
        ctx.strokeStyle = `hsla(${hue}, 64%, 40%, ${alpha})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (const n of nodes) {
      const hue = 205 + n.z * 40;
      ctx.fillStyle = `hsla(${hue}, 70%, ${30 + n.z * 16}%, ${0.55 + n.z * 0.35})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 1.3 + n.z * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}

/* ---------------------------------------------------------------------- */
/* 2. Circuit Grid — orthogonal PCB-trace lines with light pulses         */
/*    traveling along them. Reads as literal "circuitry", very techy.     */
/* ---------------------------------------------------------------------- */

type Trace = { points: { x: number; y: number }[]; pulseT: number; speed: number };

export function HeroBgCircuit({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tracesRef = useRef<Trace[]>([]);
  const gridRef = useRef(28);

  useCanvasLoop(ref, (ctx, width, height) => {
    if (width === 0) return;
    const grid = gridRef.current;
    if (tracesRef.current.length === 0) {
      const cols = Math.floor(width / grid);
      const rows = Math.floor(height / grid);
      const count = Math.min(26, Math.max(10, Math.round((cols * rows) / 18)));
      tracesRef.current = Array.from({ length: count }, () => {
        let x = Math.round(Math.random() * cols) * grid;
        let y = Math.round(Math.random() * rows) * grid;
        const points = [{ x, y }];
        const segs = 3 + Math.floor(Math.random() * 3);
        for (let s = 0; s < segs; s++) {
          const horizontal = Math.random() > 0.5;
          const len = (1 + Math.floor(Math.random() * 3)) * grid * (Math.random() > 0.5 ? 1 : -1);
          if (horizontal) x = Math.max(0, Math.min(cols * grid, x + len));
          else y = Math.max(0, Math.min(rows * grid, y + len));
          points.push({ x, y });
        }
        return { points, pulseT: Math.random(), speed: 0.00025 + Math.random() * 0.00025 };
      });
    }

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "hsla(215, 40%, 55%, 0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < width; x += grid) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += grid) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    for (const trace of tracesRef.current) {
      ctx.strokeStyle = "hsla(212, 55%, 45%, 0.45)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      trace.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      for (const p of trace.points) {
        ctx.fillStyle = "hsla(212, 50%, 40%, 0.5)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      trace.pulseT = (trace.pulseT + trace.speed * 16) % 1;
      const totalLen = trace.points.slice(1).reduce((acc, p, i) => acc + Math.hypot(p.x - trace.points[i].x, p.y - trace.points[i].y), 0);
      let target = trace.pulseT * totalLen;
      let px = trace.points[0].x;
      let py = trace.points[0].y;
      for (let i = 1; i < trace.points.length; i++) {
        const a = trace.points[i - 1];
        const b = trace.points[i];
        const segLen = Math.hypot(b.x - a.x, b.y - a.y);
        if (target <= segLen) {
          const s = segLen === 0 ? 0 : target / segLen;
          px = a.x + (b.x - a.x) * s;
          py = a.y + (b.y - a.y) * s;
          break;
        }
        target -= segLen;
      }
      ctx.fillStyle = "hsla(200, 90%, 62%, 0.95)";
      ctx.shadowColor = "hsla(200, 90%, 62%, 0.9)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}

/* ---------------------------------------------------------------------- */
/* 3. Constellation Pulse — dense particle field, fully linked within     */
/*    range, with slow glowing "data packets" traveling along edges.      */
/* ---------------------------------------------------------------------- */

type Packet = { from: MeshNode; to: MeshNode; t: number; speed: number };

export function HeroBgConstellation({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<MeshNode[]>([]);
  const packetsRef = useRef<Packet[]>([]);

  useCanvasLoop(ref, (ctx, width, height) => {
    if (width === 0) return;
    if (nodesRef.current.length === 0) {
      const target = Math.min(70, Math.max(18, Math.round((width * height) / 9000)));
      nodesRef.current = Array.from({ length: target }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        z: Math.random(),
      }));
    }
    const nodes = nodesRef.current;
    ctx.clearRect(0, 0, width, height);

    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;
    }

    const linkDistance = 170;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist >= linkDistance) continue;
        const alpha = (1 - dist / linkDistance) * 0.4;
        ctx.strokeStyle = `hsla(230, 55%, 55%, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    if (Math.random() < 0.04 && nodes.length > 1) {
      const from = nodes[Math.floor(Math.random() * nodes.length)];
      let to = from;
      let tries = 0;
      while (to === from && tries < 5) {
        to = nodes[Math.floor(Math.random() * nodes.length)];
        tries++;
      }
      packetsRef.current.push({ from, to, t: 0, speed: 0.012 + Math.random() * 0.01 });
    }
    packetsRef.current = packetsRef.current.filter((p) => p.t < 1);
    for (const p of packetsRef.current) {
      p.t += p.speed;
      const x = p.from.x + (p.to.x - p.from.x) * p.t;
      const y = p.from.y + (p.to.y - p.from.y) * p.t;
      ctx.fillStyle = "hsla(190, 90%, 65%, 0.95)";
      ctx.shadowColor = "hsla(190, 90%, 65%, 0.9)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (const n of nodes) {
      const hue = 220 + n.z * 40;
      ctx.fillStyle = `hsla(${hue}, 65%, ${34 + n.z * 18}%, ${0.6 + n.z * 0.3})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 1.4 + n.z * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}

/* ---------------------------------------------------------------------- */
/* 4. Data Stream — vertical falling code-rain columns, subdued and       */
/*    monochrome-blue rather than green, so it reads "techy" not "hacker".*/
/* ---------------------------------------------------------------------- */

type Stream = { x: number; y: number; speed: number; len: number };

export function HeroBgDataStream({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const streamsRef = useRef<Stream[]>([]);

  useCanvasLoop(ref, (ctx, width, height) => {
    if (width === 0) return;
    const col = 22;
    if (streamsRef.current.length === 0) {
      const cols = Math.floor(width / col);
      streamsRef.current = Array.from({ length: cols }, (_, i) => ({
        x: i * col + col / 2,
        y: Math.random() * -height,
        speed: 0.4 + Math.random() * 0.9,
        len: 60 + Math.random() * 140,
      }));
    }
    ctx.fillStyle = "rgba(10, 14, 24, 0.14)";
    ctx.fillRect(0, 0, width, height);

    for (const s of streamsRef.current) {
      s.y += s.speed;
      if (s.y - s.len > height) {
        s.y = -Math.random() * 200;
        s.speed = 0.4 + Math.random() * 0.9;
      }
      const grad = ctx.createLinearGradient(s.x, s.y - s.len, s.x, s.y);
      grad.addColorStop(0, "hsla(205, 70%, 60%, 0)");
      grad.addColorStop(1, "hsla(205, 80%, 65%, 0.5)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - s.len);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();

      ctx.fillStyle = "hsla(195, 90%, 75%, 0.85)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}

/* ---------------------------------------------------------------------- */
/* 5. Hex Grid — a honeycomb of hexagon cells with a slow scanning        */
/*    highlight sweep and randomly pulsing cells, like an HUD readout.    */
/* ---------------------------------------------------------------------- */

export function HeroBgHexGrid({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pulsesRef = useRef<Map<string, number>>(new Map());

  useCanvasLoop(ref, (ctx, width, height, t) => {
    if (width === 0) return;
    ctx.clearRect(0, 0, width, height);

    const r = 26;
    const hexW = r * 2;
    const hexH = Math.sqrt(3) * r;
    const cols = Math.ceil(width / (hexW * 0.75)) + 2;
    const rows = Math.ceil(height / hexH) + 2;

    const drawHex = (cx: number, cy: number, fillAlpha: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (fillAlpha > 0) {
        ctx.fillStyle = `hsla(205, 80%, 60%, ${fillAlpha})`;
        ctx.fill();
      }
      ctx.stroke();
    };

    ctx.strokeStyle = "hsla(212, 45%, 55%, 0.16)";
    ctx.lineWidth = 1;

    const sweepX = ((t * 0.06) % (width + 400)) - 200;

    for (let row = 0; row < rows; row++) {
      for (let cOuter = 0; cOuter < cols; cOuter++) {
        const cx = cOuter * hexW * 0.75;
        const cy = row * hexH + (cOuter % 2 === 0 ? 0 : hexH / 2);
        const key = `${row}-${cOuter}`;
        let pulse = pulsesRef.current.get(key) ?? 0;
        if (pulse <= 0 && Math.random() < 0.0006) pulse = 1;
        if (pulse > 0) {
          pulse -= 0.012;
          pulsesRef.current.set(key, Math.max(0, pulse));
        }
        const sweepDist = Math.abs(cx - sweepX);
        const sweepAlpha = sweepDist < 140 ? (1 - sweepDist / 140) * 0.22 : 0;
        drawHex(cx, cy, Math.max(pulse * 0.4, sweepAlpha));
      }
    }
  });

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}
