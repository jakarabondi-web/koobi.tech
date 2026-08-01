"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions/can";
import { InvoiceError, markInvoicePaid, markInvoiceSent, voidInvoice } from "@/server/services/invoices";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const schema = z.object({ invoiceId: z.string().min(1) });

export async function markSentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "payment.approve");

  const parsed = schema.safeParse({ invoiceId: formData.get("invoiceId") });
  if (!parsed.success) return { status: "error", message: "Invalid request." };

  try {
    await markInvoiceSent({ invoiceId: parsed.data.invoiceId, actorId: session.user.id });
  } catch (err) {
    if (err instanceof InvoiceError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath("/admin/invoices");
  return { status: "success", message: "Invoice marked sent." };
}

export async function markPaidAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "payment.approve");

  const parsed = schema.safeParse({ invoiceId: formData.get("invoiceId") });
  if (!parsed.success) return { status: "error", message: "Invalid request." };

  try {
    await markInvoicePaid({ invoiceId: parsed.data.invoiceId, actorId: session.user.id });
  } catch (err) {
    if (err instanceof InvoiceError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath("/admin/invoices");
  return { status: "success", message: "Invoice marked paid." };
}

export async function voidAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "payment.approve");

  const parsed = schema.safeParse({ invoiceId: formData.get("invoiceId") });
  if (!parsed.success) return { status: "error", message: "Invalid request." };

  try {
    await voidInvoice({ invoiceId: parsed.data.invoiceId, actorId: session.user.id });
  } catch (err) {
    if (err instanceof InvoiceError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath("/admin/invoices");
  return { status: "success", message: "Invoice voided." };
}
