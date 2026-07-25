import { cn } from "@/lib/utils/cn";

export function MarketingPageHero({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-border bg-surface py-16", className)}>
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        {description ? <p className="mt-4 text-lg text-muted-foreground">{description}</p> : null}
      </div>
    </section>
  );
}
