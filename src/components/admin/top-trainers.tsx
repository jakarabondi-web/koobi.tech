import { Panel } from "@/components/dashboard/panel";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TrainerLeaderboardRow } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export function TopTrainers({ trainers }: { trainers: TrainerLeaderboardRow[] }) {
  return (
    <Panel
      title="Top Performing Trainers"
      footerLink={{ label: "View leaderboard", href: "/admin/trainers" }}
    >
      <Table>
        <caption className="sr-only">
          Trainers ranked by quality score, with tasks completed and approval rate.
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Trainer</TableHead>
            <TableHead scope="col" className="text-right">
              Quality Score
            </TableHead>
            <TableHead scope="col" className="text-right">
              Tasks Completed
            </TableHead>
            <TableHead scope="col" className="text-right">
              Approval Rate
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trainers.map((trainer) => (
            <TableRow key={trainer.id}>
              <TableCell>
                <span className="flex items-center gap-3">
                  <Avatar name={trainer.name} size="sm" />
                  <span className="font-medium">{trainer.name}</span>
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {trainer.qualityScore.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(trainer.tasksCompleted)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {trainer.approvalRate}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}
