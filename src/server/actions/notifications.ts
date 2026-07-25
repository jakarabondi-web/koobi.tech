"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export type ActionState = { status: "idle" | "success" };

export async function markAllNotificationsRead(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "idle" };

  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/trainer/notifications");
  revalidatePath("/trainer/dashboard");
  return { status: "success" };
}
