#!/usr/bin/env node
/**
 * Runs `prisma migrate deploy` for the build.
 *
 * This wrapper exists for one reason: a Prisma schema that declares
 * `directUrl = env("DIRECT_URL")` refuses to load at all when that variable
 * is unset, and `env()` has no fallback syntax. On a host where nothing is
 * pooled, requiring a second copy of the same connection string is pure
 * friction — and the failure it produces ("Environment variable not found")
 * arrives at build time with no hint that the two URLs are usually
 * identical.
 *
 * So: if DIRECT_URL is absent we fall back to DATABASE_URL and say so
 * loudly. That is correct for any unpooled Postgres, and for a pooled one it
 * surfaces a clear warning plus whatever the pooler says, instead of an
 * error about an environment variable.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Locates the Prisma CLI without relying on PATH.
 *
 * `npm run` puts node_modules/.bin on PATH, but this script is also run
 * directly, and a bare "prisma" then fails with ENOENT. Resolving the
 * package's own entry point and invoking it with the current Node binary
 * works in both cases and on any platform.
 */
function prismaCommand() {
  try {
    const pkg = require.resolve("prisma/package.json");
    const { bin } = require(pkg);
    const relative = typeof bin === "string" ? bin : bin?.prisma;
    if (relative) {
      const entry = join(dirname(pkg), relative);
      if (existsSync(entry)) return { command: process.execPath, prefix: [entry] };
    }
  } catch {
    // Fall through to the PATH-based lookup below.
  }

  const local = join(root, "node_modules", ".bin", "prisma");
  if (existsSync(local)) return { command: local, prefix: [] };

  return { command: "prisma", prefix: [] };
}

const env = { ...process.env };

if (!env.DATABASE_URL) {
  console.error(
    "\n✗ DATABASE_URL is not set.\n" +
      "  The build applies migrations, so it needs a database.\n" +
      "  Set DATABASE_URL in your host's environment variables and redeploy.\n"
  );
  process.exit(1);
}

if (!env.DIRECT_URL) {
  env.DIRECT_URL = env.DATABASE_URL;
  console.warn(
    "\n⚠ DIRECT_URL is not set — falling back to DATABASE_URL for migrations.\n" +
      "  Fine if your database has no connection pooler.\n" +
      "  If it does (Neon, Supabase, PgBouncer), set DIRECT_URL to the direct\n" +
      "  or 'unpooled' connection string: migrations take a session-level\n" +
      "  advisory lock that a transaction-mode pooler cannot hold.\n"
  );
}

const { command, prefix } = prismaCommand();

const result = spawnSync(command, [...prefix, "migrate", "deploy"], {
  stdio: "inherit",
  env,
  cwd: root,
});

if (result.error) {
  console.error(`\n✗ Could not run the Prisma CLI: ${result.error.message}\n`);
  process.exit(1);
}

process.exit(result.status ?? 1);
