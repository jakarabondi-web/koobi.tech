"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2, RotateCcw } from "lucide-react";

import { saveRubric, type ActionState } from "@/server/actions/rubrics";
import { RUBRIC_PRESETS, type Criterion } from "@/lib/tasks/rubric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { status: "idle" };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);

export function RubricEditor({
  projectId,
  initialName,
  initialCriteria,
  currentVersion,
}: {
  projectId: string;
  initialName: string;
  initialCriteria: Criterion[];
  currentVersion: number | null;
}) {
  const [state, formAction, pending] = useActionState(saveRubric, initialState);
  const [name, setName] = useState(initialName);
  const [criteria, setCriteria] = useState<Criterion[]>(initialCriteria);

  const update = (i: number, patch: Partial<Criterion>) =>
    setCriteria((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const add = () =>
    setCriteria((cs) => [...cs, { key: `criterion_${cs.length + 1}`, label: "", description: "", weight: 1 }]);

  const remove = (i: number) => setCriteria((cs) => cs.filter((_, idx) => idx !== i));

  const applyPreset = (k: string) => {
    const p = RUBRIC_PRESETS[k];
    setName(p.name);
    setCriteria(p.criteria.map((c) => ({ ...c })));
  };

  const duplicateKeys = criteria
    .map((c) => c.key)
    .filter((k, i, arr) => arr.indexOf(k) !== i);
  const invalid =
    criteria.length === 0 ||
    criteria.some((c) => !c.label.trim() || !/^[a-z0-9_]+$/.test(c.key)) ||
    duplicateKeys.length > 0;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="criteria" value={JSON.stringify(criteria)} />

      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Saving creates <span className="font-medium text-foreground">version {(currentVersion ?? 0) + 1}</span>.
        Scores already recorded stay attached to the version they were given against, so past
        quality figures don&apos;t shift under you.
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rubric-name">Rubric name</Label>
        <Input id="rubric-name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <p className="mb-2 text-xs text-muted-foreground">Start from a preset:</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(RUBRIC_PRESETS).map(([k, p]) => (
            <button key={k} type="button" onClick={() => applyPreset(k)}
              className="rounded-md border border-border px-2.5 py-1 text-xs transition-colors hover:border-primary hover:bg-accent">
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {criteria.map((c, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`label-${i}`} className="text-xs">Label shown to reviewers</Label>
                    <Input id={`label-${i}`} value={c.label}
                      onChange={(e) => {
                        const label = e.target.value;
                        // Key follows the label until someone edits it directly.
                        update(i, { label, key: slug(label) || c.key });
                      }}
                      placeholder="e.g. Factual accuracy" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`weight-${i}`} className="text-xs">Weight</Label>
                    <Input id={`weight-${i}`} type="number" min={0.1} max={5} step={0.5} value={c.weight}
                      onChange={(e) => update(i, { weight: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`desc-${i}`} className="text-xs">
                    Guidance — this is what reviewers read when deciding a score
                  </Label>
                  <Textarea id={`desc-${i}`} rows={2} value={c.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                    placeholder="Be specific about what a 5 looks like versus a 2." />
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">key: {c.key}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}
                disabled={criteria.length === 1} aria-label={`Remove ${c.label || "criterion"}`}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={criteria.length >= 12}>
          <Plus className="size-4" /> Add criterion
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setCriteria(initialCriteria)}>
          <RotateCcw className="size-4" /> Reset
        </Button>
        {criteria.length >= 12 ? (
          <span className="text-xs text-muted-foreground">
            Twelve is the limit — beyond that reviewers stop discriminating between criteria.
          </span>
        ) : null}
      </div>

      {duplicateKeys.length > 0 ? (
        <p className="text-sm text-destructive">Duplicate keys: {[...new Set(duplicateKeys)].join(", ")}</p>
      ) : null}
      {state.message ? (
        <p className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-success"}>
          {state.message}
        </p>
      ) : null}

      <Button type="submit" variant="violet" disabled={pending || invalid}>
        {pending ? "Saving…" : `Save as version ${(currentVersion ?? 0) + 1}`}
      </Button>
    </form>
  );
}
