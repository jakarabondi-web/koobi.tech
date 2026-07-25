import { describe, expect, it } from "vitest";

import {
  MAX_IMPORT_ROWS,
  parseCsv,
  parseJsonl,
  requiredFieldsFor,
  sampleFor,
  splitCsvLine,
} from "@/lib/tasks/import-parser";

describe("splitCsvLine", () => {
  it("splits plain fields", () => {
    expect(splitCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("keeps commas inside quoted fields", () => {
    expect(splitCsvLine('"one, two",three')).toEqual(["one, two", "three"]);
  });

  it("unescapes doubled quotes", () => {
    expect(splitCsvLine('"she said ""hi""",x')).toEqual(['she said "hi"', "x"]);
  });

  it("preserves empty trailing fields", () => {
    expect(splitCsvLine("a,,")).toEqual(["a", "", ""]);
  });

  it("handles a quoted field containing newline-adjacent commas", () => {
    expect(splitCsvLine('"a,b,c"')).toEqual(["a,b,c"]);
  });
});

describe("parseJsonl", () => {
  it("parses valid rows for the task type", () => {
    const content = [
      JSON.stringify({ prompt: "p1", responseA: "a", responseB: "b" }),
      JSON.stringify({ prompt: "p2", responseA: "a2", responseB: "b2" }),
    ].join("\n");

    const result = parseJsonl(content, "PAIRWISE_COMPARISON");
    expect(result.tasks).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.tasks[0].payload).toEqual({ prompt: "p1", responseA: "a", responseB: "b" });
  });

  it("reports missing required fields with the line number", () => {
    const content = JSON.stringify({ prompt: "p1", responseA: "a" });
    const result = parseJsonl(content, "PAIRWISE_COMPARISON");

    expect(result.tasks).toHaveLength(0);
    expect(result.errors[0]).toMatchObject({ line: 1 });
    expect(result.errors[0].message).toContain("responseB");
  });

  it("treats a whitespace-only field as missing", () => {
    const content = JSON.stringify({ prompt: "p", responseA: "   ", responseB: "b" });
    expect(parseJsonl(content, "PAIRWISE_COMPARISON").errors[0].message).toContain("responseA");
  });

  it("reports malformed JSON without aborting the rest of the file", () => {
    const content = [
      JSON.stringify({ prompt: "p1", responseA: "a", responseB: "b" }),
      "{not json",
      JSON.stringify({ prompt: "p3", responseA: "a", responseB: "b" }),
    ].join("\n");

    const result = parseJsonl(content, "PAIRWISE_COMPARISON");
    expect(result.tasks).toHaveLength(2);
    expect(result.errors).toEqual([{ line: 2, message: "Not valid JSON" }]);
  });

  it("rejects non-object lines", () => {
    const result = parseJsonl('["a"]', "PAIRWISE_COMPARISON");
    expect(result.errors[0].message).toContain("JSON object");
  });

  it("ignores blank lines without shifting line numbers", () => {
    const content = ["", JSON.stringify({ prompt: "p", responseA: "a" }), ""].join("\n");
    const result = parseJsonl(content, "PAIRWISE_COMPARISON");
    // The bad row is on physical line 2, not line 1.
    expect(result.errors[0].line).toBe(2);
  });

  it("lifts reserved keys out of the payload", () => {
    const content = JSON.stringify({
      prompt: "p",
      responseA: "a",
      responseB: "b",
      external_ref: "row-9",
      is_gold: "true",
      expected_answer: "B",
    });

    const [task] = parseJsonl(content, "PAIRWISE_COMPARISON").tasks;
    expect(task.externalRef).toBe("row-9");
    expect(task.isGold).toBe(true);
    expect(task.expectedAnswer).toBe("B");
    // Reserved keys must not leak into what trainers see.
    expect(task.payload).toEqual({ prompt: "p", responseA: "a", responseB: "b" });
  });

  it("carries unknown columns through as payload metadata", () => {
    const content = JSON.stringify({
      prompt: "p", responseA: "a", responseB: "b", source: "internal-eval-42",
    });
    expect(parseJsonl(content, "PAIRWISE_COMPARISON").tasks[0].payload.source).toBe("internal-eval-42");
  });

  it("rejects a gold row with no expected answer", () => {
    const content = JSON.stringify({
      prompt: "p", responseA: "a", responseB: "b", is_gold: true, external_ref: "g1",
    });
    const result = parseJsonl(content, "PAIRWISE_COMPARISON");

    expect(result.tasks).toHaveLength(0);
    expect(result.errors[0].message).toContain("expected_answer");
  });

  it("accepts several truthy spellings for is_gold", () => {
    for (const v of [true, "true", "1", 1, "yes"]) {
      const content = JSON.stringify({
        prompt: "p", responseA: "a", responseB: "b",
        is_gold: v, expected_answer: "B", external_ref: "g1",
      });
      expect(parseJsonl(content, "PAIRWISE_COMPARISON").tasks[0].isGold).toBe(true);
    }
  });

  it("rejects a gold row with no external_ref", () => {
    // Gold answers are linked by ref after bulk insert; without one the
    // answer would be silently lost.
    const content = JSON.stringify({
      prompt: "p", responseA: "a", responseB: "b", is_gold: true, expected_answer: "B",
    });
    const result = parseJsonl(content, "PAIRWISE_COMPARISON");
    expect(result.tasks).toHaveLength(0);
    expect(result.errors[0].message).toContain("external_ref");
  });

  it("skips rows repeating an external ref seen earlier in the file", () => {
    const content = [
      JSON.stringify({ prompt: "p1", responseA: "a", responseB: "b", external_ref: "dup" }),
      JSON.stringify({ prompt: "p2", responseA: "a", responseB: "b", external_ref: "dup" }),
      JSON.stringify({ prompt: "p3", responseA: "a", responseB: "b", external_ref: "ok" }),
    ].join("\n");

    const result = parseJsonl(content, "PAIRWISE_COMPARISON");
    expect(result.tasks).toHaveLength(2);
    expect(result.duplicateRefs).toEqual(["dup"]);
  });

  it("stops at the row limit rather than accepting an unbounded file", () => {
    const row = JSON.stringify({ prompt: "p", responseA: "a", responseB: "b" });
    const content = Array.from({ length: MAX_IMPORT_ROWS + 10 }, () => row).join("\n");

    const result = parseJsonl(content, "PAIRWISE_COMPARISON");
    expect(result.tasks).toHaveLength(MAX_IMPORT_ROWS);
    expect(result.errors.at(-1)?.message).toContain("row limit");
  });

  it("validates against the fields the given task type needs", () => {
    const content = JSON.stringify({ claim: "The sky is green", citation: "example.com" });
    expect(parseJsonl(content, "CITATION_VERIFICATION").errors).toHaveLength(0);
    // The same row lacks what a pairwise task requires.
    expect(parseJsonl(content, "PAIRWISE_COMPARISON").errors).toHaveLength(1);
  });
});

describe("parseCsv", () => {
  it("parses a header row plus data rows", () => {
    const content = ["prompt,responseA,responseB", "p1,a1,b1", "p2,a2,b2"].join("\n");
    const result = parseCsv(content, "PAIRWISE_COMPARISON");

    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[1].payload).toEqual({ prompt: "p2", responseA: "a2", responseB: "b2" });
  });

  it("flags rows whose column count doesn't match the header", () => {
    const content = ["prompt,responseA,responseB", "p1,a1"].join("\n");
    const result = parseCsv(content, "PAIRWISE_COMPARISON");

    expect(result.tasks).toHaveLength(0);
    expect(result.errors[0].message).toContain("Expected 3 columns, found 2");
  });

  it("handles quoted cells containing commas", () => {
    const content = ["prompt,responseA,responseB", '"Compare A, then B",a1,b1'].join("\n");
    expect(parseCsv(content, "PAIRWISE_COMPARISON").tasks[0].payload.prompt).toBe("Compare A, then B");
  });

  it("reports an empty file", () => {
    expect(parseCsv("", "PAIRWISE_COMPARISON").errors[0].message).toBe("File is empty");
  });

  it("reads gold columns from the header", () => {
    const content = [
      "prompt,responseA,responseB,is_gold,expected_answer,external_ref",
      "p1,a1,b1,true,B,g1",
    ].join("\n");

    const [task] = parseCsv(content, "PAIRWISE_COMPARISON").tasks;
    expect(task.isGold).toBe(true);
    expect(task.expectedAnswer).toBe("B");
  });
});

describe("requiredFieldsFor", () => {
  it("returns the fields a task type needs", () => {
    expect(requiredFieldsFor("PAIRWISE_COMPARISON")).toEqual(["prompt", "responseA", "responseB"]);
    expect(requiredFieldsFor("CODE_OUTPUT_EVALUATION")).toEqual(["code", "output"]);
  });
});

describe("sampleFor", () => {
  it("produces a sample that parses cleanly", () => {
    const jsonl = sampleFor("PAIRWISE_COMPARISON", "jsonl");
    expect(parseJsonl(jsonl, "PAIRWISE_COMPARISON").errors).toHaveLength(0);

    const csv = sampleFor("PAIRWISE_COMPARISON", "csv");
    expect(parseCsv(csv, "PAIRWISE_COMPARISON").errors).toHaveLength(0);
  });
});

describe("field naming conventions", () => {
  it("accepts required fields in snake_case as well as camelCase", () => {
    const snake = parseJsonl(
      JSON.stringify({ prompt: "p", response_a: "A", response_b: "B" }),
      "PAIRWISE_COMPARISON"
    );
    expect(snake.errors).toEqual([]);
    expect(snake.tasks).toHaveLength(1);
  });

  it("normalises snake_case payload keys to the canonical camelCase name", () => {
    const result = parseJsonl(
      JSON.stringify({ prompt: "p", response_a: "A", response_b: "B" }),
      "PAIRWISE_COMPARISON"
    );
    // The workspace renders payload.responseA — one shape regardless of how
    // the client spelled it on the way in.
    expect(result.tasks[0].payload).toEqual({ prompt: "p", responseA: "A", responseB: "B" });
  });

  it("keeps camelCase rows exactly as they were", () => {
    const result = parseJsonl(
      JSON.stringify({ prompt: "p", responseA: "A", responseB: "B" }),
      "PAIRWISE_COMPARISON"
    );
    expect(result.tasks[0].payload).toEqual({ prompt: "p", responseA: "A", responseB: "B" });
  });

  it("names both spellings when a required field is missing", () => {
    const result = parseJsonl(JSON.stringify({ prompt: "p" }), "PAIRWISE_COMPARISON");
    expect(result.errors[0].message).toContain("responseA (or response_a)");
  });

  it("does not invent an alias for a single-word field", () => {
    const result = parseJsonl(JSON.stringify({}), "FACT_CHECKING");
    expect(result.errors[0].message).toBe("Missing required field: claim");
  });
});
