"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export type ActionState = { status: "idle" | "error"; message?: string };

const schema = z.object({
  name: z.string().min(2, "Enter your company name."),
  website: z.string().url("Enter a valid URL.").or(z.literal("")).optional(),
  industry: z.string().min(1, "Choose what your organization does."),
  useCase: z.string().min(20, "Tell us a bit more about your use case."),
  contactName: z.string().min(2, "Enter a contact name."),
  companySize: z.string().min(1),
  estimatedVolume: z.string().min(1),
});

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export async function createOrganization(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const parsed = schema.safeParse({
    name: formData.get("name"),
    website: formData.get("website") ?? "",
    industry: formData.get("industry"),
    useCase: formData.get("useCase"),
    contactName: formData.get("contactName"),
    companySize: formData.get("companySize"),
    estimatedVolume: formData.get("estimatedVolume"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const existing = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
  });
  if (existing) redirect("/client/dashboard");

  const d = parsed.data;

  // Slugs are globally unique; suffix on collision rather than failing.
  const base = slugify(d.name) || "organization";
  let slug = base;
  for (let i = 2; await prisma.organization.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }

  const org = await prisma.organization.create({
    data: {
      name: d.name,
      slug,
      website: d.website || null,
      industry: d.industry,
      useCase: d.useCase,
      // New organizations start in TRIAL — an operations manager promotes
      // them to ACTIVE after the commercial conversation.
      status: "TRIAL",
      members: {
        create: { userId: session.user.id, role: "ADMIN", joinedAt: new Date() },
      },
      clientProfile: {
        create: {
          contactName: d.contactName,
          companySize: d.companySize,
          estimatedVolume: d.estimatedVolume,
          onboardingStep: 11,
        },
      },
      billingAccount: {
        create: { billingEmail: session.user.email! },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      organizationId: org.id,
      action: "org.created",
      entityType: "Organization",
      entityId: org.id,
      metadata: { name: d.name },
    },
  });

  redirect("/client/dashboard");
}
