import { networkNodes } from "@/lib/mock-data";

/**
 * Low-resolution landmass mask: each row maps to a 5° latitude band starting
 * at 80°N, each column to a 6° longitude step starting at 180°W. Ranges are
 * inclusive column pairs, which keeps the map compact and editable.
 */
const LANDMASS: Record<number, [number, number][]> = {
  0: [[20, 24]],
  1: [
    [8, 18],
    [20, 25],
    [33, 33],
    [40, 56],
  ],
  2: [
    [3, 7],
    [8, 19],
    [20, 25],
    [30, 34],
    [35, 58],
  ],
  3: [
    [2, 7],
    [8, 19],
    [21, 25],
    [27, 27],
    [29, 34],
    [35, 59],
  ],
  4: [
    [2, 7],
    [8, 20],
    [22, 24],
    [28, 34],
    [35, 59],
  ],
  5: [
    [3, 20],
    [28, 33],
    [34, 59],
  ],
  6: [
    [4, 20],
    [28, 34],
    [35, 57],
  ],
  7: [
    [4, 19],
    [28, 35],
    [36, 56],
  ],
  8: [
    [4, 19],
    [29, 36],
    [37, 55],
  ],
  9: [
    [5, 19],
    [30, 36],
    [37, 40],
    [41, 54],
  ],
  10: [
    [6, 18],
    [30, 37],
    [38, 40],
    [43, 53],
  ],
  11: [
    [7, 16],
    [30, 40],
    [43, 52],
  ],
  12: [
    [8, 15],
    [16, 17],
    [29, 40],
    [43, 51],
  ],
  13: [
    [11, 16],
    [17, 19],
    [28, 39],
    [43, 51],
  ],
  14: [
    [12, 16],
    [18, 21],
    [28, 40],
    [43, 45],
    [48, 52],
  ],
  15: [
    [17, 22],
    [29, 42],
    [48, 54],
  ],
  16: [
    [18, 25],
    [30, 42],
    [48, 55],
  ],
  17: [
    [18, 27],
    [31, 42],
    [49, 57],
  ],
  18: [
    [19, 28],
    [32, 41],
    [50, 58],
  ],
  19: [
    [19, 28],
    [32, 41],
    [50, 55],
  ],
  20: [
    [19, 27],
    [32, 40],
    [41, 41],
    [49, 56],
  ],
  21: [
    [20, 27],
    [33, 39],
    [41, 41],
    [49, 56],
  ],
  22: [
    [21, 27],
    [33, 38],
    [50, 56],
  ],
  23: [
    [21, 26],
    [33, 36],
    [51, 55],
    [58, 59],
  ],
  24: [
    [22, 25],
    [58, 59],
  ],
  25: [
    [22, 25],
    [58, 58],
  ],
  26: [[22, 24]],
  27: [[23, 24]],
};

const COLS = 60;
const ROWS = 28;
const STEP = 10;
const DOT_RADIUS = 2.6;

function landDots() {
  const dots: { x: number; y: number }[] = [];

  for (let row = 0; row < ROWS; row += 1) {
    for (const [start, end] of LANDMASS[row] ?? []) {
      for (let col = start; col <= Math.min(end, COLS - 1); col += 1) {
        dots.push({ x: col * STEP + STEP / 2, y: row * STEP + STEP / 2 });
      }
    }
  }

  return dots;
}

const DOTS = landDots();

export function WorldMap() {
  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${COLS * STEP} ${ROWS * STEP}`}
        className="h-auto w-full"
        role="img"
        aria-label="Dotted world map highlighting Trainora AI expert hubs across every continent"
      >
        {DOTS.map((dot, index) => (
          <circle
            key={index}
            cx={dot.x}
            cy={dot.y}
            r={DOT_RADIUS}
            fill="#22c55e"
            opacity="0.45"
          />
        ))}
      </svg>

      {networkNodes.map((node, index) => (
        <span
          key={node.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
        >
          <span className="sr-only">{node.label}</span>
          <span
            aria-hidden="true"
            className="block h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_14px_6px_rgba(74,222,128,0.65)] animate-pulse-glow"
            style={{ animationDelay: `${index * 0.35}s` }}
          />
        </span>
      ))}
    </div>
  );
}
