import { platformStats } from "@/lib/mock-data";

export function StatsBand() {
  return (
    <section
      aria-label="Platform scale"
      className="mx-auto w-full max-w-content px-4 sm:px-6"
    >
      <dl className="grid grid-cols-2 gap-y-8 rounded-lg border border-border bg-muted/50 px-6 py-10 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-border">
        {platformStats.map((stat) => (
          <div key={stat.id} className="px-4 text-center">
            <dt className="sr-only">{stat.label}</dt>
            <dd>
              <span className="block text-3xl font-bold tracking-tight text-secondary sm:text-4xl">
                {stat.value}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {stat.label}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
