import type { TaskType } from "@prisma/client";

/**
 * Parsing and validation for bulk task import.
 *
 * Import is the one place a client's raw data enters the platform, so this
 * is deliberately strict: every row is validated against the shape its task
 * type requires, and a file is never partially committed on the strength of
 * "most rows looked fine". Callers preview first, then commit.
 */

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export type RawRow = Record<string, unknown>;

export type ParsedTask = {
  /** 1-based line number in the source file, for error reporting. */
  line: number;
  /** Client-supplied stable id, used to make re-imports idempotent. */
  externalRef: string | null;
  payload: Record<string, unknown>;
  isGold: boolean;
  expectedAnswer: string | null;
};

export type RowError = { line: number; message: string };

export type ParseResult = {
  tasks: ParsedTask[];
  errors: RowError[];
  /** Rows skipped because an earlier row in the same file had the same ref. */
  duplicateRefs: string[];
};

/** Fields each task type needs on every row. */
const REQUIRED_FIELDS: Partial<Record<TaskType, string[]>> = {
  PAIRWISE_COMPARISON: ["prompt", "responseA", "responseB"],
  SINGLE_RESPONSE_EVALUATION: ["prompt", "response"],
  MULTI_RESPONSE_RANKING: ["prompt", "responses"],
  PROMPT_WRITING: ["topic"],
  IDEAL_RESPONSE_WRITING: ["prompt"],
  RUBRIC_SCORING: ["prompt", "response"],
  FACT_CHECKING: ["claim"],
  CITATION_VERIFICATION: ["claim", "citation"],
  SAFETY_CLASSIFICATION: ["content"],
  POLICY_CLASSIFICATION: ["content"],
  HALLUCINATION_DETECTION: ["prompt", "response"],
  CODE_REVIEW: ["code"],
  CODE_OUTPUT_EVALUATION: ["code", "output"],
  MULTI_TURN_EVALUATION: ["conversation"],
};

export function requiredFieldsFor(taskType: TaskType): string[] {
  return REQUIRED_FIELDS[taskType] ?? ["prompt"];
}

/**
 * Splits a CSV line honouring quoted fields and escaped quotes.
 * Written by hand rather than pulled in as a dependency because the format
 * we accept is narrow and this keeps the import path free of parser CVEs.
 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      out.push(field);
      field = "";
    } else field += ch;
  }

  out.push(field);
  return out;
}

function normalizeRow(row: RawRow, taskType: TaskType, line: number): ParsedTask | RowError {
  const required = requiredFieldsFor(taskType);

  const missing = required.filter((f) => {
    const v = row[f];
    return v === undefined || v === null || String(v).trim() === "";
  });
  if (missing.length > 0) {
    return { line, message: `Missing required field${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}` };
  }

  // Reserved keys are lifted out; everything else becomes task payload so
  // clients can carry their own metadata through to export.
  const { external_ref, externalRef, is_gold, isGold, expected_answer, expectedAnswer, ...rest } = row;

  const ref = (externalRef ?? external_ref) as string | undefined;
  const goldRaw = (isGold ?? is_gold) as unknown;
  const gold =
    goldRaw === true || goldRaw === "true" || goldRaw === "1" || goldRaw === 1 || goldRaw === "yes";
  const answer = (expectedAnswer ?? expected_answer) as string | undefined;

  // A gold task without a known-correct answer can't score anything, so it's
  // rejected rather than silently imported as a normal task.
  if (gold && (!answer || String(answer).trim() === "")) {
    return { line, message: "Row is marked gold but has no expected_answer" };
  }

  // Gold rows are matched back to their expected answer by external_ref
  // after bulk insert. Without one we'd have to drop the answer silently,
  // so the row is rejected instead.
  if (gold && (!ref || String(ref).trim() === "")) {
    return { line, message: "Gold rows require an external_ref so the expected answer can be linked" };
  }

  return {
    line,
    externalRef: ref ? String(ref).trim() : null,
    payload: rest,
    isGold: gold,
    expectedAnswer: answer ? String(answer) : null,
  };
}

function isRowError(v: ParsedTask | RowError): v is RowError {
  return "message" in v;
}

/** Parses JSONL — one JSON object per line, blank lines ignored. */
export function parseJsonl(content: string, taskType: TaskType): ParseResult {
  const tasks: ParsedTask[] = [];
  const errors: RowError[] = [];
  const duplicateRefs: string[] = [];
  const seen = new Set<string>();

  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (raw === "") continue;

    const line = i + 1;

    if (tasks.length >= MAX_IMPORT_ROWS) {
      errors.push({ line, message: `File exceeds the ${MAX_IMPORT_ROWS}-row limit` });
      break;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      errors.push({ line, message: "Not valid JSON" });
      continue;
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      errors.push({ line, message: "Each line must be a JSON object" });
      continue;
    }

    const result = normalizeRow(parsed as RawRow, taskType, line);
    if (isRowError(result)) {
      errors.push(result);
      continue;
    }

    if (result.externalRef) {
      if (seen.has(result.externalRef)) {
        duplicateRefs.push(result.externalRef);
        continue;
      }
      seen.add(result.externalRef);
    }

    tasks.push(result);
  }

  return { tasks, errors, duplicateRefs };
}

/** Parses CSV with a header row. */
export function parseCsv(content: string, taskType: TaskType): ParseResult {
  const tasks: ParsedTask[] = [];
  const errors: RowError[] = [];
  const duplicateRefs: string[] = [];
  const seen = new Set<string>();

  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) {
    return { tasks, errors: [{ line: 0, message: "File is empty" }], duplicateRefs };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  if (headers.every((h) => h === "")) {
    return { tasks, errors: [{ line: 1, message: "Header row is empty" }], duplicateRefs };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = i + 1;

    if (tasks.length >= MAX_IMPORT_ROWS) {
      errors.push({ line, message: `File exceeds the ${MAX_IMPORT_ROWS}-row limit` });
      break;
    }

    const cells = splitCsvLine(lines[i]);
    if (cells.length !== headers.length) {
      errors.push({
        line,
        message: `Expected ${headers.length} columns, found ${cells.length}`,
      });
      continue;
    }

    const row: RawRow = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx];
    });

    const result = normalizeRow(row, taskType, line);
    if (isRowError(result)) {
      errors.push(result);
      continue;
    }

    if (result.externalRef) {
      if (seen.has(result.externalRef)) {
        duplicateRefs.push(result.externalRef);
        continue;
      }
      seen.add(result.externalRef);
    }

    tasks.push(result);
  }

  return { tasks, errors, duplicateRefs };
}

export function parseImport(content: string, format: "jsonl" | "csv", taskType: TaskType): ParseResult {
  return format === "csv" ? parseCsv(content, taskType) : parseJsonl(content, taskType);
}

/** A minimal, valid example file for the given task type, shown in the UI. */
export function sampleFor(taskType: TaskType, format: "jsonl" | "csv"): string {
  const fields = requiredFieldsFor(taskType);
  const example: Record<string, string> = {};
  for (const f of fields) example[f] = `<${f}>`;

  if (format === "csv") {
    const headers = [...fields, "external_ref", "is_gold", "expected_answer"];
    return `${headers.join(",")}\n${fields.map((f) => `<${f}>`).join(",")},row-1,false,`;
  }

  return JSON.stringify({ ...example, external_ref: "row-1" });
}
