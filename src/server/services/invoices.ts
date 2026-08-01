import { prisma } from "@/lib/db/prisma";

export class InvoiceError extends Error {}

async function transition(params: {
  invoiceId: string;
  actorId: string;
  from: ("DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID")[];
  to: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";
  action: string;
  extra?: Record<string, unknown>;
}) {
  const invoice = await prisma.invoice.findUnique({ where: { id: params.invoiceId } });
  if (!invoice) throw new InvoiceError("That invoice no longer exists.");
  if (!params.from.includes(invoice.status)) {
    throw new InvoiceError(`An invoice in ${invoice.status.toLowerCase()} status can't be moved to ${params.to.toLowerCase()}.`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.invoice.update({
      where: { id: params.invoiceId },
      data: { status: params.to, ...(params.extra ?? {}) },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: "Invoice",
        entityId: params.invoiceId,
      },
    });

    return updated;
  });
}

export function markInvoiceSent(params: { invoiceId: string; actorId: string }) {
  return transition({ ...params, from: ["DRAFT"], to: "SENT", action: "invoice.sent" });
}

export function markInvoicePaid(params: { invoiceId: string; actorId: string }) {
  return transition({
    ...params,
    from: ["SENT", "OVERDUE"],
    to: "PAID",
    action: "invoice.paid",
    extra: { paidAt: new Date() },
  });
}

export function voidInvoice(params: { invoiceId: string; actorId: string }) {
  return transition({ ...params, from: ["DRAFT", "SENT"], to: "VOID", action: "invoice.voided" });
}
