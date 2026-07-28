import { WorldMapAVariant, type AVariant } from "@/components/shared/world-map-a-variants";

const OPTIONS: { id: AVariant; name: string }[] = [
  { id: 1, name: "Crisper fill + glowing coastline edge" },
  { id: 2, name: "Finer, denser dot texture" },
  { id: 3, name: "Gradient depth fill (lit edge fading down)" },
  { id: 4, name: "Dual-tone dots (sparkle/depth)" },
  { id: 5, name: "Warmer indigo tint + city glow" },
];

export default function MapAPreviewPage() {
  return (
    <div className="space-y-10 bg-background p-8">
      {OPTIONS.map((opt) => (
        <div key={opt.id} className="relative h-[420px] overflow-hidden rounded-2xl border border-border bg-navy">
          <WorldMapAVariant variant={opt.id} />
          <div className="absolute left-6 top-6 rounded-md bg-black/50 px-3 py-1.5 text-sm font-semibold text-white">
            A{opt.id}: {opt.name}
          </div>
        </div>
      ))}
    </div>
  );
}
