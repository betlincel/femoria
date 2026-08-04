import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../supabase/migrations/20260804180000_secure_seller_product_management.sql", import.meta.url), "utf8");
const foundationMigration = readFileSync(new URL("../supabase/migrations/20260731123000_auth_database_foundation.sql", import.meta.url), "utf8");
const actions = readFileSync(new URL("../app/[locale]/seller/products/actions.ts", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../app/[locale]/seller/page.tsx", import.meta.url), "utf8");
const editPage = readFileSync(new URL("../app/[locale]/seller/products/[id]/edit/page.tsx", import.meta.url), "utf8");

function rpc(name: string) {
  const start = migration.indexOf(`create or replace function public.${name}`);
  const end = migration.indexOf("\n$$;", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

describe("seller product and Storage security contract", () => {
  it("protects seller routes on the server", () => {
    expect(dashboard).toContain("requireApprovedSeller(locale");
    expect(editPage).toContain("requireApprovedSeller(locale");
    expect(editPage).toContain("access.user.id");
  });

  it("derives seller and producer ownership from auth.uid", () => {
    expect(migration).toContain("profile.status = 'active'");
    expect(migration).toContain("seller.verification_status = 'approved'");
    expect(migration).toContain("producer_id = (select auth.uid())");
    expect(actions).not.toMatch(/producer[_A-Z]?id\s*:\s*formData/i);
  });

  it("uses narrow security-definer RPCs with fixed search paths and grants", () => {
    expect(migration.match(/security definer/g)?.length).toBeGreaterThanOrEqual(8);
    expect(migration.match(/set search_path = ''/g)?.length).toBeGreaterThanOrEqual(8);
    expect(migration).toContain("revoke all privileges on public.products from authenticated");
    expect(migration).toContain("revoke all privileges on public.product_images from authenticated");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to authenticated");
  });

  it("creates drafts and validates active categories and duplicate slugs", () => {
    expect(migration).toContain("'draft', input_stock_mode");
    expect(migration).toContain("category.id = input_category_id and category.active");
    expect(actions).toContain("error?.code === \"23505\"");
  });

  it("edits only owned draft/rejected products and returns rejected edits to draft", () => {
    expect(migration).toContain("product.status in ('draft', 'rejected')");
    expect(migration).toContain("status = 'draft'");
    expect(migration).toContain("product.producer_id = (select auth.uid())");
  });

  it("submits only complete products with an active category and a real owned Storage object", () => {
    const submitRpc = rpc("submit_product_for_review");

    expect(submitRpc).toContain("status = 'pending'");
    expect(submitRpc).toContain("join storage.objects stored_object");
    expect(submitRpc).toContain("stored_object.bucket_id = 'product-images'");
    expect(submitRpc).toContain("stored_object.name = image.storage_path");
    expect(submitRpc).toContain("stored_object.owner_id = (select auth.uid())::text");
    const storageLock = submitRpc.indexOf("for key share of stored_object");
    expect(storageLock).toBeGreaterThan(-1);
    expect(submitRpc.indexOf("if not found then return false", storageLock)).toBeGreaterThan(storageLock);
    expect(submitRpc).toContain("category.id = product.category_id and category.active");
    expect(submitRpc).toContain("product.status in ('draft', 'rejected')");
  });

  it("keeps hard product deletion disabled", () => {
    expect(migration).not.toContain("create policy products_delete_own");
    expect(migration).toContain("Hard delete remains disabled");
    expect(actions).not.toContain("deleteSellerProduct(");
  });

  it("enforces the seller/user/product/UUID Storage path and file restrictions", () => {
    expect(migration).toContain("bucket_id = 'product-images'");
    expect(migration).toContain("(storage.foldername(name))[1] = 'seller'");
    expect(migration).toContain("(storage.foldername(name))[2] = (select auth.uid())::text");
    expect(migration).toContain("array_length(storage.foldername(name), 1) = 3");
    expect(migration).toContain("product.id::text = (storage.foldername(name))[3]");
    expect(migration).toContain("file_size_limit = 5242880");
    expect(migration).not.toContain("image/svg+xml");
  });

  it("limits images, protects alt/order updates, and locks pending/approved products", () => {
    expect(migration).toContain("if image_count >= 6");
    expect(migration).toContain("cardinality(ordered_image_ids) not between 1 and 6");
    expect(migration).toContain("sort_order = ordering.position - 1");
    expect(migration).toContain("input_alt_tr");
    expect(migration).toContain("product.status in ('draft', 'rejected')");
  });

  it("does not create an image row unless the exact owned Storage object exists", () => {
    const addImageRpc = rpc("add_seller_product_image");
    const pathValidation = addImageRpc.indexOf("if input_storage_path !~");
    const objectLookup = addImageRpc.indexOf("from storage.objects stored_object");
    const imageInsert = addImageRpc.indexOf("insert into public.product_images");

    expect(pathValidation).toBeGreaterThan(-1);
    expect(objectLookup).toBeGreaterThan(pathValidation);
    expect(imageInsert).toBeGreaterThan(objectLookup);
    expect(addImageRpc).toContain("stored_object.bucket_id = 'product-images'");
    expect(addImageRpc).toContain("stored_object.name = input_storage_path");
    expect(addImageRpc).toContain("stored_object.owner_id = (select auth.uid())::text");
    expect(addImageRpc.slice(objectLookup, imageInsert)).toContain("if not found then return null");
  });

  it("rejects regex-valid fake paths because exact Storage metadata is required", () => {
    const addImageRpc = rpc("add_seller_product_image");

    expect(addImageRpc).toContain("input_storage_path !~");
    expect(addImageRpc).toContain("stored_object.name = input_storage_path");
    expect(addImageRpc).toContain("for key share");
  });

  it("serializes submit and image mutations with the same product row lock", () => {
    const submitRpc = rpc("submit_product_for_review");
    const addImageRpc = rpc("add_seller_product_image");
    const updateAltRpc = rpc("update_seller_product_image_alt");
    const deleteImageRpc = rpc("delete_seller_product_image");
    const reorderRpc = rpc("reorder_seller_product_images");

    expect(submitRpc.indexOf("for update;")).toBeLessThan(submitRpc.indexOf("status = 'pending'"));
    expect(addImageRpc.indexOf("for update;")).toBeLessThan(addImageRpc.indexOf("insert into public.product_images"));
    expect(updateAltRpc.indexOf("for update of product;")).toBeLessThan(updateAltRpc.indexOf("update public.product_images"));
    expect(deleteImageRpc.indexOf("for update of product;")).toBeLessThan(deleteImageRpc.indexOf("delete from public.product_images"));
    expect(reorderRpc.indexOf("for update;")).toBeLessThan(reorderRpc.indexOf("update public.product_images"));
    expect(deleteImageRpc).toContain("product.status in ('draft', 'rejected')");
    expect(submitRpc).toContain("for key share of stored_object");
  });

  it("rejects null, empty, oversized, duplicate, incomplete, and foreign reorder arrays", () => {
    const reorderRpc = rpc("reorder_seller_product_images");

    expect(reorderRpc).toContain("ordered_image_ids is null");
    expect(reorderRpc).toContain("cardinality(ordered_image_ids) not between 1 and 6");
    expect(reorderRpc).toContain("count(distinct ordered.id)");
    expect(reorderRpc).toContain("image_count <> cardinality(ordered_image_ids)");
    expect(reorderRpc).toContain("image.id = ordered.id and image.product_id = target_product_id");
  });

  it("uses a collision-free temporary range before assigning final image positions", () => {
    const reorderRpc = rpc("reorder_seller_product_images");
    const temporaryUpdate = reorderRpc.indexOf("set sort_order = (temporary_sort_base + ordering.position)::integer");
    const finalUpdate = reorderRpc.indexOf("set sort_order = ordering.position - 1", temporaryUpdate + 1);

    expect(reorderRpc).toContain("greatest(coalesce(max(sort_order), -1)::bigint + 1000, 1000::bigint)");
    expect(temporaryUpdate).toBeGreaterThan(-1);
    expect(finalUpdate).toBeGreaterThan(temporaryUpdate);
  });

  it("records the existing sort-order index and absence of a sort-order unique constraint", () => {
    expect(foundationMigration).toContain("unique (product_id, storage_path)");
    expect(foundationMigration).toContain("create index product_images_product_id_idx on public.product_images(product_id, sort_order)");
    expect(foundationMigration).not.toMatch(/unique\s*(?:index[^;]*|\()\s*product_id\s*,\s*sort_order/i);
  });

  it("uploads Storage first and cleans it if the image record cannot be created", () => {
    const uploadIndex = actions.indexOf(".upload(storagePath");
    const imageRpcIndex = actions.indexOf("\"add_seller_product_image\"");
    const cleanupIndex = actions.indexOf(".remove([storagePath])");
    expect(uploadIndex).toBeGreaterThan(-1);
    expect(imageRpcIndex).toBeGreaterThan(uploadIndex);
    expect(cleanupIndex).toBeGreaterThan(imageRpcIndex);
  });
});
