import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260805200000_secure_admin_order_management.sql",
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
const sellerMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260805170000_secure_seller_order_management.sql",
    import.meta.url,
  ),
  "utf8",
);
const actions = readFileSync(
  new URL("../app/[locale]/admin/orders/actions.ts", import.meta.url),
  "utf8",
);
const listPage = readFileSync(
  new URL("../app/[locale]/admin/orders/page.tsx", import.meta.url),
  "utf8",
);
const detailPage = readFileSync(
  new URL("../app/[locale]/admin/orders/[id]/page.tsx", import.meta.url),
  "utf8",
);
const actionPanel = readFileSync(
  new URL("../components/AdminOrderActions.tsx", import.meta.url),
  "utf8",
);
const server = readFileSync(
  new URL("../lib/supabase/admin-orders.ts", import.meta.url),
  "utf8",
);

function rpc(name: string) {
  const start = migration.indexOf(`create or replace function public.${name}`);
  const end = migration.indexOf("\n$$;", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

function orderUpdate(body: string) {
  const start = body.indexOf("update public.orders");
  const end = body.indexOf("\n  where", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return body.slice(start, end);
}

describe("secure admin order management contract", () => {
  it("grants full order reads only through active-admin RLS policies", () => {
    expect(migration).toContain("create policy orders_read_active_admin_all");
    expect(migration).toContain(
      "create policy order_items_read_active_admin_all",
    );
    expect(
      migration.match(/using \(\(select private\.is_admin\(\)\)\)/g),
    ).toHaveLength(2);
    expect(migration).not.toMatch(/for select to anon/);
  });

  it("preserves buyer and approved-seller read policies", () => {
    expect(commerceMigration).toContain("create policy orders_read_own");
    expect(commerceMigration).toContain("create policy order_items_read_own");
    expect(sellerMigration).toContain(
      "create policy orders_read_approved_seller_own",
    );
    expect(sellerMigration).toContain(
      "create policy order_items_read_approved_seller_own",
    );
    expect(migration).not.toMatch(/drop policy/);
  });

  it("uses narrow fixed-search-path RPCs with deterministic order row locks", () => {
    for (const name of ["cancel_admin_order", "expire_admin_order"]) {
      const body = rpc(name);
      expect(body).toContain("security definer");
      expect(body).toContain("set search_path = ''");
      expect(body).toContain("from public.profiles admin_profile");
      expect(body).toContain("admin_profile.role = 'admin'");
      expect(body).toContain("admin_profile.status = 'active'");
      expect(body).toContain("for share");
      expect(body).toContain("from public.orders admin_order");
      expect(body).toContain("for update");
    }
  });

  it("allows cancellation only for non-paid eligible workflow states", () => {
    const body = rpc("cancel_admin_order");
    expect(body).toContain(
      "locked_order.payment_status not in ('unpaid', 'pending', 'failed')",
    );
    expect(body).toContain(
      "locked_order.order_status not in ('awaiting_payment', 'confirmed', 'preparing')",
    );
    expect(body).toContain("order_status = 'cancelled'");
    for (const forbidden of ["shipped", "delivered", "cancelled", "expired"]) {
      expect("awaiting_payment confirmed preparing".split(" ")).not.toContain(
        forbidden,
      );
    }
  });

  it("normalizes and bounds a required cancellation reason server-side", () => {
    const body = rpc("cancel_admin_order");
    expect(body).toContain(
      "safe_reason text := btrim(coalesce(input_reason, ''))",
    );
    expect(body).toContain("char_length(safe_reason) not between 5 and 500");
    expect(body).toContain("cancellation_reason = safe_reason");
  });

  it("writes cancellation audit values from the authenticated server session", () => {
    const body = rpc("cancel_admin_order");
    expect(body).toContain("admin_id uuid := (select auth.uid())");
    expect(body).toContain("cancelled_at = now()");
    expect(body).toContain("cancelled_by = admin_id");
  });

  it("clears every shipping field when cancelling or expiring", () => {
    for (const name of ["cancel_admin_order", "expire_admin_order"]) {
      const body = rpc(name);
      expect(body).toContain("shipping_carrier = null");
      expect(body).toContain("tracking_number = null");
      expect(body).toContain("tracking_url = null");
      expect(body).toContain("shipped_at = null");
    }
    expect(sellerMigration).toContain("orders_shipping_state_check");
    expect(migration).not.toContain(
      "drop constraint orders_shipping_state_check",
    );
  });

  it("expires only overdue unpaid awaiting-payment orders", () => {
    const body = rpc("expire_admin_order");
    expect(body).toContain("locked_order.order_status <> 'awaiting_payment'");
    expect(body).toContain("locked_order.payment_status <> 'unpaid'");
    expect(body).toContain("locked_order.expires_at is null");
    expect(body).toContain("locked_order.expires_at > now()");
    expect(body).toContain("admin_order.expires_at <= now()");
    expect(body).toContain("order_status = 'expired'");
  });

  it("does not mutate payment, paid-at, ownership, totals, or snapshots", () => {
    for (const name of ["cancel_admin_order", "expire_admin_order"]) {
      const update = orderUpdate(rpc(name));
      expect(update).not.toMatch(/payment_status\s*=/);
      expect(update).not.toMatch(/paid_at\s*=/);
      expect(update).not.toMatch(/buyer_id\s*=/);
      expect(update).not.toMatch(/producer_id\s*=/);
      expect(update).not.toMatch(/(?:sub)?total_minor\s*=/);
    }
    expect(migration).not.toMatch(/update public\.order_items/);
    expect(migration).not.toMatch(/delete from public\.order_items/);
  });

  it("adds cancellation integrity checks without breaking historical rows", () => {
    expect(migration).toContain("orders_cancellation_reason_length_check");
    expect(migration).toContain("orders_cancellation_state_check");
    expect(migration).toContain("order_status = 'cancelled'");
    expect(migration).toContain(") not valid");
  });

  it("revokes broad execution and grants only authenticated RPC execution", () => {
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to authenticated");
    expect(migration).not.toMatch(/grant update on public\.orders/);
  });

  it("does not accept protected order fields from the client", () => {
    expect(actions).toContain("adminCancelOrderSchema.safeParse(input)");
    expect(actions).toContain("adminOrderMutationSchema.safeParse(input)");
    expect(actions).not.toMatch(
      /adminId|buyerId|producerId|paymentStatus|paidAt|subtotalMinor|totalMinor|orderStatus/,
    );
  });

  it("protects both routes and uses safe server-side admin queries", () => {
    for (const page of [listPage, detailPage]) {
      expect(page).toContain("requireUser(");
      expect(page).toContain("hasActiveAdminProfile");
    }
    expect(listPage).toContain("parseAdminOrderFilters");
    expect(server).toContain('.order("created_at", { ascending: false })');
    expect(server).toContain(".limit(200)");
    expect(detailPage).toContain("if (!order) notFound()");
  });

  it("loads checkout-group siblings without mutating them", () => {
    expect(server).toContain('.eq("checkout_group_id", checkoutGroupId)');
    expect(detailPage).toContain("getAdminCheckoutGroupOrders");
    expect(detailPage).toContain("groupTotal");
    expect(actions).not.toContain("checkoutGroupId");
  });

  it("keeps paid cancellation and ineligible expiry guarded in the UI too", () => {
    expect(actionPanel).toContain('paymentStatus === "paid"');
    expect(actionPanel).toContain("ui.paidCancellationBlocked");
    expect(actionPanel).toContain('orderStatus === "awaiting_payment"');
    expect(actionPanel).toContain('paymentStatus === "unpaid"');
    expect(actionPanel).toContain("deadlinePassed");
    expect(server).toContain("deadline <= Date.now()");
  });
});
