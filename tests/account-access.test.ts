import { describe, expect, it } from "vitest";
import {
  canApplyAsSeller,
  canManageOwnProducts,
  isActiveAdminProfile,
  isAdminProfile,
  isApprovedSeller,
  isStandardUser,
  type AccessProfile,
} from "@/lib/account-access";
import { translations } from "@/lib/i18n";

const activeUser: AccessProfile = { role: "user", status: "active" };
const approved = { verification_status: "approved" as const };
const pending = { verification_status: "pending" as const };
const rejected = { verification_status: "rejected" as const };

describe("single-account access model", () => {
  it("treats a standard account as a member that can use shopping areas", () => {
    expect(isStandardUser(activeUser)).toBe(true);
    expect(canApplyAsSeller(activeUser, null)).toBe(true);
  });

  it("allows only active approved sellers to manage products", () => {
    expect(canManageOwnProducts(activeUser, approved)).toBe(true);
    expect(canManageOwnProducts(activeUser, pending)).toBe(false);
    expect(canManageOwnProducts(activeUser, rejected)).toBe(false);
    expect(canManageOwnProducts({ ...activeUser, status: "suspended" }, approved)).toBe(false);
  });

  it("keeps admin as a separate authority", () => {
    const admin: AccessProfile = { role: "admin", status: "active" };
    expect(isAdminProfile(admin)).toBe(true);
    expect(isActiveAdminProfile(admin)).toBe(true);
    expect(isActiveAdminProfile({ ...admin, status: "suspended" })).toBe(false);
    expect(isActiveAdminProfile(activeUser)).toBe(false);
    expect(isStandardUser(admin)).toBe(false);
    expect(canApplyAsSeller(admin, null)).toBe(false);
    expect(canManageOwnProducts(admin, approved)).toBe(false);
  });

  it("treats legacy buyer and producer values as standard users", () => {
    const legacyProducer: AccessProfile = { role: "producer", status: "active" };
    expect(isStandardUser({ role: "buyer", status: "active" })).toBe(true);
    expect(isStandardUser(legacyProducer)).toBe(true);
    expect(canManageOwnProducts(legacyProducer, approved)).toBe(true);
  });

  it("does not grant seller access from a legacy producer role alone", () => {
    const legacyProducer: AccessProfile = { role: "producer", status: "active" };
    expect(isApprovedSeller(legacyProducer, pending)).toBe(false);
    expect(canManageOwnProducts(legacyProducer, null)).toBe(false);
  });

  it("grants seller access to a legacy buyer with an approved seller profile", () => {
    const legacyBuyer: AccessProfile = { role: "buyer", status: "active" };
    expect(isApprovedSeller(legacyBuyer, approved)).toBe(true);
    expect(canManageOwnProducts(legacyBuyer, approved)).toBe(true);
  });

  it("provides single-account copy in Turkish and English", () => {
    expect(translations.tr.registerText).toContain("Tek FEMORIA hesabıyla");
    expect(translations.en.registerText).toContain("one FEMORIA account");
    expect(translations.tr.accountRoleMember).toBe("FEMORIA üyesi");
    expect(translations.en.accountSellerApproved).toBe("Approved maker");
  });
});
