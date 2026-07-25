/**
 * Central role → application-surface mapping.
 * Server-side authorization must always check this module (or the
 * `can()` helper in `./can`), never rely on hiding UI elements alone.
 */

export const GLOBAL_ROLES = [
  "TRAINER",
  "EXPERT",
  "REVIEWER",
  "LEAD_REVIEWER",
  "CLIENT_MEMBER",
  "CLIENT_ADMIN",
  "OPERATIONS_MANAGER",
  "QUALITY_MANAGER",
  "FINANCE_MANAGER",
  "SUPPORT_AGENT",
  "SUPER_ADMIN",
] as const;

export type GlobalRole = (typeof GLOBAL_ROLES)[number];

export type AppSurface = "trainer" | "client" | "admin";

export const TRAINER_ROLES: GlobalRole[] = ["TRAINER", "EXPERT", "REVIEWER", "LEAD_REVIEWER"];
export const CLIENT_ROLES: GlobalRole[] = ["CLIENT_MEMBER", "CLIENT_ADMIN"];
export const ADMIN_ROLES: GlobalRole[] = [
  "OPERATIONS_MANAGER",
  "QUALITY_MANAGER",
  "FINANCE_MANAGER",
  "SUPPORT_AGENT",
  "SUPER_ADMIN",
];

export function surfaceForRoles(roles: GlobalRole[]): AppSurface | null {
  if (roles.some((r) => ADMIN_ROLES.includes(r))) return "admin";
  if (roles.some((r) => CLIENT_ROLES.includes(r))) return "client";
  if (roles.some((r) => TRAINER_ROLES.includes(r))) return "trainer";
  return null;
}

export function canAccessSurface(roles: GlobalRole[], surface: AppSurface): boolean {
  if (surface === "trainer") return roles.some((r) => TRAINER_ROLES.includes(r));
  if (surface === "client") return roles.some((r) => CLIENT_ROLES.includes(r));
  if (surface === "admin") return roles.some((r) => ADMIN_ROLES.includes(r));
  return false;
}

export function isReviewer(roles: GlobalRole[]): boolean {
  return roles.includes("REVIEWER") || roles.includes("LEAD_REVIEWER");
}

export function isClientAdmin(roles: GlobalRole[]): boolean {
  return roles.includes("CLIENT_ADMIN");
}

export function isSuperAdmin(roles: GlobalRole[]): boolean {
  return roles.includes("SUPER_ADMIN");
}
