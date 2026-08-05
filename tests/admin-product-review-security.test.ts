import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../supabase/migrations/20260804200000_secure_admin_product_reviews.sql", import.meta.url), "utf8");
const action = readFileSync(new URL("../app/[locale]/admin/products/actions.ts", import.meta.url), "utf8");
const listPage = readFileSync(new URL("../app/[locale]/admin/products/page.tsx", import.meta.url), "utf8");
const detailPage = readFileSync(new URL("../app/[locale]/admin/products/[id]/page.tsx", import.meta.url), "utf8");
const reviewPanel = readFileSync(new URL("../components/AdminProductReviewPanel.tsx", import.meta.url), "utf8");
const sellerList = readFileSync(new URL("../app/[locale]/seller/products/page.tsx", import.meta.url), "utf8");
const sellerDetail = readFileSync(new URL("../app/[locale]/seller/products/[id]/edit/page.tsx", import.meta.url), "utf8");
const catalog = readFileSync(new URL("../lib/catalog.ts", import.meta.url), "utf8");

function rpc(name: string) {
  const start = migration.indexOf(`create or replace function public.${name}`);
  const end = migration.indexOf("\n$$;", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

describe("admin product review security contract", () => {
  it("adds review audit columns with a profile foreign key", () => {
    expect(migration).toContain("add column rejection_reason text null");
    expect(migration).toContain("add column reviewed_at timestamptz null");
    expect(migration).toContain("add column reviewed_by uuid null references public.profiles(id) on delete set null");
  });

  it("allows admin reads without restoring broad direct admin writes", () => {
    expect(migration).toContain("drop policy if exists products_admin_all");
    expect(migration).toContain("create policy products_admin_read");
    expect(migration).toContain("create policy product_images_admin_read");
    expect(migration).toContain("revoke update (producer_id, status, rejection_reason, reviewed_at, reviewed_by, created_at, updated_at)");
    expect(migration).not.toContain("grant update on public.products");
  });

  it("keeps administrator authority separate from seller and public catalog access", () => {
    expect(migration).toContain("create or replace function private.is_approved_seller");
    expect(migration).toContain("profile.role <> 'admin'");
    expect(migration).toContain("producer.role <> 'admin'");
    expect(migration).toContain("create policy products_read_public_approved");
  });

  it("checks an active admin inside the fixed-search-path RPC", () => {
    const reviewRpc = rpc("review_product");
    expect(reviewRpc).toContain("security definer");
    expect(reviewRpc).toContain("set search_path = ''");
    expect(reviewRpc).toContain("(select auth.uid()) is null");
    expect(reviewRpc).toContain("profile.role = 'admin'");
    expect(reviewRpc).toContain("profile.status = 'active'");
    expect(reviewRpc).toContain("raise insufficient_privilege");
  });

  it("locks and reviews pending products once only", () => {
    const reviewRpc = rpc("review_product");
    expect(reviewRpc).toContain("product.status = 'pending'");
    expect(reviewRpc.indexOf("for update;")).toBeLessThan(reviewRpc.indexOf("update public.products"));
    expect(reviewRpc).toContain("and product.status = 'pending'");
    expect(reviewRpc).toContain("return affected_rows = 1");
  });

  it("validates action, product id, rejection length, and audit identity", () => {
    const reviewRpc = rpc("review_product");
    expect(reviewRpc).toContain("target_product_id is null");
    expect(reviewRpc).toContain("review_action not in ('approve', 'reject')");
    expect(reviewRpc).toContain("char_length(safe_rejection_reason) not between 10 and 1000");
    expect(reviewRpc).toContain("rejection_reason = case when review_action = 'reject'");
    expect(reviewRpc).toContain("reviewed_at = now()");
    expect(reviewRpc).toContain("reviewed_by = (select auth.uid())");
  });

  it("revalidates active category, seller, product fields, and a real Storage object before approval", () => {
    const reviewRpc = rpc("review_product");
    expect(reviewRpc).toContain("category.id = locked_product.category_id and category.active");
    expect(reviewRpc).toContain("producer.status = 'active'");
    expect(reviewRpc).toContain("seller.verification_status = 'approved'");
    expect(reviewRpc).toContain("join storage.objects stored_object");
    expect(reviewRpc).toContain("stored_object.bucket_id = 'product-images'");
    expect(reviewRpc).toContain("stored_object.name = image.storage_path");
    expect(reviewRpc).toContain("stored_object.owner_id = locked_product.producer_id::text");
    expect(reviewRpc).toContain("for key share of stored_object");
  });

  it("clears old rejection audit when the seller resubmits", () => {
    const submitRpc = rpc("submit_product_for_review");
    expect(submitRpc).toContain("status = 'pending'");
    expect(submitRpc).toContain("rejection_reason = null");
    expect(submitRpc).toContain("reviewed_at = null");
    expect(submitRpc).toContain("reviewed_by = null");
  });

  it("restricts function execution and normalizes the server action boundary", () => {
    expect(migration).toContain("revoke all on function public.review_product(uuid, text, text)");
    expect(migration).toContain("grant execute on function public.review_product(uuid, text, text)");
    expect(action).toContain("adminProductReviewInputSchema.safeParse(input)");
    expect(action).toContain("hasActiveAdminProfile");
    expect(action).not.toMatch(/status\s*:\s*parsed\.data/);
    expect(action).not.toContain("reviewed_by:");
    expect(action).not.toContain("producer_id:");
  });

  it("protects list and detail data on the server before querying products", () => {
    for (const page of [listPage, detailPage]) {
      expect(page).toContain("requireUser(locale");
      expect(page).toContain("hasActiveAdminProfile");
      expect(page.indexOf("hasActiveAdminProfile")).toBeLessThan(page.indexOf("listAdminProducts") > -1 ? page.lastIndexOf("listAdminProducts") : page.lastIndexOf("getAdminProduct"));
      expect(page).toContain("403");
    }
  });

  it("prevents client double review and hides actions for reviewed products", () => {
    expect(reviewPanel).toContain("if (status !== \"pending\")");
    expect(reviewPanel).toContain("if (!selection || pending");
    expect(reviewPanel).toContain("disabled={pending");
    expect(reviewPanel).toContain("router.refresh()");
  });

  it("shows rejection reasons to sellers and keeps the public catalog approved-only", () => {
    expect(sellerList).toContain("product.rejection_reason");
    expect(sellerDetail).toContain("product.rejection_reason");
    expect(catalog.match(/\.eq\("status", "approved"\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(action).toContain("revalidatePath(`/${locale}/products`)");
    expect(action).toContain("revalidatePath(`/${locale}/seller/products`)");
  });
});
