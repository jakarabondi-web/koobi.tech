"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { AccountError, changePassword, requestEmailChange, updateName } from "@/server/services/account";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const nameSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  displayName: z.string().trim().optional(),
});

/**
 * Updates a user's own name. Identical on every surface — the profile
 * belongs to the account, not to whichever app section it's edited from —
 * so this isn't gated on any role beyond being signed in.
 */
export async function updateNameAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const parsed = nameSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    displayName: formData.get("displayName") || undefined,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your details." };

  await updateName({
    userId: session.user.id,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    displayName: parsed.data.displayName,
  });

  revalidatePath("/trainer/settings");
  revalidatePath("/client/settings");
  revalidatePath("/admin/settings");
  return { status: "success", message: "Name updated." };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your details." };

  try {
    await changePassword({
      userId: session.user.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
  } catch (err) {
    if (err instanceof AccountError) return { status: "error", message: err.message };
    throw err;
  }

  // Bumping sessionVersion (inside changePassword) invalidates this
  // session's own token too, same as signOutEverywhere — send them to sign
  // in again with the new password rather than leave a now-stale session
  // active in the background.
  redirect("/login?passwordChanged=1");
}

const emailChangeSchema = z.object({
  newEmail: z.string().trim().email("Enter a valid email address."),
  currentPassword: z.string().min(1, "Enter your current password."),
});

export type EmailChangeState = ActionState & { devUrl?: string | null };

export async function requestEmailChangeAction(
  _prev: EmailChangeState,
  formData: FormData
): Promise<EmailChangeState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const parsed = emailChangeSchema.safeParse({
    newEmail: formData.get("newEmail"),
    currentPassword: formData.get("currentPassword"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your details." };

  try {
    const { url } = await requestEmailChange({
      userId: session.user.id,
      newEmail: parsed.data.newEmail,
      currentPassword: parsed.data.currentPassword,
    });

    return {
      status: "success",
      message: `We sent a confirmation link to ${parsed.data.newEmail}. Your login email stays the same until you click it.`,
      devUrl: url,
    };
  } catch (err) {
    if (err instanceof AccountError) return { status: "error", message: err.message };
    throw err;
  }
}
