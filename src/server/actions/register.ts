"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import type { GlobalRole } from "@/lib/permissions/roles";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["TRAINER", "CLIENT_ADMIN"]),
});

export type RegisterState = {
  status: "idle" | "success" | "error";
  errors?: Partial<Record<keyof z.infer<typeof registerSchema>, string>>;
  formError?: string;
};

export async function registerUser(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    const errors: RegisterState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof registerSchema>;
      errors[key] = issue.message;
    }
    return { status: "error", errors };
  }

  const { firstName, lastName, email, password, role } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { status: "error", formError: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const roleRow = await prisma.role.upsert({
    where: { key: role as GlobalRole },
    update: {},
    create: { key: role as GlobalRole, name: role },
  });

  await prisma.user.create({
    data: {
      email: normalizedEmail,
      firstName,
      lastName,
      passwordHash,
      status: "ACTIVE",
      roles: { create: { roleId: roleRow.id } },
      ...(role === "TRAINER" ? { trainerProfile: { create: {} } } : {}),
      consentRecords: { create: { type: "terms_of_service", version: "v1" } },
    },
  });

  return { status: "success" };
}
