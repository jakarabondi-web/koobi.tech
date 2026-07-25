"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { axisProps, chartColors, tooltipStyle } from "./chart-theme";
import type { TimeSeriesPoint } from "@/lib/types";
import { formatCompact, formatNumber } from "@/lib/utils";

export function TaskCompletionTrend({ data }: { data: TimeSeriesPoint[] }) {
  return (
    <figure className="m-0">
      <figcaption className="mb-4 flex items-center gap-6 text-xs font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-0.5 w-6 rounded-full"
            style={{ backgroundColor: chartColors.completed }}
            aria-hidden="true"
          />
          Completed
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="h-0.5 w-6 rounded-full border-t-2 border-dashed"
            style={{ borderColor: chartColors.reviewed }}
            aria-hidden="true"
          />
          Reviewed
        </span>
      </figcaption>

      <div
        className="h-[280px] w-full"
        role="img"
        aria-label="Line chart of tasks completed and reviewed between May 12 and May 18"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="date" {...axisProps} dy={8} />
            <YAxis
              {...axisProps}
              domain={[10000, 40000]}
              ticks={[10000, 20000, 30000, 40000]}
              tickFormatter={(value) => formatCompact(Number(value))}
            />
            <Tooltip
              {...tooltipStyle}
              formatter={(value: number, name) => [formatNumber(value), name]}
            />
            <Line
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke={chartColors.completed}
              strokeWidth={2.5}
              dot={{ r: 3, fill: chartColors.completed, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="reviewed"
              name="Reviewed"
              stroke={chartColors.reviewed}
              strokeWidth={2.5}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: chartColors.reviewed, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
