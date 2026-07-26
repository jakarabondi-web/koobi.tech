import { Badge } from "@/components/ui/badge";

/**
 * Maps common platform status strings to a consistent semantic color.
 * Extend the map rather than inlining status colors at call sites.
 */
const STATUS_MAP: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline"> = {
  draft: "secondary",
  submitted: "info",
  under_review: "info",
  in_review: "info",
  pending: "secondary",
  pending_review: "secondary",
  requested: "info",
  sent: "info",
  overdue: "destructive",
  void: "outline",
  approved: "success",
  active: "success",
  paid: "success",
  passed: "success",
  scheduled: "info",
  processing: "info",
  additional_info_required: "warning",
  waitlisted: "warning",
  disputed: "warning",
  revision_requested: "warning",
  escalated: "warning",
  rejected: "destructive",
  failed: "destructive",
  suspended: "destructive",
  reversed: "destructive",
  closed: "outline",
  archived: "outline",
  expired: "outline",
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const variant = STATUS_MAP[key] ?? "outline";
  const label = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge variant={variant}>{label}</Badge>;
}
