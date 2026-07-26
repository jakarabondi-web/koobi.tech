import { PrismaClient } from "@prisma/client";

import { resolveDatabaseUrl } from "./connection-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Passed explicitly rather than left to the schema's env("DATABASE_URL"), so
// a host that publishes the connection string under another name still works
// — Vercel's Neon integration creates POSTGRES_PRISMA_URL and marks it
// sensitive, so it can't be read out and copied by hand.
const datasourceUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
