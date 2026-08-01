import { describe, expect, it } from "vitest";

import { assertCan, can, ForbiddenError } from "@/lib/permissions/can";

describe("assignment.match", () => {
  it("permits OPERATIONS_MANAGER and SUPER_ADMIN", () => {
    expect(can(["OPERATIONS_MANAGER"], "assignment.match")).toBe(true);
    expect(can(["SUPER_ADMIN"], "assignment.match")).toBe(true);
  });

  it("refuses roles that aren't operations or super admin", () => {
    expect(can(["SUPPORT_AGENT"], "assignment.match")).toBe(false);
    expect(() => assertCan(["QUALITY_MANAGER"], "assignment.match")).toThrow(ForbiddenError);
  });
});

describe("risk.resolve", () => {
  it("permits QUALITY_MANAGER, OPERATIONS_MANAGER, and SUPER_ADMIN", () => {
    expect(can(["QUALITY_MANAGER"], "risk.resolve")).toBe(true);
    expect(can(["OPERATIONS_MANAGER"], "risk.resolve")).toBe(true);
    expect(can(["SUPER_ADMIN"], "risk.resolve")).toBe(true);
  });

  it("refuses roles outside that set", () => {
    expect(can(["FINANCE_MANAGER"], "risk.resolve")).toBe(false);
    expect(() => assertCan(["SUPPORT_AGENT"], "risk.resolve")).toThrow(ForbiddenError);
  });
});
