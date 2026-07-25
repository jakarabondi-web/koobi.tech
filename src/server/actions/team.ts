"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OrgMemberRole } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { requireTenant, TenantError } from "@/server/services/tenant";
import { sendEmail } from "@/lib/email/client";
import { brand } from "@/config/brand";
import { appUrl } from "@/lib/app-url";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const schema = z.object({
  email: z.string().email("Enter a valid work email."),
  role: z.enum(["MEMBER", "ADMIN", "BILLING_OWNER"]),
});

export async function inviteMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const parsed = schema.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  let tenant;
  try {
    tenant = await requireTenant();
  } catch (err) {
    if (err instanceof TenantError) return { status: "error", message: err.message };
    throw err;
  }

  // Membership role, not global RBAC role, decides who can invite.
  if (!tenant.isOrgAdmin) {
    return { status: "error", message: "Only organization admins can invite people." };
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // We don't create accounts on someone's behalf — they register, then the
    // invite links up. Reported as success either way so this can't be used
    // to probe which emails have accounts.
    await sendEmail({
      to: email,
      subject: `You've been invited to ${tenant.organizationName} on ${brand.name}`,
      html: `<p>${session.user.name} invited you to join <strong>${tenant.organizationName}</strong> on ${brand.name}.</p>
             <p><a href="${appUrl()}/register?role=client">Create your account</a> with this email address to accept.</p>`,
    });
    return { status: "success", message: "Invitation sent." };
  }

  const existing = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: tenant.organizationId, userId: user.id } },
  });
  if (existing) return { status: "error", message: "That person is already on your team." };

  await prisma.$transaction([
    prisma.organizationMember.create({
      data: {
        organizationId: tenant.organizationId,
        userId: user.id,
        role: parsed.data.role as OrgMemberRole,
        joinedAt: new Date(),
      },
    }),
    prisma.notification.create({
      data: {
        userId: user.id,
        type: "org_invite",
        title: `You've been added to ${tenant.organizationName}`,
        body: "You now have access to this organization's projects.",
        link: "/client/dashboard",
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        organizationId: tenant.organizationId,
        action: "org.member_invited",
        entityType: "OrganizationMember",
        entityId: user.id,
        metadata: { role: parsed.data.role },
      },
    }),
  ]);

  await sendEmail({
    to: email,
    subject: `You've been added to ${tenant.organizationName} on ${brand.name}`,
    html: `<p>${session.user.name} added you to <strong>${tenant.organizationName}</strong>.</p>
           <p><a href="${appUrl()}/client/dashboard">Open the client portal</a></p>`,
  });

  revalidatePath("/client/team");
  return { status: "success", message: "Invitation sent." };
}
