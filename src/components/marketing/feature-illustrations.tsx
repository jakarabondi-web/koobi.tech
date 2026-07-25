import { CircleDot, RefreshCw } from "lucide-react";

import { evaluationDimensions } from "@/lib/mock-data";

/** "Build high-quality data" — an editor pane with a review checklist. */
export function DataBuilderIllustration() {
  return (
    <div className="relative h-44" aria-hidden="true">
      <div className="absolute left-0 top-2 w-2/3 rounded-md bg-forest-deep p-3 shadow-md">
        <div className="flex gap-1">
          {["bg-emerald-500/70", "bg-emerald-400/50", "bg-emerald-300/30"].map(
            (tone) => (
              <span key={tone} className={`h-1.5 w-1.5 rounded-full ${tone}`} />
            ),
          )}
        </div>
        <div className="mt-3 space-y-1.5">
          {["w-4/5", "w-3/5", "w-11/12", "w-2/3", "w-1/2"].map((width, index) => (
            <span
              key={index}
              className={`block h-1.5 rounded-full bg-emerald-400/40 ${width}`}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 right-0 w-3/5 rounded-md border border-border bg-background p-3 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <span className="h-1.5 w-12 rounded-full bg-muted" />
          <RefreshCw className="h-3.5 w-3.5 text-primary" />
        </div>
        {[
          { label: "Prompt", tone: "text-amber-500" },
          { label: "Ideal Response", tone: "text-amber-500" },
          { label: "Approved", tone: "text-primary" },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center gap-2 border-t border-border py-1.5 first:border-t-0"
          >
            <CircleDot className={`h-3 w-3 shrink-0 ${row.tone}`} />
            <span className="truncate text-[10px] font-medium">{row.label}</span>
            <span className="ml-auto h-1 w-6 rounded-full bg-primary/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Evaluate with confidence" — quality dimensions as a column chart. */
export function EvaluationIllustration() {
  return (
    <div className="flex h-44 items-end gap-6" aria-hidden="true">
      <ul className="flex h-full flex-col justify-end gap-4 pb-1 text-[10px] text-muted-foreground">
        {evaluationDimensions.map((dimension) => (
          <li key={dimension.id}>{dimension.label}</li>
        ))}
      </ul>

      <div className="flex h-full flex-1 items-end justify-around gap-3">
        {evaluationDimensions.map((dimension) => (
          <div
            key={dimension.id}
            className="flex w-7 flex-col items-center"
            style={{ height: `${dimension.value}%` }}
          >
            <span className="h-2 w-full rounded-t-sm bg-emerald-200" />
            <span className="w-full flex-1 rounded-b-sm bg-forest-light" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Continuously improve" — the evaluate → insights → improve loop. */
export function ImprovementLoopIllustration() {
  return (
    <div className="relative h-44" aria-hidden="true">
      <svg viewBox="0 0 240 150" className="h-full w-full">
        <ellipse
          cx="120"
          cy="75"
          rx="62"
          ry="52"
          fill="none"
          stroke="#22c55e"
          strokeWidth="1.5"
        />
        <circle cx="120" cy="23" r="9" fill="#16a34a" />
        <path
          d="M116 23l3 3.5 6-7"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="58" cy="75" r="5" fill="#ffffff" stroke="#22c55e" strokeWidth="2" />
        <circle cx="182" cy="75" r="5" fill="#16a34a" />
        <circle cx="120" cy="127" r="5" fill="#ffffff" stroke="#22c55e" strokeWidth="2" />
      </svg>

      {[
        { label: "Evaluate", className: "left-0 top-1/2 -translate-y-1/2" },
        { label: "Insights", className: "right-0 top-1/2 -translate-y-1/2" },
        { label: "Improve", className: "bottom-0 left-1/2 -translate-x-1/2" },
      ].map((chip) => (
        <span
          key={chip.label}
          className={`absolute rounded-md border border-border bg-background px-3 py-1 text-[10px] font-medium shadow-sm ${chip.className}`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
