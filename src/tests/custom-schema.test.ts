import { describe, expect, it } from "vitest";

import {
  customRequiredFields,
  customResponseText,
  customTaskSchema,
  parseCustomSchema,
  validateCustomResponses,
  type CustomTaskSchema,
} from "@/lib/tasks/custom-schema";
import { parseJsonl, requiredFieldsFor, sampleFor } from "@/lib/tasks/import-parser";

const VALID: CustomTaskSchema = {
  instructions: "Grade the agent reply and suggest an improved version.",
  inputFields: [
    { key: "ticket", label: "Customer ticket" },
    { key: "reply", label: "Agent reply" },
  ],
  responseFields: [
    { key: "quality", label: "Reply quality", kind: "rating", max: 5, required: true },
    { key: "main_issue", label: "Main issue", kind: "select", required: true, options: ["None", "Tone", "Wrong"] },
    { key: "resolves", label: "Resolves the question", kind: "boolean", required: true },
    { key: "improved_reply", label: "Improved reply", kind: "textarea", required: true, minLength: 40 },
    { key: "note", label: "Note", kind: "text", required: false },
  ],
};

describe("customTaskSchema", () => {
  it("accepts a valid definition", () => {
    expect(customTaskSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects duplicate response keys", () => {
    const dupe = {
      ...VALID,
      responseFields: [
        { key: "quality", label: "A", kind: "text" as const, required: true },
        { key: "quality", label: "B", kind: "text" as const, required: true },
      ],
    };
    expect(customTaskSchema.safeParse(dupe).success).toBe(false);
  });

  it("rejects invalid keys", () => {
    const bad = { ...VALID, inputFields: [{ key: "Bad Key!", label: "X" }] };
    expect(customTaskSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a select without options via the discriminated union", () => {
    const bad = {
      ...VALID,
      responseFields: [{ key: "choice", label: "Choice", kind: "select", required: true }],
    };
    expect(customTaskSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects empty instructions and empty field lists", () => {
    expect(customTaskSchema.safeParse({ ...VALID, instructions: "short" }).success).toBe(false);
    expect(customTaskSchema.safeParse({ ...VALID, inputFields: [] }).success).toBe(false);
    expect(customTaskSchema.safeParse({ ...VALID, responseFields: [] }).success).toBe(false);
  });

  it("parseCustomSchema returns null for junk", () => {
    expect(parseCustomSchema(null)).toBeNull();
    expect(parseCustomSchema({ anything: true })).toBeNull();
    expect(parseCustomSchema(VALID)).not.toBeNull();
  });
});

describe("validateCustomResponses", () => {
  const good = {
    quality: "4",
    main_issue: "Tone",
    resolves: "true",
    improved_reply: "Here is a much better reply that actually addresses the refund question directly.",
  };

  it("accepts a complete valid response and coerces types", () => {
    const result = validateCustomResponses(VALID, good);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.responses.quality).toBe(4);
      expect(result.responses.resolves).toBe(true);
      expect(result.responses.main_issue).toBe("Tone");
    }
  });

  it("treats an absent boolean as false, not missing", () => {
    const result = validateCustomResponses(VALID, { ...good, resolves: undefined });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.responses.resolves).toBe(false);
  });

  it("rejects a missing required field", () => {
    const result = validateCustomResponses(VALID, { ...good, main_issue: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].field).toBe("main_issue");
  });

  it("rejects an off-menu select value", () => {
    const result = validateCustomResponses(VALID, { ...good, main_issue: "Something else" });
    expect(result.ok).toBe(false);
  });

  it("rejects an out-of-range rating", () => {
    expect(validateCustomResponses(VALID, { ...good, quality: "9" }).ok).toBe(false);
    expect(validateCustomResponses(VALID, { ...good, quality: "0" }).ok).toBe(false);
    expect(validateCustomResponses(VALID, { ...good, quality: "2.5" }).ok).toBe(false);
  });

  it("enforces minLength on text fields", () => {
    const result = validateCustomResponses(VALID, { ...good, improved_reply: "too short" });
    expect(result.ok).toBe(false);
  });

  it("drops unknown keys instead of storing them", () => {
    const result = validateCustomResponses(VALID, { ...good, smuggled: "data" });
    expect(result.ok).toBe(true);
    if (result.ok) expect("smuggled" in result.responses).toBe(false);
  });

  it("skips an omitted optional field", () => {
    const result = validateCustomResponses(VALID, good);
    expect(result.ok).toBe(true);
    if (result.ok) expect("note" in result.responses).toBe(false);
  });
});

describe("customResponseText", () => {
  it("concatenates only free-text responses", () => {
    const text = customResponseText(VALID, {
      quality: 4,
      main_issue: "Tone",
      resolves: true,
      improved_reply: "Better reply.",
      note: "A note.",
    });
    expect(text).toBe("Better reply.\nA note.");
  });
});

describe("import parser with custom fields", () => {
  const fields = customRequiredFields(VALID);

  it("derives required fields from the schema's input fields", () => {
    expect(fields).toEqual(["ticket", "reply"]);
    expect(requiredFieldsFor("CUSTOM", fields)).toEqual(["ticket", "reply"]);
    expect(requiredFieldsFor("CUSTOM")).toEqual([]);
  });

  it("validates JSONL rows against the custom fields", () => {
    const content = [
      JSON.stringify({ ticket: "t1", reply: "r1", external_ref: "a" }),
      JSON.stringify({ ticket: "t2" }),
    ].join("\n");
    const result = parseJsonl(content, "CUSTOM", fields);
    expect(result.tasks).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("reply");
  });

  it("builds samples from the custom fields", () => {
    expect(sampleFor("CUSTOM", "jsonl", fields)).toContain("ticket");
    expect(sampleFor("CUSTOM", "csv", fields)).toContain("reply");
  });
});
