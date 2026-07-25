import { LogoMark } from "@/components/brand/logo";
import { heroExperts } from "@/lib/mock-data";

/** Deterministic pseudo-random so the constellation renders identically on
 *  the server and the client. */
function seeded(index: number, offset: number) {
  const value = Math.sin(index * 12.9898 + offset * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

const SPOKES = 14;

export function ExpertNetworkGraphic() {
  return (
    <div className="relative aspect-square w-full max-w-xl">
      <svg
        viewBox="0 0 400 400"
        className="h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        {Array.from({ length: SPOKES }).map((_, index) => {
          const angle = (index / SPOKES) * Math.PI * 2;
          const length = 92 + seeded(index, 1) * 78;
          const x = 200 + Math.cos(angle) * length;
          const y = 200 + Math.sin(angle) * length;

          return (
            <g key={index}>
              <line
                x1={200 + Math.cos(angle) * 46}
                y1={200 + Math.sin(angle) * 46}
                x2={x}
                y2={y}
                stroke="#bbf7d0"
                strokeWidth="1"
              />
              <circle cx={x} cy={y} r={2.5 + seeded(index, 2) * 2.5} fill="#22c55e" />
              <circle
                cx={200 + Math.cos(angle) * (length * 0.62)}
                cy={200 + Math.sin(angle) * (length * 0.62)}
                r={1.8}
                fill="#86efac"
              />
            </g>
          );
        })}

        {Array.from({ length: SPOKES }).map((_, index) => {
          const from = (index / SPOKES) * Math.PI * 2;
          const to = ((index + 1) / SPOKES) * Math.PI * 2;
          const radius = 110 + seeded(index, 3) * 40;

          return (
            <line
              key={`chord-${index}`}
              x1={200 + Math.cos(from) * radius}
              y1={200 + Math.sin(from) * radius}
              x2={200 + Math.cos(to) * radius}
              y2={200 + Math.sin(to) * radius}
              stroke="#dcfce7"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <LogoMark className="h-12 w-12 [&>path:first-child]:fill-transparent" />
        </span>
      </div>

      {heroExperts.map((expert) => (
        <div
          key={expert.id}
          className="absolute flex items-center gap-2 rounded-full border border-border bg-background/95 py-1 pl-1 pr-3 shadow-md backdrop-blur"
          // Chips past the halfway mark are anchored by their right edge so
          // they grow inward and never overflow the container on small screens.
          style={
            expert.x >= 50
              ? { right: `${Math.max(0, 100 - expert.x - 8)}%`, top: `${expert.y}%` }
              : { left: `${expert.x}%`, top: `${expert.y}%` }
          }
        >
          <span
            className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-emerald-200 to-green-400"
            aria-hidden="true"
          />
          <span className="whitespace-nowrap text-xs font-medium">{expert.label}</span>
        </div>
      ))}

      <div className="absolute bottom-0 right-0 w-52 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
        <div className="bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          Model Evaluation
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Quality Score</p>
          <div className="mt-1 flex items-end justify-between gap-2">
            <p className="text-xl font-bold tracking-tight">98.4%</p>
            <svg
              viewBox="0 0 80 32"
              className="h-8 w-20"
              aria-hidden="true"
              focusable="false"
            >
              <polyline
                points="0,26 10,22 20,24 30,16 40,19 50,12 60,14 70,6 80,2"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
