"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { startVerification, syncVerificationDecision, VerificationError } from "@/server/services/identity-verification";
import { clientIpFromHeaders } from "@/lib/security/geolocation";

export type ActionState = { status: "idle" | "success" | "error"; message?: string; redirectUrl?: string };

export async function beginVerification(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const h = await headers();
  const ip = clientIpFromHeaders(h) ?? undefined;

  try {
    const s = await startVerification({
      userId: session.user.id,
      email: session.user.email!,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/trainer/verification`,
      consentVersion: "v1",
      ipAddress: ip,
    });
    revalidatePath("/trainer/verification");
    return { status: "success", redirectUrl: s.redirectUrl };
  } catch (err) {
    if (err instanceof VerificationError) return { status: "error", message: err.message };
    throw err;
  }
}

export async function refreshVerification(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  try {
    const d = await syncVerificationDecision(session.user.id);
    revalidatePath("/trainer/verification");
    revalidatePath("/trainer/dashboard");
    return {
      status: "success",
      message:
        d.status === "VERIFIED"
          ? "Identity verified."
          : d.status === "REJECTED"
            ? d.reason ?? "Verification was unsuccessful."
            : "Still processing — check back in a moment.",
    };
  } catch (err) {
    if (err instanceof VerificationError) return { status: "error", message: err.message };
    throw err;
  }
}
