import { Card } from "@/components/ui/card";
import {
  DataBuilderIllustration,
  EvaluationIllustration,
  ImprovementLoopIllustration,
} from "@/components/marketing/feature-illustrations";
import { capabilities } from "@/lib/mock-data";

const ILLUSTRATIONS = {
  build: DataBuilderIllustration,
  evaluate: EvaluationIllustration,
  improve: ImprovementLoopIllustration,
} as const;

export function Features() {
  return (
    <section
      id="platform"
      aria-labelledby="features-title"
      className="mx-auto w-full max-w-content scroll-mt-20 px-4 py-20 sm:px-6"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="features-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
          Human intelligence, structured for AI development
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          From training data to production evaluation, we provide the experts,
          workflows, and quality controls you need to build better models.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {capabilities.map((capability) => {
          const Illustration =
            ILLUSTRATIONS[capability.id as keyof typeof ILLUSTRATIONS];

          return (
            <Card key={capability.id} className="bg-muted/40 p-6">
              <h3 className="text-lg font-bold tracking-tight">{capability.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {capability.description}
              </p>
              <div className="mt-8">
                <Illustration />
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
