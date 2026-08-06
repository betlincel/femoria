import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapAdminOrder,
  type AdminOrder,
  type AdminOrderFilter,
} from "@/lib/admin-orders";
import type { Database } from "./database.types";

const ADMIN_ORDER_SELECT = `
  id, checkout_group_id, checkout_attempt_id, buyer_id, producer_id,
  producer_name_snapshot, order_number, order_status, payment_status, currency,
  subtotal_minor, shipping_minor, total_minor, recipient_name, phone, city,
  district, neighborhood, address_line, postal_code, delivery_note,
  shipping_carrier, tracking_number, tracking_url, shipped_at,
  cancellation_reason, cancelled_at, cancelled_by, created_at, updated_at,
  paid_at, expires_at,
  buyer:profiles!orders_buyer_id_fkey!inner(id, display_name, role, status),
  producer:profiles!orders_producer_id_fkey!inner(
    id, display_name, role, status,
    producer_profile:producer_profiles!producer_profiles_profile_id_fkey(
      verification_status
    )
  ),
  canceller:profiles!orders_cancelled_by_fkey(id, display_name, role, status),
  items:order_items(
    id, product_id, product_slug_snapshot, product_title_tr_snapshot,
    product_title_en_snapshot, unit_price_minor, quantity, line_total_minor,
    image_path_snapshot, created_at,
    product:products!order_items_product_id_fkey(id, slug)
  )
`;

function imageUrlBuilder(supabase: SupabaseClient<Database>) {
  const bucket =
    process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() ||
    "product-images";
  return (path: string) =>
    supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function mapRows(
  rows: unknown[],
  supabase: SupabaseClient<Database>,
): AdminOrder[] {
  const imageUrl = imageUrlBuilder(supabase);
  return rows.flatMap((row) => {
    const order = mapAdminOrder(row, imageUrl);
    return order ? [order] : [];
  });
}

export async function getAdminOrders(
  supabase: SupabaseClient<Database>,
  filter: AdminOrderFilter,
): Promise<AdminOrder[]> {
  let request = supabase
    .from("orders")
    .select(ADMIN_ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(200);

  if (
    filter === "paid" ||
    filter === "unpaid" ||
    filter === "failed" ||
    filter === "refunded"
  ) {
    request = request.eq("payment_status", filter);
  } else if (filter !== "all") {
    request = request.eq("order_status", filter);
  }

  const { data, error } = await request;
  if (error) throw new Error("Admin orders could not be loaded.");
  return mapRows(data ?? [], supabase);
}

export async function getAdminOrderById(
  supabase: SupabaseClient<Database>,
  orderId: string,
): Promise<AdminOrder | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(ADMIN_ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error("Admin order could not be loaded.");
  return data ? mapAdminOrder(data, imageUrlBuilder(supabase)) : null;
}

export async function getAdminCheckoutGroupOrders(
  supabase: SupabaseClient<Database>,
  checkoutGroupId: string,
): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ADMIN_ORDER_SELECT)
    .eq("checkout_group_id", checkoutGroupId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error("Admin checkout group could not be loaded.");
  return mapRows(data ?? [], supabase);
}

export async function cancelAdminOrderRpc(
  supabase: SupabaseClient<Database>,
  orderId: string,
  reason: string,
) {
  return supabase.rpc("cancel_admin_order", {
    target_order_id: orderId,
    input_reason: reason,
  });
}

export async function expireAdminOrderRpc(
  supabase: SupabaseClient<Database>,
  orderId: string,
) {
  return supabase.rpc("expire_admin_order", {
    target_order_id: orderId,
  });
}

export function hasAdminOrderDeadlinePassed(expiresAt: string | null) {
  if (!expiresAt) return false;
  const deadline = Date.parse(expiresAt);
  return Number.isFinite(deadline) && deadline <= Date.now();
}
