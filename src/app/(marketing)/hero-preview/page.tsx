import {
  HeroBgFullMesh,
  HeroBgCircuit,
  HeroBgConstellation,
  HeroBgDataStream,
  HeroBgHexGrid,
} from "@/components/marketing/hero-bg-options";

const OPTIONS = [
  { id: 1, name: "Full Mesh", Bg: HeroBgFullMesh },
  { id: 2, name: "Circuit Grid", Bg: HeroBgCircuit },
  { id: 3, name: "Constellation Pulse", Bg: HeroBgConstellation },
  { id: 4, name: "Data Stream", Bg: HeroBgDataStream },
  { id: 5, name: "Hex Grid", Bg: HeroBgHexGrid },
];

export default function HeroPreviewPage() {
  return (
    <div className="space-y-10 bg-background p-8">
      {OPTIONS.map(({ id, name, Bg }) => (
        <div key={id} className="relative h-[420px] overflow-hidden rounded-2xl border border-border bg-navy">
          <Bg />
          <div className="absolute left-6 top-6 rounded-md bg-black/50 px-3 py-1.5 text-sm font-semibold text-white">
            Option {id}: {name}
          </div>
          <div className="relative z-10 flex h-full items-center justify-center">
            <h1 className="max-w-xl text-center text-4xl font-bold text-white">
              Train better AI with verified human expertise.
            </h1>
          </div>
        </div>
      ))}
    </div>
  );
}
