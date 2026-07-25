"use client";

import { useActionState } from "react";
import { Download } from "lucide-react";

import { requestExport, type ActionState } from "@/server/actions/exports";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { status: "idle" };

export function RequestExportForm({ datasetId }: { datasetId: string }) {
  const [state, formAction, pending] = useActionState(requestExport, initialState);

  return (
    <form action={formAction} className="flex items-center justify-end gap-2">
      <input type="hidden" name="datasetId" value={datasetId} />
      <select name="format" defaultValue="jsonl"
        className="h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none">
        <option value="jsonl">JSONL</option>
        <option value="csv">CSV</option>
        <option value="parquet">Parquet</option>
      </select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        <Download className="size-4" /> {pending ? "Queuing…" : "Export"}
      </Button>
      {state.status === "success" ? <span className="text-xs text-success">Queued</span> : null}
      {state.status === "error" ? <span className="text-xs text-destructive">{state.message}</span> : null}
    </form>
  );
}
