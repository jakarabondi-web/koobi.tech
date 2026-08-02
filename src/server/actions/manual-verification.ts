"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { clientIpFromHeaders } from "@/lib/security/geolocation";
import { ManualVerificationError, submitManualVerification } from "@/server/services/manual-identity-verification";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

export async function submitManualVerificationAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const documentFile = formData.get("document");
  const selfieFile = formData.get("selfie");
  const consented = formData.get("consent") === "true";

  if (!(documentFile instanceof File) || documentFile.size === 0) {
    return { status: "error", message: "Attach a photo of your government-issued ID." };
  }
  if (!(selfieFile instanceof File) || selfieFile.size === 0) {
    return { status: "error", message: "Attach a selfie." };
  }
  if (!consented) {
    return { status: "error", message: "Consent is required to submit for manual review." };
  }

  const h = await headers();
  const ip = clientIpFromHeaders(h) ?? undefined;

  try {
    await submitManualVerification({
      userId: session.user.id,
      email: session.user.email!,
      documentFile,
      selfieFile,
      consentVersion: "manual-v1",
      ipAddress: ip,
    });
  } catch (err) {
    if (err instanceof ManualVerificationError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath("/trainer/verification");
  return {
    status: "success",
    message: "Submitted for review. A team member will look at this — typically within a few business days.",
  };
}
