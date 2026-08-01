import type { GlobalRole } from "./roles";

/**
 * Fine-grained permission checks used by server actions and route handlers.
 * This is the single source of truth for "is this action allowed" — UI
 * conditionals are a convenience, not a security boundary.
 */

export type Action =
  | "project.create"
  | "project.edit"
  | "project.delete"
  | "task.review"
  | "task.adjudicate"
  | "trainer.approve"
  | "trainer.suspend"
  | "assignment.match"
  | "risk.resolve"
  | "payment.approve"
  | "payment.issue"
  | "dispute.resolve"
  | "support.assign"
  | "audit.view"
  | "org.manage_members"
  | "org.manage_billing";

const RULES: Record<Action, GlobalRole[]> = {
  "project.create": ["CLIENT_ADMIN", "OPERATIONS_MANAGER", "SUPER_ADMIN"],
  "project.edit": ["CLIENT_ADMIN", "OPERATIONS_MANAGER", "SUPER_ADMIN"],
  "project.delete": ["OPERATIONS_MANAGER", "SUPER_ADMIN"],
  "task.review": ["REVIEWER", "LEAD_REVIEWER", "SUPER_ADMIN"],
  "task.adjudicate": ["LEAD_REVIEWER", "QUALITY_MANAGER", "SUPER_ADMIN"],
  "trainer.approve": ["OPERATIONS_MANAGER", "SUPER_ADMIN"],
  "trainer.suspend": ["OPERATIONS_MANAGER", "SUPER_ADMIN"],
  "assignment.match": ["OPERATIONS_MANAGER", "SUPER_ADMIN"],
  "risk.resolve": ["QUALITY_MANAGER", "OPERATIONS_MANAGER", "SUPER_ADMIN"],
  "payment.approve": ["FINANCE_MANAGER", "SUPER_ADMIN"],
  "payment.issue": ["FINANCE_MANAGER", "SUPER_ADMIN"],
  "dispute.resolve": ["FINANCE_MANAGER", "QUALITY_MANAGER", "SUPER_ADMIN"],
  "support.assign": ["SUPPORT_AGENT", "SUPER_ADMIN"],
  "audit.view": ["QUALITY_MANAGER", "OPERATIONS_MANAGER", "SUPER_ADMIN"],
  "org.manage_members": ["CLIENT_ADMIN", "SUPER_ADMIN"],
  "org.manage_billing": ["CLIENT_ADMIN", "SUPER_ADMIN"],
};

export function can(roles: GlobalRole[], action: Action): boolean {
  const allowed = RULES[action];
  return roles.some((r) => allowed.includes(r));
}

export class ForbiddenError extends Error {
  constructor(action: Action) {
    super(`Not authorized to perform: ${action}`);
    this.name = "ForbiddenError";
  }
}

export function assertCan(roles: GlobalRole[], action: Action) {
  if (!can(roles, action)) throw new ForbiddenError(action);
}
