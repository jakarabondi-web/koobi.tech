"use client";

import { useMemo, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { ListChecks } from "lucide-react";
import { DeadlineTimer } from "@/components/admin/deadline-timer";

export type AdminTaskAssignmentRow = {
  id: string;
  taskId: string;
  projectName: string;
  trainerName: string;
  assignedAt: string;
  dueAt: string | null;
  completedAt: string | null;
  isGold: boolean;
};

type Filter = "all" | "in_progress" | "completed" | "overdue";

function rowStatus(row: AdminTaskAssignmentRow): "completed" | "overdue" | "in_progress" {
  if (row.completedAt) return "completed";
  if (row.dueAt && new Date(row.dueAt).getTime() < Date.now()) return "overdue";
  return "in_progress";
}

export function TaskAssignmentsTable({ rows }: { rows: AdminTaskAssignmentRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const c = { all: rows.length, in_progress: 0, completed: 0, overdue: 0 };
    for (const r of rows) c[rowStatus(r)]++;
    return c;
  }, [rows]);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => rowStatus(r) === filter)),
    [rows, filter]
  );

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="in_progress">Under completion ({counts.in_progress})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({counts.overdue})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="pt-6 pb-6">
          {filtered.length === 0 ? (
            <EmptyState icon={ListChecks} title="Nothing here" description="No assigned jobs match this filter." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Time left</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const status = rowStatus(row);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="font-mono text-xs">{row.taskId.slice(0, 8)}</span>
                        {row.isGold ? <span className="ml-1.5 text-[10px] text-muted-foreground">GOLD</span> : null}
                      </TableCell>
                      <TableCell className="max-w-52 truncate text-sm">{row.projectName}</TableCell>
                      <TableCell className="text-sm">{row.trainerName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(row.assignedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.dueAt ? new Date(row.dueAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <DeadlineTimer dueAt={row.dueAt} completedAt={row.completedAt} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
