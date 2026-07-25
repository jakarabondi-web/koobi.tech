import { prisma } from "@/lib/db/prisma";

export const MIN_PAYOUT_CENTS = 1000;

function earningTotal(e: { baseCents: number; bonusCents: number; adjustmentCents: number }) {
  return e.baseCents + e.bonusCents + e.adjustmentCents;
}

export type WalletSummary = {
  /** Approved earnings not yet attached to a payout request — cashable now. */
  availableCents: number;
  /** Earnings still awaiting review/approval. */
  pendingCents: number;
  /** Attached to a payout request that hasn't settled yet. */
  inTransitCents: number;
  /** Lifetime total actually paid out. */
  paidCents: number;
};

export async function getWalletSummary(userId: string): Promise<WalletSummary> {
  const earnings = await prisma.earning.findMany({
    where: { userId },
    select: {
      baseCents: true,
      bonusCents: true,
      adjustmentCents: true,
      status: true,
      payoutRequestId: true,
    },
  });

  let availableCents = 0;
  let pendingCents = 0;
  let inTransitCents = 0;
  let paidCents = 0;

  for (const e of earnings) {
    const total = earningTotal(e);
    if (e.status === "PAID") paidCents += total;
    else if (e.status === "PENDING_REVIEW") pendingCents += total;
    else if (e.status === "APPROVED") {
      if (e.payoutRequestId) inTransitCents += total;
      else availableCents += total;
    } else if (e.status === "SCHEDULED" || e.status === "PROCESSING") inTransitCents += total;
  }

  return { availableCents, pendingCents, inTransitCents, paidCents };
}

export class WalletError extends Error {}

/**
 * Creates a payout request covering every currently-cashable earning.
 * Runs in a transaction so earnings can't be double-claimed by two
 * concurrent requests.
 */
export async function requestPayout(params: {
  userId: string;
  paymentAccountId: string;
}): Promise<{ payoutRequestId: string; amountCents: number }> {
  const account = await prisma.paymentAccount.findFirst({
    where: { id: params.paymentAccountId, userId: params.userId },
  });
  if (!account) throw new WalletError("Payment method not found.");
  if (account.provider !== "STRIPE_CONNECT" && account.provider !== "MPESA") {
    throw new WalletError("This payment method does not support payouts yet.");
  }

  return prisma.$transaction(async (tx) => {
    const open = await tx.payoutRequest.findFirst({
      where: { userId: params.userId, status: { in: ["REQUESTED", "APPROVED", "PROCESSING"] } },
    });
    if (open) throw new WalletError("You already have a payout request in progress.");

    const cashable = await tx.earning.findMany({
      where: { userId: params.userId, status: "APPROVED", payoutRequestId: null },
      select: { id: true, baseCents: true, bonusCents: true, adjustmentCents: true },
    });

    const amountCents = cashable.reduce((sum, e) => sum + earningTotal(e), 0);
    if (amountCents < MIN_PAYOUT_CENTS) {
      throw new WalletError(
        `You need at least ${(MIN_PAYOUT_CENTS / 100).toFixed(2)} in available earnings to request a payout.`
      );
    }

    const request = await tx.payoutRequest.create({
      data: {
        userId: params.userId,
        paymentAccountId: account.id,
        provider: account.provider === "MPESA" ? "MPESA" : "STRIPE_CONNECT",
        amountCents,
      },
    });

    await tx.earning.updateMany({
      where: { id: { in: cashable.map((e) => e.id) } },
      data: { payoutRequestId: request.id },
    });

    await tx.notification.create({
      data: {
        userId: params.userId,
        type: "payout_requested",
        title: "Payout request submitted",
        body: `Your request for ${(amountCents / 100).toFixed(2)} is awaiting review.`,
        link: "/trainer/payments",
      },
    });

    return { payoutRequestId: request.id, amountCents };
  });
}
