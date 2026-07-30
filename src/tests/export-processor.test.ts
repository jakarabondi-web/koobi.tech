import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Export processing is the one place a client's dataset leaves the platform
 * as a file. These tests pin two things: the serializers produce correct
 * JSONL/CSV for the shapes real dataset items take, and processExport's
 * guarded QUEUED -> PROCESSING claim + failure handling behave as documented
 * rather than as merely observed once in manual testing.
 */

const updateManyExport = vi.fn();
const findUniqueOrThrowExport = vi.fn();
const updateExport = vi.fn();
const findManyDatasetItem = vi.fn();
const dispatchWebhookEvent = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    export: {
      updateMany: (...a: unknown[]) => updateManyExport(...a),
      findUniqueOrThrow: (...a: unknown[]) => findUniqueOrThrowExport(...a),
      update: (...a: unknown[]) => updateExport(...a),
    },
    datasetItem: {
      findMany: (...a: unknown[]) => findManyDatasetItem(...a),
    },
  },
}));

vi.mock("@/server/services/webhooks", () => ({
  dispatchWebhookEvent: (...a: unknown[]) => dispatchWebhookEvent(...a),
}));

const { processExport, isSupportedFormat, toJsonl, toCsv, csvCell } = await import(
  "@/server/services/export-processor"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isSupportedFormat", () => {
  it("accepts jsonl and csv only", () => {
    expect(isSupportedFormat("jsonl")).toBe(true);
    expect(isSupportedFormat("csv")).toBe(true);
    expect(isSupportedFormat("xml")).toBe(false);
    expect(isSupportedFormat("")).toBe(false);
  });
});

describe("csvCell", () => {
  it("passes plain values through unquoted", () => {
    expect(csvCell("hello")).toBe("hello");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(true)).toBe("true");
  });

  it("renders null and undefined as an empty cell", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes and escapes a value containing a comma, quote, or newline", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("serializes objects and arrays as JSON, quoting the result", () => {
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"');
  });
});

describe("toJsonl", () => {
  it("writes one JSON object per line, in order", () => {
    const out = toJsonl([{ content: { a: 1 } }, { content: { b: 2 } }]);
    expect(out).toBe('{"a":1}\n{"b":2}');
  });

  it("returns an empty string for no items", () => {
    expect(toJsonl([])).toBe("");
  });
});

describe("toCsv", () => {
  it("builds a header from the union of keys across rows, first-seen order", () => {
    const out = toCsv([{ content: { a: 1, b: 2 } }, { content: { b: 3, c: 4 } }]);
    const lines = out.split("\n");
    expect(lines[0]).toBe("a,b,c");
    expect(lines[1]).toBe("1,2,");
    expect(lines[2]).toBe(",3,4");
  });

  it("quotes cells that need it", () => {
    const out = toCsv([{ content: { note: "has, a comma" } }]);
    expect(out).toBe('note\n"has, a comma"');
  });

  it("skips non-object content when building the column set", () => {
    const out = toCsv([{ content: "not an object" }, { content: { a: 1 } }]);
    expect(out.split("\n")[0]).toBe("a");
  });
});

describe("processExport", () => {
  const BASE_ROW = {
    id: "exp-1",
    format: "jsonl",
    datasetId: "ds-1",
    dataset: { id: "ds-1", name: "Reviewed tasks", organizationId: "org-1" },
  };

  it("does nothing if the export isn't QUEUED (already claimed)", async () => {
    updateManyExport.mockResolvedValue({ count: 0 });

    await processExport("exp-1");

    expect(findUniqueOrThrowExport).not.toHaveBeenCalled();
    expect(updateExport).not.toHaveBeenCalled();
  });

  it("builds the file and marks the export READY on success", async () => {
    updateManyExport.mockResolvedValue({ count: 1 });
    findUniqueOrThrowExport.mockResolvedValue(BASE_ROW);
    findManyDatasetItem.mockResolvedValue([{ content: { x: 1 } }, { content: { x: 2 } }]);

    await processExport("exp-1");

    expect(updateExport).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "exp-1" },
        data: expect.objectContaining({
          status: "READY",
          content: '{"x":1}\n{"x":2}',
          fileUrl: "/api/v1/exports/exp-1/download",
        }),
      })
    );
    expect(dispatchWebhookEvent).toHaveBeenCalledWith(
      "org-1",
      "export.ready",
      expect.objectContaining({ export_id: "exp-1", dataset_id: "ds-1", format: "jsonl" })
    );
  });

  it("marks the export FAILED with a readable message for an unsupported format", async () => {
    updateManyExport.mockResolvedValue({ count: 1 });
    findUniqueOrThrowExport.mockResolvedValue({ ...BASE_ROW, format: "xml" });

    await processExport("exp-1");

    expect(updateExport).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED", error: expect.stringContaining("xml") }),
      })
    );
    expect(dispatchWebhookEvent).not.toHaveBeenCalled();
  });

  it("marks the export FAILED when the dataset has no items", async () => {
    updateManyExport.mockResolvedValue({ count: 1 });
    findUniqueOrThrowExport.mockResolvedValue(BASE_ROW);
    findManyDatasetItem.mockResolvedValue([]);

    await processExport("exp-1");

    expect(updateExport).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED", error: expect.stringContaining("no items") }),
      })
    );
  });

  it("marks the export FAILED and rethrows on an unexpected error", async () => {
    updateManyExport.mockResolvedValue({ count: 1 });
    findUniqueOrThrowExport.mockRejectedValue(new Error("db exploded"));

    await expect(processExport("exp-1")).rejects.toThrow("db exploded");

    expect(updateExport).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED", error: "Export processing failed." }),
      })
    );
  });
});
