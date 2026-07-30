"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangle, Send } from "lucide-react";

import { submitCustomTask, type ActionState } from "@/server/actions/tasks";
import type { CustomResponseField, CustomTaskSchema } from "@/lib/tasks/custom-schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

const initialState: ActionState = { status: "idle" };

/**
 * Schema-driven workspace for CUSTOM projects: renders whatever input fields
 * the client's template names from the task payload, and collects whatever
 * response fields it defines. The server action re-validates everything —
 * this component is presentation, not enforcement.
 */
export function CustomWorkspace({
  taskId,
  schema,
  payload,
  readOnly,
  existing,
}: {
  taskId: string;
  schema: CustomTaskSchema;
  payload: Record<string, unknown>;
  readOnly: boolean;
  existing?: Record<string, unknown>;
}) {
  const [state, formAction, pending] = useActionState(submitCustomTask, initialState);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const field of schema.responseFields) {
      const prior = existing?.[field.key];
      base[field.key] = prior === undefined || prior === null ? "" : String(prior);
    }
    if (typeof window === "undefined" || readOnly || existing) return base;
    try {
      const raw = window.localStorage.getItem(`traivr:draft:${taskId}`);
      if (!raw) return base;
      const saved = JSON.parse(raw) as Record<string, string>;
      for (const key of Object.keys(base)) {
        if (typeof saved[key] === "string") base[key] = saved[key];
      }
      return base;
    } catch {
      return base;
    }
  });

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (readOnly) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [readOnly]);

  useEffect(() => {
    if (readOnly) return;
    const t = setTimeout(() => {
      localStorage.setItem(`traivr:draft:${taskId}`, JSON.stringify(values));
    }, 800);
    return () => clearTimeout(t);
  }, [taskId, values, readOnly]);

  useEffect(() => {
    if (state.status === "success") localStorage.removeItem(`traivr:draft:${taskId}`);
  }, [state.status, taskId]);

  const setValue = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const incomplete = schema.responseFields.some((f) => {
    // An unchecked boolean is a valid "no", never a blocker.
    if (!f.required || f.kind === "boolean") return false;
    const v = values[f.key]?.trim() ?? "";
    if (v === "") return true;
    if ((f.kind === "text" || f.kind === "textarea") && f.minLength) return v.length < f.minLength;
    return false;
  });

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-3">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="durationSeconds" value={elapsed} />

      <div className="space-y-4 lg:col-span-2">
        {schema.inputFields.map((field) => (
          <div key={field.key} className="rounded-xl border border-border bg-card p-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {field.label}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
              {formatPayloadValue(payload[field.key])}
            </p>
          </div>
        ))}

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium">Your response</p>
          <div className="mt-4 space-y-5">
            {schema.responseFields.map((field) => (
              <ResponseControl
                key={field.key}
                field={field}
                value={values[field.key] ?? ""}
                readOnly={readOnly}
                onChange={(v) => setValue(field.key, v)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="sticky top-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Time on task</span>
              <span className="font-mono tabular-nums">{mins}:{secs}</span>
            </div>
          </div>

          {!readOnly ? (
            <div className="space-y-2">
              {incomplete ? (
                <p className="flex items-start gap-1.5 text-xs text-warning-foreground">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  Complete every required field before submitting.
                </p>
              ) : null}
              {state.status === "error" && state.message ? (
                <p className="text-xs text-destructive">{state.message}</p>
              ) : null}
              {state.status === "success" && state.message ? (
                <p className="text-xs text-success">{state.message}</p>
              ) : null}
              <Button type="submit" variant="violet" className="w-full" disabled={pending || incomplete}>
                <Send className="size-4" />
                {pending ? "Submitting…" : "Submit task"}
              </Button>
            </div>
          ) : (
            <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              This task has been submitted and is read-only.
            </p>
          )}
        </div>
      </div>
    </form>
  );
}

/** Objects and arrays in a payload render as pretty JSON, scalars as text. */
function formatPayloadValue(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function ResponseControl({
  field,
  value,
  readOnly,
  onChange,
}: {
  field: CustomResponseField;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  const id = `field_${field.key}`;

  return (
    <div>
      <Label htmlFor={id}>
        {field.label}
        {!field.required ? <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span> : null}
      </Label>

      {field.kind === "text" ? (
        <>
          <Input
            id={id}
            name={id}
            className="mt-2"
            disabled={readOnly}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.minLength ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {value.trim().length} characters — at least {field.minLength} required.
            </p>
          ) : null}
        </>
      ) : null}

      {field.kind === "textarea" ? (
        <>
          <Textarea
            id={id}
            name={id}
            rows={4}
            className="mt-2"
            disabled={readOnly}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.minLength ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {value.trim().length} characters — at least {field.minLength} required.
            </p>
          ) : null}
        </>
      ) : null}

      {field.kind === "select" ? (
        <select
          id={id}
          name={id}
          disabled={readOnly}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">Choose…</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : null}

      {field.kind === "rating" ? (
        <div className="mt-2 flex gap-1">
          <input type="hidden" name={id} value={value} />
          {Array.from({ length: field.max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              disabled={readOnly}
              onClick={() => onChange(String(n))}
              aria-pressed={value === String(n)}
              className={cn(
                "flex size-8 items-center justify-center rounded-md border text-sm transition-colors",
                value === String(n)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input hover:border-primary"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      ) : null}

      {field.kind === "boolean" ? (
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name={id}
            value="true"
            disabled={readOnly}
            checked={value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "")}
            className="size-4 rounded border-input accent-primary"
          />
          Yes
        </label>
      ) : null}
    </div>
  );
}
