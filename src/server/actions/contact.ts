"use server";

import { z } from "zod";

import { sendEmail } from "@/lib/email/client";
import { brand } from "@/config/brand";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  workEmail: z.string().email("Enter a valid work email"),
  company: z.string().min(1, "Company is required"),
  useCase: z.string().min(10, "Tell us a bit more about your use case"),
});

export type ContactState = {
  status: "idle" | "success" | "error";
  errors?: Partial<Record<keyof z.infer<typeof contactSchema>, string>>;
};

export async function submitContactForm(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    workEmail: formData.get("workEmail"),
    company: formData.get("company"),
    useCase: formData.get("useCase"),
  });

  if (!parsed.success) {
    const errors: ContactState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof contactSchema>;
      errors[key] = issue.message;
    }
    return { status: "error", errors };
  }

  await sendEmail({
    to: brand.salesEmail,
    subject: `New demo request from ${parsed.data.company}`,
    html: `<p><strong>${parsed.data.name}</strong> (${parsed.data.workEmail}) at ${parsed.data.company} requested a demo.</p><p>${parsed.data.useCase}</p>`,
  });

  return { status: "success" };
}
