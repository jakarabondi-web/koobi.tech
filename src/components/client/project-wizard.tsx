"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";

import { createProject, type ActionState } from "@/server/actions/client-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";

const initialState: ActionState = { status: "idle" };

const DOMAINS = [
  "General assistant", "Software engineering", "Mathematics", "Medicine", "Law",
  "Finance", "Science", "Engineering", "Linguistics", "Education", "Writing", "Research",
];

const TASK_TYPES: Array<{ value: string; label: string; hint: string }> = [
  { value: "PAIRWISE_COMPARISON", label: "Pairwise comparison", hint: "Experts pick the better of two responses — the standard RLHF signal." },
  { value: "SINGLE_RESPONSE_EVALUATION", label: "Single-response evaluation", hint: "Score one response against your rubric." },
  { value: "MULTI_RESPONSE_RANKING", label: "Multi-response ranking", hint: "Order 3+ responses best to worst." },
  { value: "PROMPT_WRITING", label: "Prompt writing", hint: "Experts author new prompts in their domain." },
  { value: "IDEAL_RESPONSE_WRITING", label: "Ideal-response writing", hint: "Write the gold answer for SFT data." },
  { value: "FACT_CHECKING", label: "Fact-checking", hint: "Verify claims against sources." },
  { value: "SAFETY_CLASSIFICATION", label: "Safety classification", hint: "Label content against your safety policy." },
  { value: "HALLUCINATION_DETECTION", label: "Hallucination detection", hint: "Flag fabricated facts and citations." },
  { value: "CODE_REVIEW", label: "Code review", hint: "Review generated code for correctness." },
  { value: "MULTI_TURN_EVALUATION", label: "Multi-turn evaluation", hint: "Judge whole conversations, not single turns." },
];

const TEMPLATES = [
  { name: "Pairwise model comparison", taskType: "PAIRWISE_COMPARISON", domain: "General assistant",
    description: "Compare two assistant responses and select the one that better serves the user, with written justification.",
    instructions: "Read the prompt, then choose the response that better serves the user. Judge on accuracy and usefulness — not length or confident tone. Explain your reasoning specifically." },
  { name: "Safety evaluation", taskType: "SAFETY_CLASSIFICATION", domain: "General assistant",
    description: "Classify model responses against our safety policy and flag violations with severity.",
    instructions: "Label each response against the policy categories provided. When a response is borderline, choose the more cautious label and explain why in your justification." },
  { name: "Factuality review", taskType: "FACT_CHECKING", domain: "Research",
    description: "Verify factual claims in model output against reliable sources and flag unsupported statements.",
    instructions: "Check each factual claim independently. Mark claims as supported, unsupported, or unverifiable, and cite the source you used." },
  { name: "Code response evaluation", taskType: "CODE_REVIEW", domain: "Software engineering",
    description: "Review generated code for correctness, security, and idiomatic style.",
    instructions: "Judge correctness first — does the code do what was asked, and does it handle edge cases? Then assess security and readability. Note any bug you find explicitly." },
];

const STEPS = ["Objective", "Task type", "Instructions", "Workforce", "Budget & quality", "Review"];

