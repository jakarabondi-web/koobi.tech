/**
 * Resolves the Postgres connection strings from whatever the host called them.
 *
 * `DATABASE_URL` is the name Prisma documents, but managed-Postgres
 * integrations rarely set it. Vercel's Neon integration, for instance, creates
 * `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` and marks them
 * sensitive — so they cannot be read out of the dashboard and copied into a
 * variable named `DATABASE_URL` by hand.
 *
 * Reading the aliases directly is the difference between a deploy that works
 * on connection and one that needs someone to reverse-engineer a secret.
 */

/**
 * Pooled connection candidates, best first.
 *
 * `POSTGRES_PRISMA_URL` comes before `POSTGRES_URL` deliberately: the
 * integration builds it for Prisma specifically, with `pgbouncer=true` and a
 * connection timeout already appended.
 */
const POOLED_KEYS = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
] as const;

/** Direct/unpooled candidates, best first. */
const DIRECT_KEYS = [
  "DIRECT_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;

function firstSet(keys: readonly string[], env: NodeJS.ProcessEnv): string | undefined {
  for (const key of keys) {
    const value = env[key];
    if (value && value.trim() !== "") return value;
  }
  return undefined;
}

/** The URL the application should query through. */
export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return firstSet(POOLED_KEYS, env);
}

/**
 * The URL migrations should run through.
 *
 * Falls back to the pooled URL when no direct one is published. Migrations
 * take a session-level advisory lock that a transaction-mode pooler cannot
 * hold, so this is a last resort rather than an equivalent.
 */
export function resolveDirectUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return firstSet(DIRECT_KEYS, env) ?? resolveDatabaseUrl(env);
}

/** Which variable a value came from, for log messages that name the real source. */
export function databaseUrlSource(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return POOLED_KEYS.find((key) => env[key] && env[key]!.trim() !== "");
}

export function directUrlSource(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return DIRECT_KEYS.find((key) => env[key] && env[key]!.trim() !== "");
}
