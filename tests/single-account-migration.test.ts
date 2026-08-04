import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260804150000_single_account_marketplace.sql", import.meta.url),
  "utf8",
);
const seed = readFileSync(new URL("../supabase/seed_catalog.sql", import.meta.url), "utf8");

describe("single-account migration contract", () => {
  it("adds the user enum value without removing legacy labels", () => {
    expect(migration).toContain("add value if not exists 'user'");
    expect(migration).toContain("alter column role set default 'user'");
    expect(migration).toContain("where role in ('buyer'::public.profile_role, 'producer'::public.profile_role)");
    expect(migration).not.toContain("drop type public.profile_role");
  });

  it("creates every new auth profile as a standard user without a producer profile", () => {
    expect(migration).toContain("values (new.id, 'user'::public.profile_role, safe_name, safe_locale)");
    expect(migration).not.toContain("if safe_role = 'producer'");
  });

  it("allows only active non-admin accounts to submit pending applications", () => {
    expect(migration).toContain("p.role <> 'admin'");
    expect(migration).toContain("and verification_status = 'pending'");
    expect(migration).toContain("and approved_at is null");
  });

  it("grants product management from active approved seller data, not role", () => {
    expect(migration).toContain("pp.verification_status = 'approved'");
    expect(migration).toContain("p.status = 'active'");
    expect(migration).not.toContain("p.role = 'producer'");
    expect(migration).toContain("producer_id = (select auth.uid())");
  });

  it("keeps the catalog seed independent from a producer role", () => {
    expect(seed).toContain("'user'::public.profile_role");
    expect(seed).toContain("producer_profiles.verification_status = 'approved'");
    expect(seed).not.toContain("profiles.role = 'producer'");
    expect(seed).not.toContain("producer_role");
  });
});
