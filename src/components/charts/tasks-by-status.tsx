"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { tooltipStyle } from "./chart-theme";
import type { StatusSlice } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface TasksByStatusProps {
  data: StatusSlice[];
  total: number;
}

export function TasksByStatus({ data, total }: TasksByStatusProps) {
  return (
    <div>
      <div
        className="relative h-[240px] w-full"
        role="img"
        aria-label={`Donut chart of ${formatNumber(total)} tasks by status: ${data
          .map((slice) => `${slice.label} ${slice.percent}%`)
          .join(", ")}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={68}
              outerRadius={100}
              paddingAngle={1}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {data.map((slice) => (
                <Cell key={slice.id} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              {...tooltipStyle}
              formatter={(value: number, name) => [formatNumber(value), name]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-2xl font-bold tracking-tight">
            {formatNumber(total)}
          </span>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {data.map((slice) => (
          <li key={slice.id} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
                aria-hidden="true"
              />
              <span className="font-medium">{slice.label}</span>
            </span>
            <span className="text-muted-foreground">
              {formatNumber(slice.value)} ({slice.percent}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
