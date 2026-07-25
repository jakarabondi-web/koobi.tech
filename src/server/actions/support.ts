"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { TicketCategory } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const schema = z.object({
  category: z.enum([
    "ACCOUNT", "ASSESSMENT", "PROJECT_ACCESS", "TASK_ISSUE", "QUALITY_APPEAL",
    "PAYMENT", "TECHNICAL_ISSUE", "SAFETY_CONCERN", "DATA_PRIVACY", "OTHER",
  ]),
  subject: z.string().min(5, "Give your ticket a short subject."),
  body: z.string().min(20, "Describe the issue in at least 20 characters."),
});

export async function createTicket(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const parsed = schema.safeParse({
    category: formData.get("category"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  await prisma.supportTicket.create({
    data: {
      requesterId: session.user.id,
      category: parsed.data.category as TicketCategory,
      subject: parsed.data.subject,
      messages: { create: { authorId: session.user.id, body: parsed.data.body } },
    },
  });

  revalidatePath("/trainer/support/tickets");
  return { status: "success", message: "Ticket opened. We typically reply within one business day." };
}
