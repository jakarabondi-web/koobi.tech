import Link from "next/link";
import { Hexagon } from "lucide-react";

import { WorldMap } from "@/components/marketing/world-map";
import { Button } from "@/components/ui/button";
import { disciplines } from "@/lib/mock-data";

export function GlobalNetwork() {
  return (
    <section
      id="network"
      aria-labelledby="network-title"
      className="mx-auto w-full max-w-content scroll-mt-20 px-4 pb-20 sm:px-6"
    >
      <div className="overflow-hidden rounded-lg bg-forest px-6 py-12 text-white shadow-lg sm:px-10">
        <div className="text-center">
          <h2
            id="network-title"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            A global network of exceptional experts
          </h2>
          <p className="mt-3 text-sm text-emerald-100/80">
            Verified professionals across every domain and every continent.
          </p>
        </div>

        <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1fr_280px]">
          <WorldMap />

          <div>
            <ul className="space-y-2">
              {disciplines.map((discipline) => (
                <li
                  key={discipline.id}
                  className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm"
                >
                  <Hexagon className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  {discipline.label}
                </li>
              ))}
            </ul>

            <Link href="#contact" className="mt-6 block">
              <Button variant="inverted" className="w-full">
                Explore expert network
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
