/** Shared Recharts styling so every chart reads as one system. */
export const chartColors = {
  completed: "#166534",
  reviewed: "#4ade80",
  primary: "#16a34a",
  grid: "#e2e8f0",
  axis: "#94a3b8",
};

export const axisProps = {
  stroke: chartColors.axis,
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 11, fill: chartColors.axis },
} as const;

export const tooltipStyle = {
  contentStyle: {
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgb(16 24 40 / 0.08)",
    fontSize: 12,
  },
  labelStyle: { fontWeight: 600, color: "#0f172a" },
} as const;
