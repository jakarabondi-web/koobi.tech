"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type WeeklyTaskPoint = { day: string; completed: number; reviewed: number };

export function WeeklyTaskChart({ data }: { data: WeeklyTaskPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
        <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} stroke="var(--muted-foreground)" allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="completed" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Completed" />
        <Bar dataKey="reviewed" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} name="Reviewed" />
      </BarChart>
    </ResponsiveContainer>
  );
}
