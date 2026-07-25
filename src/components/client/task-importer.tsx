"use client";

import { useActionState, useRef, useState } from "react";
import { Upload, FileWarning, CheckCircle2, ArrowLeft, Copy } from "lucide-react";

import {
  previewTaskImport,
  commitTaskImport,
  type ImportState,
} from "@/server/actions/task-import";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const initialState: ImportState = { status: "idle" };

export function TaskImporter({
  projectId,
  taskType,
  requiredFields,
  sampleJsonl,
  sampleCsv,
}: {
  projectId: string;
  taskType: string;
  requiredFields: string[];
  sampleJsonl: string;
  sampleCsv: string;
}) {
  const [previewState, previewAction, previewing] = useActionState(previewTaskImport, initialState);
  const [commitState, commitAction, committing] = useActionState(commitTaskImport, initialState);
  const [format, setFormat] = useState<"jsonl" | "csv">("jsonl");
  const [content, setContent] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormat(file.name.endsWith(".csv") ? "csv" : "jsonl");
    setContent(await file.text());
  }

  // Import succeeded — show what landed rather than dropping the user back
  // into an empty form.
  if (commitState.status === "imported" && commitState.result) {
    const r = commitState.result;
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-10 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <p className="text-lg font-semibold">
          Imported {r.created.toLocaleString()} task{r.created === 1 ? "" : "s"}
        </p>
        <p className="text-sm text-muted-foreground">
          {r.goldCreated > 0 ? `${r.goldCreated} seeded as gold tasks. ` : ""}
          {r.skipped > 0 ? `${r.skipped} skipped — already imported previously.` : ""}
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>Import more</Button>
      </div>
    );
  }

  const preview = previewState.preview;

  // Step 2 — confirm what will be written.
  if (previewState.status === "previewed" && preview) {
    const blocked = preview.validRows === 0;
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["Rows in file", preview.totalRows],
            ["Will import", preview.validRows],
            ["Gold tasks", preview.goldRows],
            ["Errors", preview.errors.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold tabular-nums">{Number(value).toLocaleString()}</p>
            </div>
          ))}
        </div>

        {preview.alreadyImported.length > 0 ? (
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium">
              {preview.alreadyImported.length} row{preview.alreadyImported.length === 1 ? "" : "s"} already imported
            </p>
            <p className="text-muted-foreground">
              Matched by <code className="font-mono text-xs">external_ref</code> and skipped, so
              re-running the same file won&apos;t duplicate work.
            </p>
          </div>
        ) : null}

        {preview.duplicateRefsInFile.length > 0 ? (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
            <p className="font-medium">Repeated refs within the file</p>
            <p className="text-muted-foreground">
              {preview.duplicateRefsInFile.slice(0, 5).join(", ")}
              {preview.duplicateRefsInFile.length > 5 ? "…" : ""} — only the first occurrence is kept.
            </p>
          </div>
        ) : null}

        {preview.errors.length > 0 ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <FileWarning className="size-4 text-destructive" />
              {preview.errors.length} row{preview.errors.length === 1 ? "" : "s"}{" "}
              won&apos;t be imported
            </p>
            <div className="mt-2 max-h-44 overflow-y-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Line</TableHead><TableHead>Problem</TableHead></TableRow></TableHeader>
                <TableBody>
                  {preview.errors.slice(0, 50).map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{e.line}</TableCell>
                      <TableCell className="text-sm">{e.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Valid rows still import — fix these and re-run the file to add the rest.
            </p>
          </div>
        ) : null}

        {preview.sample.length > 0 ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium">Preview of what trainers will see</p>
            <div className="mt-2 space-y-2">
              {preview.sample.map((t) => (
                <div key={t.line} className="rounded-md bg-muted/50 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">line {t.line}</span>
                    {t.isGold ? <Badge variant="info">Gold</Badge> : null}
                    {t.externalRef ? (
                      <span className="font-mono text-[11px] text-muted-foreground">{t.externalRef}</span>
                    ) : null}
                  </div>
                  <pre className="overflow-x-auto text-[11px] text-muted-foreground">
                    {JSON.stringify(t.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {commitState.status === "error" && commitState.message ? (
          <p className="text-sm text-destructive">{commitState.message}</p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <ArrowLeft className="size-4" /> Start over
          </Button>
          <form action={commitAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="format" value={previewState.format ?? format} />
            <input type="hidden" name="content" value={previewState.content ?? ""} />
            <Button type="submit" variant="violet" disabled={committing || blocked}>
              {committing
                ? "Importing…"
                : `Import ${preview.validRows.toLocaleString()} task${preview.validRows === 1 ? "" : "s"}`}
            </Button>
          </form>
        </div>

        {blocked ? (
          <p className="text-right text-xs text-destructive">
            Nothing to import — every row failed validation.
          </p>
        ) : null}
      </div>
    );
  }

  // Step 1 — supply the data.
  return (
    <form action={previewAction} className="space-y-5">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="format" value={format} />

      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium">
          This project uses <span className="font-mono text-xs">{taskType.replace(/_/g, " ").toLowerCase()}</span>
        </p>
        <p className="mt-1 text-muted-foreground">
          Every row needs: {requiredFields.map((f) => (
            <code key={f} className="mx-0.5 rounded bg-background px-1 py-0.5 font-mono text-xs">{f}</code>
          ))}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Optional: <code className="font-mono">external_ref</code> (makes re-imports idempotent),{" "}
          <code className="font-mono">is_gold</code> + <code className="font-mono">expected_answer</code>{" "}
          to seed a benchmark task. Any other column is carried through as metadata.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-sm">Format</Label>
        {(["jsonl", "csv"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFormat(f)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              format === f ? "border-primary bg-accent" : "border-border hover:border-primary"
            }`}>
            {f.toUpperCase()}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".jsonl,.json,.csv,.txt" onChange={onFile} className="hidden" />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Choose file
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="import-content">Data</Label>
        <Textarea
          id="import-content"
          name="content"
          rows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={format === "csv" ? sampleCsv : sampleJsonl}
          className="font-mono text-xs"
        />
        <button
          type="button"
          onClick={() => setContent(format === "csv" ? sampleCsv : sampleJsonl)}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <Copy className="size-3" /> Fill with a sample row
        </button>
      </div>

      {previewState.status === "error" && previewState.message ? (
        <p className="text-sm text-destructive">{previewState.message}</p>
      ) : null}

      <Button type="submit" variant="violet" disabled={previewing || content.trim() === ""}>
        {previewing ? "Validating…" : "Validate and preview"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Nothing is written until you confirm the preview.
      </p>
    </form>
  );
}
