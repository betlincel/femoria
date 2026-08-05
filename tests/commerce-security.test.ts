import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../supabase/migrations/20260805120000_secure_cart_checkout_orders.sql", import.meta.url), "utf8");
const cartActions = readFileSync(new URL("../app/[locale]/cart/actions.ts", import.meta.url), "utf8");
const checkoutActions = readFileSync(new URL("../app/[locale]/checkout/actions.ts", import.meta.url), "utf8");
const cartPage = readFileSync(new URL("../app/[locale]/cart/page.tsx", import.meta.url), "utf8");
const checkoutPage = readFileSync(new URL("../app/[locale]/checkout/page.tsx", import.meta.url), "utf8");
const ordersPage = readFileSync(new URL("../app/[locale]/account/orders/page.tsx", import.meta.url), "utf8");
const orderDetail = readFileSync(new URL("../app/[locale]/account/orders/[id]/page.tsx", import.meta.url), "utf8");
const commerceServer = readFileSync(new URL("../lib/supabase/commerce.ts", import.meta.url), "utf8");

function rpc(name: string) {
  const start = migration.indexOf(`create or replace function public.${name}`);
  const end = migration.indexOf("\n$$;", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

describe("secure cart, address, and order contract", () => {
  it("creates the cart and immutable marketplace order core", () => {
    for (const table of ["carts", "cart_items", "orders", "order_items"]) expect(migration).toContain(`create table public.${table}`);
    expect(migration).toContain("unique (cart_id, product_id)");
    expect(migration).toContain("unique (buyer_id, checkout_attempt_id, producer_id)");
    expect(migration).toContain("product_title_tr_snapshot");
    expect(migration).toContain("image_path_snapshot");
    expect(migration).toContain("line_total_minor = unit_price_minor::bigint * quantity");
  });

  it("uses only awaiting-payment and unpaid for client-created orders", () => {
    const checkout = rpc("create_awaiting_payment_orders");
    expect(checkout).toContain("'awaiting_payment', 'unpaid', 'TRY'");
    expect(checkout).toContain("shipping_minor");
    expect(checkout).toContain("paid_at");
    expect(checkout).toContain("null");
    expect(checkoutActions).not.toMatch(/orderStatus|paymentStatus|paidAt|totalMinor|producerId|priceMinor/);
  });

  it("derives cart ownership and prices from the authenticated database session", () => {
    const add = rpc("add_product_to_cart");
    expect(add).toContain("private.require_active_shopper()");
    expect(add).toContain("product_row.price_minor <= 0");
    expect(add).toContain("product_row.currency <> 'TRY'");
    expect(add).toContain("product_row.producer_id = shopper_id");
    expect(add).toContain("producer.role <> 'admin'");
    expect(add).toContain("seller.verification_status = 'approved'");
    expect(add).toContain("category.active");
    expect(cartActions).not.toMatch(/price[_A-Z]?minor|producer[_A-Z]?id|user[_A-Z]?id/i);
  });

  it("enforces quantity, stock, unavailable, and repeat-add limits", () => {
    const add = rpc("add_product_to_cart");
    const update = rpc("update_cart_item_quantity");
    expect(migration).toContain("quantity integer not null check (quantity between 1 and 20)");
    expect(add).toContain("current_quantity := coalesce(current_quantity, 0) + input_quantity");
    expect(add).toContain("current_quantity > 20");
    expect(add).toContain("product_row.stock_mode = 'in_stock'");
    expect(add).toContain("product_row.stock_mode = 'unavailable'");
    expect(update).toContain("input_quantity not between 1 and 20");
    expect(update).toContain("cart.user_id = shopper_id");
  });

  it("prevents foreign cart item mutation and exposes narrow RPC execution only", () => {
    expect(rpc("remove_cart_item")).toContain("cart.user_id = shopper_id");
    expect(rpc("clear_cart")).toContain("cart.user_id = shopper_id");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.add_product_to_cart(uuid, integer) to authenticated");
    expect(migration).toContain("revoke all on public.carts, public.cart_items, public.orders, public.order_items");
  });

  it("serializes and validates address ownership, limits, and defaults", () => {
    for (const name of ["create_user_address", "update_user_address", "delete_user_address", "set_default_user_address"]) {
      expect(rpc(name)).toContain("private.require_active_shopper()");
    }
    expect(rpc("create_user_address")).toContain(">= 10");
    expect(rpc("create_user_address")).toContain("pg_advisory_xact_lock");
    expect(rpc("update_user_address")).toContain("address.profile_id = shopper_id");
    expect(rpc("delete_user_address")).toContain("address.profile_id = shopper_id");
    expect(migration).toContain("private.normalize_tr_phone(input_phone)");
    expect(migration).toContain("drop policy if exists addresses_insert_own");
  });

  it("normalizes duplicate defaults before enforcing one default address per profile", () => {
    const duplicateDetection = migration.indexOf("with duplicate_profiles as (");
    const normalization = migration.indexOf("ranked.default_rank > 1");
    const uniqueIndex = migration.indexOf("create unique index if not exists addresses_one_default_per_profile_idx");

    expect(duplicateDetection).toBeGreaterThan(-1);
    expect(migration).toContain("having count(*) > 1");
    expect(migration).toContain("partition by address.profile_id");
    expect(migration).toContain("order by address.created_at, address.id");
    expect(normalization).toBeGreaterThan(duplicateDetection);
    expect(uniqueIndex).toBeGreaterThan(normalization);
    expect(migration).toContain("on public.addresses(profile_id)\nwhere is_default");
  });

  it("keeps default-address RPC writes compatible with the partial unique index", () => {
    const setDefault = rpc("set_default_user_address");
    const clearOldDefault = setDefault.indexOf("set is_default = false");
    const assignNewDefault = setDefault.indexOf("set is_default = true");

    expect(setDefault).toContain("pg_advisory_xact_lock");
    expect(clearOldDefault).toBeGreaterThan(-1);
    expect(assignNewDefault).toBeGreaterThan(clearOldDefault);
  });

  it("revalidates and locks the full cart before creating seller-split orders", () => {
    const checkout = rpc("create_awaiting_payment_orders");
    expect(checkout).toContain("where cart.user_id = shopper_id for update");
    expect(checkout).toContain("where item.cart_id = target_cart_id for update");
    expect(checkout).toContain("for update of product");
    expect(checkout).toContain("product.status <> 'approved'");
    expect(checkout).toContain("category.active");
    expect(checkout).toContain("seller.verification_status is distinct from 'approved'");
    expect(checkout).toContain("group by product.producer_id, producer.display_name");
    expect(checkout).toContain("delete from public.cart_items where cart_id = target_cart_id");
  });

  it("locks checkout category and seller eligibility rows in deterministic UUID order", () => {
    const checkout = rpc("create_awaiting_payment_orders");
    const productLock = checkout.indexOf("order by product.id for update of product");
    const categoryLock = checkout.indexOf("order by category.id\n  for share of category");
    const producerLock = checkout.indexOf("order by producer.id\n  for share of producer");
    const sellerLock = checkout.indexOf("order by seller.profile_id\n  for share of seller");
    const eligibilityCheck = checkout.indexOf("if exists (", sellerLock);

    expect(productLock).toBeGreaterThan(-1);
    expect(categoryLock).toBeGreaterThan(productLock);
    expect(producerLock).toBeGreaterThan(categoryLock);
    expect(sellerLock).toBeGreaterThan(producerLock);
    expect(eligibilityCheck).toBeGreaterThan(sellerLock);
    expect(checkout.slice(productLock, eligibilityCheck)).not.toContain("for key share");
  });

  it("takes price, product, image, producer, and address snapshots in one transaction", () => {
    const checkout = rpc("create_awaiting_payment_orders");
    expect(checkout).toContain("product.price_minor::bigint * item.quantity");
    expect(checkout).toContain("product.slug, product.title_tr, product.title_en");
    expect(checkout).toContain("order by image.sort_order, image.created_at, image.id limit 1");
    expect(checkout).toContain("address_row.recipient_name");
    expect(checkout).toContain("address_row.neighborhood");
    expect(checkout).not.toContain("update public.products set stock_quantity");
  });

  it("makes checkout retries idempotent per buyer and attempt", () => {
    const checkout = rpc("create_awaiting_payment_orders");
    expect(checkout).toContain("pg_advisory_xact_lock");
    expect(checkout).toContain("buyer_order.checkout_attempt_id = create_awaiting_payment_orders.checkout_attempt_id");
    expect(checkout).toContain("'order_ids', jsonb_agg(buyer_order.id");
    expect(checkout.indexOf("buyer_order.checkout_attempt_id = create_awaiting_payment_orders.checkout_attempt_id")).toBeLessThan(checkout.indexOf("select cart.id into target_cart_id"));
  });

  it("allows buyer-only reads without seller, admin, or anonymous order policies", () => {
    expect(migration).toContain("create policy orders_read_own");
    expect(migration).toContain("buyer_id = (select auth.uid())");
    expect(migration).toContain("create policy order_items_read_own");
    expect(migration).not.toMatch(/create policy orders_(seller|admin)/);
    expect(migration).not.toMatch(/grant select on public\.orders[^;]*anon/);
  });

  it("protects every commerce route on the server and avoids card inputs", () => {
    for (const page of [cartPage, checkoutPage, ordersPage, orderDetail]) expect(page).toContain("requireUser");
    expect(commerceServer).toContain('.eq("id", orderId).eq("buyer_id", userId).maybeSingle()');
    expect(checkoutPage).toContain("item.invalid_reason");
    expect(checkoutActions).not.toMatch(/card|bank|stripe|iyzico/i);
  });
});
