"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { axisProps, chartColors, tooltipStyle } from "./chart-theme";
import type { WeeklyProgressPoint } from "@/lib/types";

export function WeeklyTaskProgress({ data }: { data: WeeklyProgressPoint[] }) {
  /**
   * The design shows one bar per day where the reviewed total sits behind the
   * completed total, so the stack renders the remainder as a lighter cap.
   */
  const stacked = data.map((point) => ({
    ...point,
    remainder: Math.max(0, point.reviewed - point.completed),
  }));

  return (
    <figure className="m-0">
      <figcaption className="mb-4 flex items-center justify-center gap-6 text-xs font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: chartColors.completed }}
            aria-hidden="true"
          />
          Completed
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: "#bbf7d0" }}
            aria-hidden="true"
          />
          Reviewed
        </span>
      </figcaption>

      <div
        className="h-[280px] w-full"
        role="img"
        aria-label="Bar chart of tasks completed and reviewed for each day of the week"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stacked} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="day" {...axisProps} dy={8} />
            <YAxis {...axisProps} />
            <Tooltip
              {...tooltipStyle}
              cursor={{ fill: "rgba(22, 163, 74, 0.06)" }}
              formatter={(value: number, name) =>
                name === "Reviewed"
                  ? [value, "Reviewed (additional)"]
                  : [value, "Completed"]
              }
            />
            <Bar
              dataKey="completed"
              name="Completed"
              stackId="tasks"
              fill={chartColors.completed}
              barSize={22}
            />
            <Bar
              dataKey="remainder"
              name="Reviewed"
              stackId="tasks"
              fill="#bbf7d0"
              barSize={22}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