export function ProjectWizard() {
  const [state, formAction, pending] = useActionState(createProject, initialState);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", description: "", domain: DOMAINS[0], taskType: "PAIRWISE_COMPARISON",
    instructions: "", languages: "en", payPerTaskCents: 180, positionsAvailable: 10,
    estimatedHoursPerWeek: 10, budgetCents: 500000, qualityThreshold: 0.85,
    securityLevel: "standard", containsSensitiveContent: false,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    setForm((f) => ({ ...f, name: t.name, description: t.description, domain: t.domain,
      taskType: t.taskType, instructions: t.instructions }));
    setStep(1);
  };

  // Each step gates on the fields the server will validate, so the user
  // hits errors inline rather than at submit.
  const stepValid = [
    form.name.trim().length >= 3 && form.description.trim().length >= 20,
    Boolean(form.taskType),
    form.instructions.trim().length >= 20,
    form.positionsAvailable >= 1 && form.languages.trim().length > 0,
    form.payPerTaskCents >= 25 && form.budgetCents >= 1000,
    true,
  ][step];

  const selectedType = TASK_TYPES.find((t) => t.value === form.taskType);

  return (
    <form action={formAction} className="space-y-6">
      {/* Everything lives in hidden inputs so the whole wizard posts at once. */}
      {Object.entries(form).map(([k, v]) =>
        k === "containsSensitiveContent" ? null : (
          <input key={k} type="hidden" name={k} value={String(v)} />
        )
      )}
      {form.containsSensitiveContent ? (
        <input type="hidden" name="containsSensitiveContent" value="on" />
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{STEPS[step]}</span>
          <span className="text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        {step === 0 ? (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium">Start from a template</p>
              <p className="text-xs text-muted-foreground">Or skip and define your own below.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {TEMPLATES.map((t) => (
                  <button key={t.name} type="button" onClick={() => applyTemplate(t)}
                    className="rounded-lg border border-border p-3 text-left text-sm transition-colors hover:border-primary hover:bg-accent">
                    <p className="font-medium">{t.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-name">Project name</Label>
              <Input id="w-name" value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Assistant response preference ranking — v5" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-desc">What are you trying to achieve?</Label>
              <Textarea id="w-desc" rows={4} value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe the model, the behaviour you want to improve, and what good output looks like." />
              <p className="text-xs text-muted-foreground">{form.description.trim().length} / 20 characters minimum</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-domain">Domain</Label>
              <select id="w-domain" value={form.domain} onChange={(e) => set("domain", e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30">
                {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">What should experts do?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {TASK_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => set("taskType", t.value)}
                  className={cn("rounded-lg border p-3 text-left transition-colors",
                    form.taskType === t.value ? "border-primary bg-accent" : "border-border hover:border-primary")}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{t.label}</p>
                    {form.taskType === t.value ? <Check className="size-4 shrink-0 text-primary" /> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.hint}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="w-inst">Instructions for experts</Label>
              <Textarea id="w-inst" rows={8} value={form.instructions}
                onChange={(e) => set("instructions", e.target.value)}
                placeholder="Be specific about what counts as a good answer, and what to do in ambiguous cases." />
              <p className="text-xs text-muted-foreground">
                Ambiguous instructions are the most common cause of low inter-annotator agreement — be
                explicit about edge cases.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-langs">Languages (comma separated)</Label>
              <Input id="w-langs" value={form.languages} onChange={(e) => set("languages", e.target.value)} placeholder="en, es, fr" />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="w-pos">Experts needed</Label>
                <Input id="w-pos" type="number" min={1} max={500} value={form.positionsAvailable}
                  onChange={(e) => set("positionsAvailable", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-hours">Expected hours per expert / week</Label>
                <Input id="w-hours" type="number" min={1} max={40} value={form.estimatedHoursPerWeek}
                  onChange={(e) => set("estimatedHoursPerWeek", Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-sec">Security level</Label>
              <select id="w-sec" value={form.securityLevel} onChange={(e) => set("securityLevel", e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30">
                <option value="standard">Standard</option>
                <option value="elevated">Elevated — extra vetting</option>
                <option value="restricted">Restricted — named experts only</option>
              </select>
            </div>
            <Label className="flex items-start gap-2.5 rounded-lg border border-border p-3 text-sm font-normal">
              <Checkbox checked={form.containsSensitiveContent} className="mt-0.5"
                onCheckedChange={(v) => set("containsSensitiveContent", v === true)} />
              <span>
                This project contains sensitive or distressing content
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Only experts who have opted in will be matched. This is required for safety and
                  red-teaming work.
                </span>
              </span>
            </Label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="w-pay">Pay per accepted task (cents)</Label>
                <Input id="w-pay" type="number" min={25} value={form.payPerTaskCents}
                  onChange={(e) => set("payPerTaskCents", Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">
                  ${(form.payPerTaskCents / 100).toFixed(2)} per task. Experts see this before accepting.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-budget">Total budget (cents)</Label>
                <Input id="w-budget" type="number" min={1000} value={form.budgetCents}
                  onChange={(e) => set("budgetCents", Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">
                  ≈ {Math.floor(form.budgetCents / Math.max(1, form.payPerTaskCents)).toLocaleString()} tasks at this rate.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-qt">Acceptance threshold</Label>
              <input id="w-qt" type="range" min={0.5} max={1} step={0.05} value={form.qualityThreshold}
                onChange={(e) => set("qualityThreshold", Number(e.target.value))}
                className="w-full accent-[var(--primary)]" />
              <p className="text-xs text-muted-foreground">
                Submissions below {Math.round(form.qualityThreshold * 100)}% quality are sent back for
                revision rather than delivered.
              </p>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <p className="text-sm font-medium">Review before launching</p>
            <dl className="space-y-2 text-sm">
              {[
                ["Name", form.name],
                ["Domain", form.domain],
                ["Task type", selectedType?.label ?? form.taskType],
                ["Languages", form.languages],
                ["Experts", String(form.positionsAvailable)],
                ["Pay per task", `$${(form.payPerTaskCents / 100).toFixed(2)}`],
                ["Budget", `$${(form.budgetCents / 100).toFixed(2)}`],
                ["Quality threshold", `${Math.round(form.qualityThreshold * 100)}%`],
                ["Security", form.securityLevel],
                ["Sensitive content", form.containsSensitiveContent ? "Yes" : "No"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="max-w-[60%] truncate text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {state.status === "error" && state.message ? (
              <p className="text-sm text-destructive">{state.message}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ArrowLeft className="size-4" /> Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button type="button" variant="violet" disabled={!stepValid} onClick={() => setStep((s) => s + 1)}>
            Continue <ArrowRight className="size-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button type="submit" name="saveAsDraft" value="true" variant="outline" disabled={pending}>
              <Save className="size-4" /> Save as draft
            </Button>
            <Button type="submit" variant="violet" disabled={pending}>
              {pending ? "Creating…" : "Launch project"}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
