import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260805170000_secure_seller_order_management.sql",
    import.meta.url,
  ),
  "utf8",
);
const commerceMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260805120000_secure_cart_checkout_orders.sql",
    import.meta.url,
  ),
  "utf8",
);
const actions = readFileSync(
  new URL("../app/[locale]/seller/orders/actions.ts", import.meta.url),
  "utf8",
);
const listPage = readFileSync(
  new URL("../app/[locale]/seller/orders/page.tsx", import.meta.url),
  "utf8",
);
const detailPage = readFileSync(
  new URL("../app/[locale]/seller/orders/[id]/page.tsx", import.meta.url),
  "utf8",
);
const actionPanel = readFileSync(
  new URL("../components/SellerOrderStatusActions.tsx", import.meta.url),
  "utf8",
);
const commerceServer = readFileSync(
  new URL("../lib/supabase/commerce.ts", import.meta.url),
  "utf8",
);

function rpc(name: string) {
  const start = migration.indexOf(`create or replace function public.${name}`);
  const end = migration.indexOf("\n$$;", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

describe("secure seller order management contract", () => {
  it("adds shipping fields and a future-safe shipped/delivered constraint", () => {
    expect(migration).toContain("add column shipping_carrier text null");
    expect(migration).toContain("add column tracking_number text null");
    expect(migration).toContain("add column tracking_url text null");
    expect(migration).toContain("add column shipped_at timestamptz null");
    expect(migration).toContain("order_status in ('shipped', 'delivered')");
    expect(migration).toContain("orders_shipping_state_check");
    expect(migration).toContain(") not valid");
  });

  it("gives approved active non-admin sellers read access only to their orders", () => {
    expect(migration).toContain(
      "create policy orders_read_approved_seller_own",
    );
    expect(migration).toContain("producer_id = (select auth.uid())");
    expect(migration).toContain("producer.status = 'active'");
    expect(migration).toContain("producer.role <> 'admin'");
    expect(migration).toContain("seller.verification_status = 'approved'");
    expect(migration).not.toMatch(/create policy orders_admin/);
    expect(migration).not.toMatch(/to anon/);
  });

  it("ties seller order-item reads to an owned parent order", () => {
    expect(migration).toContain(
      "create policy order_items_read_approved_seller_own",
    );
    expect(migration).toContain("seller_order.id = order_items.order_id");
    expect(migration).toContain(
      "seller_order.producer_id = (select auth.uid())",
    );
  });

  it("preserves existing buyer order policies", () => {
    expect(commerceMigration).toContain("create policy orders_read_own");
    expect(commerceMigration).toContain("create policy order_items_read_own");
    expect(migration).not.toContain("drop policy if exists orders_read_own");
    expect(commerceServer).toContain(
      '.eq("id", orderId).eq("buyer_id", userId).maybeSingle()',
    );
  });

  it("uses fixed-search-path security-definer RPCs and no direct order writes", () => {
    for (const name of [
      "mark_seller_order_preparing",
      "mark_seller_order_shipped",
    ]) {
      const body = rpc(name);
      expect(body).toContain("security definer");
      expect(body).toContain("set search_path = ''");
      expect(body).toContain("for update");
      expect(body).toContain("seller_order.producer_id = seller_id");
    }
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to authenticated");
    expect(migration).not.toMatch(/grant update on public\.orders/);
  });

  it("rejects buyer, admin, suspended, and unapproved producer mutations", () => {
    for (const body of [
      rpc("mark_seller_order_preparing"),
      rpc("mark_seller_order_shipped"),
    ]) {
      expect(body).toContain("producer.status = 'active'");
      expect(body).toContain("producer.role <> 'admin'");
      expect(body).toContain("seller.verification_status = 'approved'");
      expect(body).toContain("raise insufficient_privilege");
    }
  });

  it("permits only paid confirmed to preparing", () => {
    const preparing = rpc("mark_seller_order_preparing");
    expect(preparing).toContain("locked_order.payment_status <> 'paid'");
    expect(preparing).toContain("locked_order.order_status <> 'confirmed'");
    expect(preparing).toContain("order_status = 'preparing'");
    expect(preparing).toContain("seller_order.payment_status = 'paid'");
    expect(preparing).toContain("seller_order.order_status = 'confirmed'");
  });

  it("permits only paid preparing to shipped and sets shipped_at server-side", () => {
    const shipped = rpc("mark_seller_order_shipped");
    expect(shipped).toContain("locked_order.payment_status <> 'paid'");
    expect(shipped).toContain("locked_order.order_status <> 'preparing'");
    expect(shipped).toContain("order_status = 'shipped'");
    expect(shipped).toContain("shipped_at = now()");
    expect(shipped).toContain("seller_order.order_status = 'preparing'");
  });

  it("requires bounded carrier and tracking number plus an HTTP(S) tracking URL", () => {
    const shipped = rpc("mark_seller_order_shipped");
    expect(shipped).toContain("char_length(safe_carrier) not between 2 and 80");
    expect(shipped).toContain(
      "char_length(safe_tracking_number) not between 2 and 120",
    );
    expect(shipped).toContain("safe_tracking_url !~* '^https?://'");
    expect(shipped).toContain(
      "raise check_violation using message = 'invalid_tracking'",
    );
  });

  it("does not accept seller, payment, audit, price, or arbitrary status fields from clients", () => {
    expect(actions).not.toMatch(
      /producerId|buyerId|paymentStatus|paidAt|subtotal|totalMinor|orderStatus|newStatus/,
    );
    expect(actions).toContain("sellerOrderMutationSchema.safeParse(input)");
    expect(actions).toContain("sellerShippingInputSchema.safeParse(input)");
  });

  it("protects list and detail routes with approved-seller authorization and owned queries", () => {
    for (const page of [listPage, detailPage])
      expect(page).toMatch(/requireApprovedSeller\(\s*locale,/);
    expect(commerceServer).toContain('.eq("producer_id", producerId)');
    expect(commerceServer).toContain(
      '.eq("id", orderId).eq("producer_id", producerId).maybeSingle()',
    );
    expect(detailPage).toContain("if (!order) notFound()");
  });

  it("keeps unpaid orders visible but blocks operational UI", () => {
    expect(listPage).toMatch(
      /filter === "awaiting_payment"\s*\? order\.payment_status === "unpaid"/,
    );
    expect(actionPanel).toContain('if (paymentStatus !== "paid")');
    expect(actionPanel).toContain("ui.paymentRequired");
    expect(actionPanel).toContain('orderStatus === "confirmed"');
    expect(actionPanel).toContain('orderStatus === "preparing"');
  });

  it("revalidates buyer and seller paths without changing order item snapshots", () => {
    expect(actions).toContain(
      "revalidatePath(`/${locale}/seller/orders/${orderId}`)",
    );
    expect(actions).toContain(
      "revalidatePath(`/${locale}/account/orders/${orderId}`)",
    );
    expect(migration).not.toMatch(/update public\.order_items/);
    expect(migration).not.toMatch(/delete from public\.order_items/);
  });
});
