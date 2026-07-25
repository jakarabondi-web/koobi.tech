import { Hexagon } from "lucide-react";

import { trustedLogos } from "@/lib/mock-data";

export function LogoCloud() {
  return (
    <section
      aria-labelledby="logo-cloud-title"
      className="mx-auto w-full max-w-content px-4 py-12 sm:px-6"
    >
      <h2
        id="logo-cloud-title"
        className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
      >
        Trusted by innovative AI teams worldwide
      </h2>

      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
        {trustedLogos.map((name) => (
          <li
            key={name}
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            <Hexagon className="h-5 w-5" aria-hidden="true" />
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}
