import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260806120000_stabilize_order_privacy_catalog.sql",
    import.meta.url,
  ),
  "utf8",
);
const commerceServer = readFileSync(
  new URL("../lib/supabase/commerce.ts", import.meta.url),
  "utf8",
);

describe("pre-payment stabilization SQL contract", () => {
  it("adds the exact valid order/payment state groups as a NOT VALID constraint", () => {
    expect(migration).toContain("orders_order_payment_state_check");
    expect(migration).toContain(
      "order_status = 'awaiting_payment' and payment_status in ('unpaid', 'pending', 'failed')",
    );
    expect(migration).toContain(
      "order_status in ('confirmed', 'preparing', 'shipped', 'delivered') and payment_status = 'paid'",
    );
    expect(migration).toContain(
      "order_status = 'cancelled' and payment_status in ('unpaid', 'pending', 'failed')",
    );
    expect(migration).toContain(
      "order_status = 'expired' and payment_status = 'unpaid'",
    );
    expect(migration).toMatch(/add constraint orders_order_payment_state_check[\s\S]*\) not valid;/);
    expect(migration).not.toMatch(/^\s*alter table public\.orders validate constraint/m);
  });

  it.each([
    ["preparing", "unpaid"],
    ["shipped", "unpaid"],
    ["delivered", "unpaid"],
    ["confirmed", "failed"],
    ["cancelled", "paid"],
    ["expired", "pending"],
    ["expired", "paid"],
    ["awaiting_payment", "refunded"],
  ])("does not whitelist invalid combination %s + %s", (orderStatus, paymentStatus) => {
    const allowed =
      (orderStatus === "awaiting_payment" && ["unpaid", "pending", "failed"].includes(paymentStatus)) ||
      (["confirmed", "preparing", "shipped", "delivered"].includes(orderStatus) && paymentStatus === "paid") ||
      (orderStatus === "cancelled" && ["unpaid", "pending", "failed"].includes(paymentStatus)) ||
      (orderStatus === "expired" && paymentStatus === "unpaid");
    expect(allowed).toBe(false);
  });

  it("removes broad seller table reads and exposes only owned security-definer RPCs", () => {
    expect(migration).toContain(
      "drop policy if exists orders_read_approved_seller_own on public.orders",
    );
    expect(migration).toContain(
      "drop policy if exists order_items_read_approved_seller_own on public.order_items",
    );
    expect(migration).toContain("create or replace function public.get_seller_orders()");
    expect(migration).toContain("create or replace function public.get_seller_order(target_order_id uuid)");
    expect(migration.match(/security definer/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration.match(/set search_path = ''/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration).toContain("where seller_order.producer_id = seller_id");
    expect(migration).toContain("and owned_order.producer_id = seller_id");
    expect(commerceServer).toContain('supabase.rpc("get_seller_orders")');
    expect(commerceServer).toContain('supabase.rpc("get_seller_order"');
  });

  it("returns full seller PII only for paid orders and masks every protected field otherwise", () => {
    for (const field of [
      "phone",
      "neighborhood",
      "address_line",
      "postal_code",
      "delivery_note",
    ]) {
      expect(migration).toContain(
        `'${field}', case when (seller_order).payment_status = 'paid' then (seller_order).${field} else null end`,
      );
    }
  });

  it("requires an active category and eligible producer for public products", () => {
    expect(migration).toContain("drop policy if exists products_read_public_approved");
    expect(migration).toContain("where category.id = products.category_id");
    expect(migration).toContain("and category.active");
    expect(migration).toContain("status = 'approved'");
    expect(migration).toContain("producer.status = 'active'");
    expect(migration).toContain("producer.role <> 'admin'");
    expect(migration).toContain("seller.verification_status = 'approved'");
  });

  it("applies the same inactive-category and producer checks to public product images", () => {
    expect(migration).toContain("drop policy if exists product_images_read_public_product");
    expect(migration).toContain(
      "join public.categories category on category.id = product.category_id",
    );
    expect(migration).toContain("where product.id = product_images.product_id");
    expect(migration).toContain("and product.status = 'approved'");
    expect(migration.match(/and category\.active/g)).toHaveLength(2);
  });
});
