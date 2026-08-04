import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260804163000_secure_admin_producer_application_reviews.sql", import.meta.url),
  "utf8",
);
const foundation = readFileSync(
  new URL("../supabase/migrations/20260731123000_auth_database_foundation.sql", import.meta.url),
  "utf8",
);
const action = readFileSync(
  new URL("../app/[locale]/admin/producer-applications/actions.ts", import.meta.url),
  "utf8",
);
const page = readFileSync(
  new URL("../app/[locale]/admin/producer-applications/page.tsx", import.meta.url),
  "utf8",
);

describe("admin producer review security contract", () => {
  it("redirects unauthenticated users and checks active admin access on the server", () => {
    expect(page).toContain("requireUser(locale, returnTo)");
    expect(page).toContain("hasActiveAdminProfile(supabase, user.id)");
    expect(page).toContain("accessDeniedTitle");
  });

  it("obtains the admin identity from the server session for every action", () => {
    expect(action).toContain("supabase.auth.getUser()");
    expect(action).toContain("hasActiveAdminProfile(supabase, data.user.id)");
    expect(action).not.toMatch(/adminId\s*:/);
    expect(action).not.toContain("service_role");
  });

  it("replaces broad admin writes with admin-only reads and a narrow RPC", () => {
    expect(migration).toContain("drop policy if exists producer_profiles_admin_all");
    expect(migration).toContain("on public.producer_profiles for select to authenticated");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(foundation).toContain("where id = (select auth.uid()) and role = 'admin' and status = 'active'");
  });

  it("accepts only approve or reject and updates pending rows atomically", () => {
    expect(migration).toContain("review_action not in ('approve', 'reject')");
    expect(migration).toContain("application.verification_status = 'pending'");
    expect(migration).toContain("then 'approved'::public.verification_status");
    expect(migration).toContain("else 'rejected'::public.verification_status");
    expect(migration).toContain("return affected_rows = 1");
  });

  it("sets approved_at correctly without changing profile role or status", () => {
    expect(migration).toContain("approved_at = case when review_action = 'approve' then now() else null end");
    expect(migration).not.toContain("update public.profiles");
    expect(migration).not.toContain("set role");
    expect(migration).not.toContain("set status");
  });

  it("prevents direct review-column writes and restricts RPC execution", () => {
    expect(migration).toContain("revoke update (profile_id, verification_status, approved_at, created_at, updated_at)");
    expect(migration).toContain("revoke all on function public.review_producer_application(uuid, text)");
    expect(migration).toContain("grant execute on function public.review_producer_application(uuid, text)");
    expect(migration).toContain("to authenticated");
  });
});
