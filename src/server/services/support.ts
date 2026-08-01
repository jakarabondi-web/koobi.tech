import type { TicketStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export class TicketError extends Error {}

const TERMINAL_STATUSES: TicketStatus[] = ["RESOLVED", "CLOSED"];

/** Assigns a ticket to a staff member, moving it out of OPEN if it's still unclaimed. */
export async function assignTicket(params: { ticketId: string; assigneeId: string; actorId: string }) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.ticketId } });
  if (!ticket) throw new TicketError("That ticket no longer exists.");
  if (TERMINAL_STATUSES.includes(ticket.status)) {
    throw new TicketError("This ticket is already closed.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.supportTicket.update({
      where: { id: params.ticketId },
      data: {
        assigneeId: params.assigneeId,
        status: ticket.status === "OPEN" ? "ASSIGNED" : ticket.status,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.actorId,
        action: "support_ticket.assigned",
        entityType: "SupportTicket",
        entityId: params.ticketId,
        metadata: { assigneeId: params.assigneeId },
      },
    });

    return updated;
  });
}

/** Moves a ticket to a new status, notifying the requester once it's resolved or closed. */
export async function updateTicketStatus(params: { ticketId: string; status: TicketStatus; actorId: string }) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.ticketId } });
  if (!ticket) throw new TicketError("That ticket no longer exists.");
  if (ticket.status === params.status) throw new TicketError("The ticket is already in that status.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.supportTicket.update({
      where: { id: params.ticketId },
      data: { status: params.status },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.actorId,
        action: "support_ticket.status_changed",
        entityType: "SupportTicket",
        entityId: params.ticketId,
        metadata: { from: ticket.status, to: params.status },
      },
    });

    if (params.status === "RESOLVED" || params.status === "CLOSED") {
      await tx.notification.create({
        data: {
          userId: ticket.requesterId,
          type: "ticket_resolved",
          title: params.status === "RESOLVED" ? "Your ticket was resolved" : "Your ticket was closed",
          body: ticket.subject,
          link: "/trainer/support/tickets",
        },
      });
    }

    return updated;
  });
}
