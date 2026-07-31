import { describe, expect, it } from "vitest";
import {
  profileUpdateSchema,
  protectedRouteRedirect,
  safeNextRedirect,
  sanitizeSignupRole,
  signupSchema,
} from "@/lib/auth";

describe("Supabase auth boundaries", () => {
  it("allows only buyer or producer signup roles", () => {
    expect(sanitizeSignupRole("buyer")).toBe("buyer");
    expect(sanitizeSignupRole("producer")).toBe("producer");
    expect(sanitizeSignupRole("admin")).toBe("buyer");
    expect(sanitizeSignupRole(undefined)).toBe("buyer");
  });

  it("validates signup metadata and matching passwords", () => {
    expect(signupSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "secure-password",
      confirmation: "secure-password",
      role: "producer",
      locale: "tr",
      termsAccepted: true,
    }).success).toBe(true);
    expect(signupSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "secure-password",
      confirmation: "different-password",
      role: "admin",
      locale: "tr",
      termsAccepted: true,
    }).success).toBe(false);
  });

  it("rejects external and cross-boundary next redirects", () => {
    expect(safeNextRedirect("/en/favorites?from=login", "tr")).toBe("/en/favorites?from=login");
    expect(safeNextRedirect("https://evil.example/path", "tr")).toBe("/tr/account");
    expect(safeNextRedirect("//evil.example/path", "en")).toBe("/en/account");
    expect(safeNextRedirect("/admin", "tr")).toBe("/tr/account");
  });

  it("protects account routes while preserving locale", () => {
    expect(protectedRouteRedirect(true, "tr", "/tr/account")).toBeNull();
    expect(protectedRouteRedirect(false, "en", "/en/favorites")).toBe(
      "/en/login?next=%2Fen%2Ffavorites",
    );
  });

  it("accepts safe profile updates and rejects privileged fields as input", () => {
    const result = profileUpdateSchema.safeParse({
      displayName: "FEMORIA User",
      locale: "en",
      city: "Ankara",
      district: "Çankaya",
      role: "admin",
      status: "active",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("role" in result.data).toBe(false);
      expect("status" in result.data).toBe(false);
    }
    expect(profileUpdateSchema.safeParse({
      displayName: "A",
      locale: "tr",
      city: "",
      district: "",
    }).success).toBe(false);
  });
});
