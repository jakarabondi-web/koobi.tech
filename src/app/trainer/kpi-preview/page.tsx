import { Briefcase, CheckCircle2, DollarSign, Gauge } from "lucide-react";

import { KpiOptionA, KpiOptionB, KpiOptionC, type KpiPreviewItem } from "@/components/shared/kpi-card-options";

const ITEMS: KpiPreviewItem[] = [
  { label: "Active projects", value: "4", icon: <Briefcase className="size-4.5" /> },
  { label: "Tasks completed", value: "128", icon: <CheckCircle2 className="size-4.5" /> },
  { label: "Pending earnings", value: "$1,240.00", icon: <DollarSign className="size-4.5" />, trend: "up", trendLabel: "+$180 this week" },
  { label: "Quality score", value: "94%", icon: <Gauge className="size-4.5" /> },
];

export default function KpiPreviewPage() {
  return (
    <div className="space-y-16 bg-surface p-8">
      <div>
        <p className="mb-4 text-sm font-semibold text-muted-foreground">Option A — Dark navy glass tiles (each card its own navy cell)</p>
        <KpiOptionA items={ITEMS} />
      </div>
      <div>
        <p className="mb-4 text-sm font-semibold text-muted-foreground">Option B — Dark navy band (one container, cards as glass cells inside)</p>
        <KpiOptionB items={ITEMS} />
      </div>
      <div>
        <p className="mb-4 text-sm font-semibold text-muted-foreground">Option C — Light cards, navy icon chip (subtler, for dense data screens)</p>
        <KpiOptionC items={ITEMS} />
      </div>
    </div>
  );
}
