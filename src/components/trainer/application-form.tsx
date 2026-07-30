"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { submitApplication, type ActionState } from "@/server/actions/applications";
import { countWords, MIN_BACKGROUND_WORDS } from "@/lib/utils/word-count";
import { COUNTRIES } from "@/lib/constants/countries";
import { SCREENER_QUESTIONS } from "@/lib/constants/screener";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { status: "idle" };

export const DOMAINS = [
  "Software engineering",
  "Mathematics",
  "Medicine",
  "Law",
  "Finance",
  "Science",
  "Engineering",
  "Linguistics",
  "Education",
  "Writing",
  "Research",
] as const;

export function ApplicationForm({
  defaults,
}: {
  defaults: { domain?: string; headline?: string; country?: string; hoursPerWeek?: number };
}) {
  const [state, formAction, pending] = useActionState(submitApplication, initialState);
  const [headline, setHeadline] = useState(defaults.headline ?? "");
  const wordCount = countWords(headline);
  const wordCountMet = wordCount >= MIN_BACKGROUND_WORDS;

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <p className="text-lg font-semibold">Application submitted</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Your application is under consideration. Our team reviews every application individually
          and will get back to you shortly — we&apos;ve emailed you a confirmation.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-border bg-card p-6">
      <div className="space-y-1.5">
        <Label htmlFor="domain">Primary area of expertise</Label>
        <select
          id="domain"
          name="domain"
          defaultValue={defaults.domain ?? ""}
          required
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <option value="" disabled>
            Select a domain
          </option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          This determines which qualification assessment you&apos;ll take.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="headline">Your background</Label>
        <Textarea
          id="headline"
          name="headline"
          rows={4}
          required
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Senior backend engineer, 8 years in distributed systems. MSc Computer Science."
        />
        <p className={`text-xs ${wordCountMet ? "text-muted-foreground" : "text-destructive"}`}>
          {wordCount} / {MIN_BACKGROUND_WORDS} words minimum — enough for a reviewer to actually judge
          your background from, not just a title.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="country">Country of residence</Label>
          <select
            id="country"
            name="country"
            defaultValue={defaults.country ?? ""}
            required
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <option value="" disabled>
              Select a country
            </option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hoursPerWeek">Available hours per week</Label>
          <Input
            id="hoursPerWeek"
            name="hoursPerWeek"
            type="number"
            min={1}
            max={60}
            required
            defaultValue={defaults.hoursPerWeek ?? 10}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div>
          <p className="text-sm font-medium">Quick judgment check</p>
          <p className="text-xs text-muted-foreground">
            Two short questions about how you&apos;d approach evaluation work. There are no trick
            questions — answer as you actually would.
          </p>
        </div>
        {SCREENER_QUESTIONS.map((q, index) => (
          <fieldset key={q.id} className="space-y-2">
            <legend className="text-sm">
              {index + 1}. {q.prompt}
            </legend>
            {q.options.map((option) => (
              <label key={option} className="flex items-start gap-2 text-sm">
                <input type="radio" name={q.id} value={option} required className="mt-1" />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>

      {state.status === "error" && state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <Button type="submit" variant="violet" disabled={pending}>
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
