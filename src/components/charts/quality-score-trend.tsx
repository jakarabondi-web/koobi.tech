"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { axisProps, chartColors, tooltipStyle } from "./chart-theme";
import type { QualityPoint } from "@/lib/types";

export function QualityScoreTrend({ data }: { data: QualityPoint[] }) {
  return (
    <div
      className="h-[240px] w-full"
      role="img"
      aria-label="Area chart of the weekly quality score trend"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="qualityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.18} />
              <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="date" {...axisProps} dy={8} />
          <YAxis
            {...axisProps}
            domain={[90, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            {...tooltipStyle}
            formatter={(value: number) => [`${value.toFixed(1)}%`, "Quality score"]}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke={chartColors.completed}
            strokeWidth={2.5}
            fill="url(#qualityFill)"
            dot={{ r: 3, fill: chartColors.completed, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
