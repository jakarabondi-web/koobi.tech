import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { bearerFrom, digestsMatch, hashApiKey, looksLikeApiKey } from "@/lib/api/keys";

/**
 * Authentication and tenant scoping for the versioned client API.
 *
 * This is the API-side counterpart of `services/tenant.ts`. The rule is the
 * same and it is the whole point of the module: the organization is resolved
 * from the *key*, never from anything the caller sends. A request body or
 * query string containing an organizationId is ignored — a key can only ever
 * see the tenant it was issued to.
 */

export type ApiContext = {
  keyId: string;
  organizationId: string;
  organizationName: string;
  canWrite: boolean;
};

export type ApiFailure = { response: NextResponse };

export function isFailure<T extends object>(value: T | ApiFailure): value is ApiFailure {
  return "response" in value;
}

export function apiError(status: number, code: string, message: string, extra?: object) {
  return NextResponse.json(
    { error: { code, message, ...extra } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export function apiOk(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Resolves an API key into a tenant context.
 *
 * Every rejection returns the same shape and a deliberately unspecific
 * message: a caller must not be able to tell a revoked key from an expired
 * one from a key that never existed.
 */
export async function authenticateApiRequest(
  request: Request,
  options: { write?: boolean } = {}
): Promise<ApiContext | ApiFailure> {
  const token = bearerFrom(request.headers.get("authorization"));

  if (!token || !looksLikeApiKey(token)) {
    return {
      response: apiError(401, "unauthorized", "Provide a valid API key as a bearer token.", {
        docs: "/client/api",
      }),
    };
  }

  const digest = hashApiKey(token);
  const key = await prisma.apiKey.findUnique({
    where: { hashedKey: digest },
    include: { organization: true },
  });

  const now = new Date();
  const usable =
    key !== null &&
    digestsMatch(key.hashedKey, digest) &&
    key.revokedAt === null &&
    (key.expiresAt === null || key.expiresAt > now) &&
    key.organizationId !== null &&
    key.organization !== null;

  if (!usable || !key || !key.organization || !key.organizationId) {
    return { response: apiError(401, "unauthorized", "Provide a valid API key as a bearer token.") };
  }

  const canWrite = key.scopes.includes("WRITE");
  if (options.write && !canWrite) {
    return {
      response: apiError(403, "insufficient_scope", "This key is read-only. Issue a key with the write scope."),
    };
  }

  // Recorded so a client can spot a leaked key that is still being used.
  // Fire-and-forget: a failed bookkeeping write must not fail the request.
  void prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: now } })
    .catch(() => undefined);

  return {
    keyId: key.id,
    organizationId: key.organizationId,
    organizationName: key.organization.name,
    canWrite,
  };
}

/** Clamps pagination so a caller can't ask for the whole table. */
export function pagination(url: URL, defaultLimit = 50, maxLimit = 200) {
  const rawLimit = Number(url.searchParams.get("limit"));
  const rawOffset = Number(url.searchParams.get("offset"));

  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), maxLimit) : defaultLimit;
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;

  return { limit, offset };
}

/** Reads and size-limits a JSON body, returning a typed failure on bad input. */
export async function readJson(request: Request): Promise<{ data: unknown } | ApiFailure> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > 2_000_000) {
    return { response: apiError(413, "payload_too_large", "Request bodies are limited to 2 MB. Use fewer items per call.") };
  }

  try {
    return { data: await request.json() };
  } catch {
    return { response: apiError(400, "invalid_json", "Request body must be valid JSON.") };
  }
}

/** Confirms a project belongs to the key's organization before it is touched. */
export async function projectForKey(projectId: string, ctx: ApiContext) {
  return prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId },
  });
}

export async function logApiAction(ctx: ApiContext, action: string, entityId: string, metadata?: object) {
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      action,
      entityType: "ApiKey",
      entityId,
      metadata: { ...metadata, viaApiKey: ctx.keyId },
    },
  });
}
