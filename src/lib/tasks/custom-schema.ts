import { z } from "zod";

/**
 * Client-defined task shapes ("custom task types").
 *
 * A CUSTOM project carries exactly one TaskTemplate whose `schema` column
 * holds a CustomTaskSchema: which fields of each task's payload the trainer
 * is shown, and which response fields are collected from them. This is the
 * contract between three parties that never meet — the client's ingestion
 * pipeline, the trainer workspace, and the review queue — so it is
 * validated strictly at definition time rather than leniently at use time.
 */

const KEY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;

const keySchema = z
  .string()
  .regex(
    KEY_PATTERN,
    "Keys must start with a letter and contain only lowercase letters, digits, and underscores (max 40 chars)."
  );

const inputFieldSchema = z.object({
  key: keySchema,
  label: z.string().min(1).max(80),
});

const responseFieldBase = {
  key: keySchema,
  label: z.string().min(1).max(80),
  required: z.boolean().default(true),
};

/**
 * A discriminated union rather than one loose object with everything
 * optional: a select without options or a rating with them should fail at
 * definition time, not surprise a trainer mid-task.
 */
const responseFieldSchema = z.discriminatedUnion("kind", [
  z.object({ ...responseFieldBase, kind: z.literal("text"), minLength: z.number().int().min(0).max(2000).optional() }),
  z.object({ ...responseFieldBase, kind: z.literal("textarea"), minLength: z.number().int().min(0).max(2000).optional() }),
  z.object({
    ...responseFieldBase,
    kind: z.literal("select"),
    options: z.array(z.string().min(1).max(80)).min(2).max(12),
  }),
  /** 1..max integer scale, rendered as rating buttons. */
  z.object({ ...responseFieldBase, kind: z.literal("rating"), max: z.number().int().min(2).max(10).default(5) }),
  z.object({ ...responseFieldBase, kind: z.literal("boolean") }),
]);

function uniqueKeys(fields: { key: string }[]): boolean {
  return new Set(fields.map((f) => f.key)).size === fields.length;
}

export const customTaskSchema = z.object({
  /** Shown in the trainer workspace in place of the built-in instructions. */
  instructions: z.string().min(20, "Write at least 20 characters of instructions.").max(4000),
  inputFields: z
    .array(inputFieldSchema)
    .min(1, "Define at least one input field.")
    .max(12)
    .refine(uniqueKeys, "Input field keys must be unique."),
  responseFields: z
    .array(responseFieldSchema)
    .min(1, "Define at least one response field.")
    .max(12)
    .refine(uniqueKeys, "Response field keys must be unique."),
});

export type CustomTaskSchema = z.infer<typeof customTaskSchema>;
export type CustomResponseField = CustomTaskSchema["responseFields"][number];

/** Parses a stored TaskTemplate.schema; null when it isn't a valid definition. */
export function parseCustomSchema(value: unknown): CustomTaskSchema | null {
  const parsed = customTaskSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** The payload fields every imported task row must carry. */
export function customRequiredFields(schema: CustomTaskSchema): string[] {
  return schema.inputFields.map((f) => f.key);
}

export type ResponseValidationError = { field: string; message: string };

/**
 * Validates a trainer's submitted responses against the schema.
 *
 * Runs server-side on submission — the workspace enforces the same rules in
 * the browser, but the browser is a convenience, not a boundary. Returns the
 * cleaned response map on success (unknown keys dropped, so a tampered form
 * can't smuggle extra data into the submission content).
 */
export function validateCustomResponses(
  schema: CustomTaskSchema,
  values: Record<string, unknown>
): { ok: true; responses: Record<string, unknown> } | { ok: false; errors: ResponseValidationError[] } {
  const errors: ResponseValidationError[] = [];
  const responses: Record<string, unknown> = {};

  for (const field of schema.responseFields) {
    const raw = values[field.key];
    const empty = raw === undefined || raw === null || String(raw).trim() === "";

    if (empty) {
      // An unchecked checkbox is a valid "no", not a missing answer — HTML
      // forms omit unchecked boxes entirely, so absence IS the false state.
      if (field.kind === "boolean") {
        responses[field.key] = false;
      } else if (field.required) {
        errors.push({ field: field.key, message: `${field.label} is required.` });
      }
      continue;
    }

    switch (field.kind) {
      case "text":
      case "textarea": {
        const text = String(raw);
        if (field.minLength && text.trim().length < field.minLength) {
          errors.push({ field: field.key, message: `${field.label} needs at least ${field.minLength} characters.` });
        } else {
          responses[field.key] = text;
        }
        break;
      }
      case "select": {
        const choice = String(raw);
        if (!field.options.includes(choice)) {
          errors.push({ field: field.key, message: `${field.label} must be one of the listed options.` });
        } else {
          responses[field.key] = choice;
        }
        break;
      }
      case "rating": {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 1 || n > field.max) {
          errors.push({ field: field.key, message: `${field.label} must be a whole number from 1 to ${field.max}.` });
        } else {
          responses[field.key] = n;
        }
        break;
      }
      case "boolean": {
        responses[field.key] = raw === true || raw === "true" || raw === "on" || raw === "1";
        break;
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, responses };
}

/**
 * The free-text portions of a response, concatenated — what the plagiarism
 * similarity check compares across trainers.
 */
export function customResponseText(schema: CustomTaskSchema, responses: Record<string, unknown>): string {
  return schema.responseFields
    .filter((f) => f.kind === "text" || f.kind === "textarea")
    .map((f) => responses[f.key])
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .join("\n");
}
