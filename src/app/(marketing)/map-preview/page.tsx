import { WorldMapPreview } from "@/components/shared/world-map-options";

const OPTIONS = [
  { id: "A", name: "Filled continents + dot texture", style: "filled-dots" as const },
  { id: "B", name: "Glowing outline only", style: "outline" as const },
  { id: "C", name: "Glassy frosted fill", style: "glassy-fill" as const },
  { id: "D", name: "Hybrid: faint fill + crisp outline", style: "hybrid" as const },
];

export default function MapPreviewPage() {
  return (
    <div className="space-y-10 bg-background p-8">
      {OPTIONS.map((opt) => (
        <div key={opt.id} className="relative h-[420px] overflow-hidden rounded-2xl border border-border bg-navy">
          <WorldMapPreview style={opt.style} />
          <div className="absolute left-6 top-6 rounded-md bg-black/50 px-3 py-1.5 text-sm font-semibold text-white">
            Option {opt.id}: {opt.name}
          </div>
        </div>
      ))}
    </div>
  );
}
