"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import {
  checkDomainToken,
  discoverOidc,
  generateDomainToken,
  isPublicEmailDomain,
  isValidDomain,
  normalizeDomain,
} from "@/lib/auth/sso";
import { requireTenant, TenantError } from "@/server/services/tenant";

export type SsoState = { status: "idle" | "success" | "error"; message?: string };

async function adminTenant() {
  const tenant = await requireTenant();
  if (!tenant.isOrgAdmin) throw new TenantError("Only organization admins can change SSO settings.");
  return tenant;
}

const configSchema = z.object({
  domain: z.string().min(4).max(253),
  issuerUrl: z.string().url("Enter the issuer URL, e.g. https://acme.okta.com"),
  clientId: z.string().min(1, "Enter the client ID from your identity provider.").max(200),
  providerName: z.string().max(40).optional(),
});

/** Saves the OIDC configuration. Changing the domain resets its verification. */
export async function saveSsoConfig(_prev: SsoState, formData: FormData): Promise<SsoState> {
  let tenant;
  try {
    tenant = await adminTenant();
  } catch (err) {
    if (err instanceof TenantError) return { status: "error", message: err.message };
    throw err;
  }

  const parsed = configSchema.safeParse({
    domain: formData.get("domain"),
    issuerUrl: formData.get("issuerUrl"),
    clientId: formData.get("clientId"),
    providerName: formData.get("providerName") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const domain = normalizeDomain(parsed.data.domain);

  if (!isValidDomain(domain)) {
    return { status: "error", message: "That doesn't look like a domain. Enter something like acme.com." };
  }

  // A tenant claiming gmail.com would capture sign-ins for everyone who uses
  // it, so shared consumer domains can never be bound to an organization.
  if (isPublicEmailDomain(domain)) {
    return {
      status: "error",
      message: "Public email domains can't be used for SSO. Use a domain your organization controls.",
    };
  }

  const clash = await prisma.organization.findFirst({
    where: { ssoDomain: domain, id: { not: tenant.organizationId } },
  });
  if (clash) {
    // Deliberately does not name the other organization.
    return { status: "error", message: "That domain is already claimed. Contact support if it belongs to you." };
  }

  // Confirm the issuer really is an OIDC provider before saving, so a typo
  // surfaces here rather than at someone's first sign-in attempt.
  const discovery = await discoverOidc(parsed.data.issuerUrl);
  if ("error" in discovery) {
    return { status: "error", message: discovery.error };
  }

  const current = await prisma.organization.findUniqueOrThrow({
    where: { id: tenant.organizationId },
    select: { ssoDomain: true, ssoDomainToken: true, ssoDomainVerifiedAt: true },
  });

  const domainChanged = current.ssoDomain !== domain;

  await prisma.organization.update({
    where: { id: tenant.organizationId },
    data: {
      ssoDomain: domain,
      ssoIssuerUrl: parsed.data.issuerUrl,
      ssoClientId: parsed.data.clientId,
      ssoProviderName: parsed.data.providerName || null,
      // A new domain is unverified until its own DNS record is found, and
      // enforcement drops with it — otherwise switching domains would lock
      // everyone out.
      ...(domainChanged
        ? {
            ssoDomainVerifiedAt: null,
            ssoDomainToken: generateDomainToken(),
            ssoEnforced: false,
          }
        : {}),
      ...(current.ssoDomainToken ? {} : { ssoDomainToken: generateDomainToken() }),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "sso.config_saved",
      entityType: "Organization",
      entityId: tenant.organizationId,
      metadata: { domain, issuer: discovery.issuer, domainChanged },
    },
  });

  revalidatePath("/client/security");
  return {
    status: "success",
    message: domainChanged
      ? "Saved. Add the DNS record below, then verify the domain."
      : "SSO settings saved.",
  };
}

/** Performs the DNS lookup and marks the domain verified when it matches. */
export async function verifySsoDomain(_prev: SsoState, _formData: FormData): Promise<SsoState> {
  let tenant;
  try {
    tenant = await adminTenant();
  } catch (err) {
    if (err instanceof TenantError) return { status: "error", message: err.message };
    throw err;
  }

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: tenant.organizationId },
    select: { ssoDomain: true, ssoDomainToken: true },
  });

  if (!org.ssoDomain || !org.ssoDomainToken) {
    return { status: "error", message: "Save a domain first." };
  }

  const result = await checkDomainToken(org.ssoDomain, org.ssoDomainToken);
  if (!result.verified) {
    return {
      status: "error",
      message: result.found.length
        ? `${result.reason} Found: ${result.found.join(", ")}`
        : result.reason,
    };
  }

  await prisma.organization.update({
    where: { id: tenant.organizationId },
    data: { ssoDomainVerifiedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "sso.domain_verified",
      entityType: "Organization",
      entityId: tenant.organizationId,
      metadata: { domain: org.ssoDomain },
    },
  });

  revalidatePath("/client/security");
  return { status: "success", message: `${org.ssoDomain} verified. You can now enable SSO sign-in.` };
}

/** Turns enforcement on or off. Enforcement requires a verified domain. */
export async function setSsoEnforcement(_prev: SsoState, formData: FormData): Promise<SsoState> {
  let tenant;
  try {
    tenant = await adminTenant();
  } catch (err) {
    if (err instanceof TenantError) return { status: "error", message: err.message };
    throw err;
  }

  const enforce = formData.get("enforce") === "true";

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: tenant.organizationId },
    select: { ssoDomain: true, ssoDomainVerifiedAt: true, ssoIssuerUrl: true, ssoClientId: true },
  });

  if (enforce) {
    if (!org.ssoDomainVerifiedAt || !org.ssoDomain) {
      return { status: "error", message: "Verify your domain before enforcing SSO." };
    }
    if (!org.ssoIssuerUrl || !org.ssoClientId) {
      return { status: "error", message: "Finish the OIDC configuration before enforcing SSO." };
    }
  }

  await prisma.organization.update({
    where: { id: tenant.organizationId },
    data: { ssoEnforced: enforce },
  });

  await prisma.auditLog.create({
    data: {
      actorId: tenant.userId,
      organizationId: tenant.organizationId,
      action: enforce ? "sso.enforcement_enabled" : "sso.enforcement_disabled",
      entityType: "Organization",
      entityId: tenant.organizationId,
      metadata: { domain: org.ssoDomain },
    },
  });

  revalidatePath("/client/security");
  return {
    status: "success",
    message: enforce
      ? `Password sign-in is now blocked for @${org.ssoDomain} accounts.`
      : "Enforcement turned off. Password sign-in works again.",
  };
}
