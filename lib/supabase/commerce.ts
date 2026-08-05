import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { addressSchema, checkoutResultSchema, orderSchema, parseCartSnapshot, type BuyerOrder, type CartSnapshot, type UserAddress } from "@/lib/commerce";
import type { Database, Json } from "./database.types";
import { createClient } from "./server";

const ORDER_SELECT = `
  id, checkout_group_id, producer_id, producer_name_snapshot, order_number,
  order_status, payment_status, currency, subtotal_minor, shipping_minor, total_minor,
  recipient_name, phone, city, district, neighborhood, address_line, postal_code,
  delivery_note, shipping_carrier, tracking_number, tracking_url, shipped_at, created_at, paid_at,
  items:order_items(id, product_id, product_slug_snapshot, product_title_tr_snapshot,
    product_title_en_snapshot, unit_price_minor, quantity, line_total_minor,
    image_path_snapshot, created_at)
`;

function imageUrlBuilder(supabase: SupabaseClient<Database>) {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() || "product-images";
  return (path: string) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function getCartSnapshot(supabase: SupabaseClient<Database>): Promise<CartSnapshot> {
  const { data, error } = await supabase.rpc("get_cart_snapshot");
  if (error) throw new Error("Cart could not be loaded.");
  return parseCartSnapshot(data, imageUrlBuilder(supabase));
}

export async function getCartQuantity(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return 0;
    const { data, error } = await supabase.rpc("get_cart_quantity");
    return error || typeof data !== "number" ? 0 : data;
  } catch {
    return 0;
  }
}

export async function listUserAddresses(supabase: SupabaseClient<Database>, userId: string): Promise<UserAddress[]> {
  const { data, error } = await supabase.from("addresses")
    .select("id, profile_id, label, recipient_name, phone, city, district, neighborhood, address_line, postal_code, delivery_instructions, is_default, created_at, updated_at")
    .eq("profile_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error("Addresses could not be loaded.");
  return (data ?? []).map((row) => addressSchema.parse(row));
}

function mapOrder(value: unknown, imageUrl: (path: string) => string): BuyerOrder {
  const order = orderSchema.parse(value);
  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      imageUrl: item.image_path_snapshot ? imageUrl(item.image_path_snapshot) : "/brand/product-placeholder.svg",
    })),
  };
}

export async function listBuyerOrders(supabase: SupabaseClient<Database>, userId: string): Promise<BuyerOrder[]> {
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT)
    .eq("buyer_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error("Orders could not be loaded.");
  const imageUrl = imageUrlBuilder(supabase);
  return (data ?? []).map((row) => mapOrder(row, imageUrl));
}

export async function getBuyerOrder(supabase: SupabaseClient<Database>, userId: string, orderId: string): Promise<BuyerOrder | null> {
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT)
    .eq("id", orderId).eq("buyer_id", userId).maybeSingle();
  if (error) throw new Error("Order could not be loaded.");
  return data ? mapOrder(data, imageUrlBuilder(supabase)) : null;
}

export async function listSellerOrders(supabase: SupabaseClient<Database>, producerId: string): Promise<BuyerOrder[]> {
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT)
    .eq("producer_id", producerId).order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error("Seller orders could not be loaded.");
  const imageUrl = imageUrlBuilder(supabase);
  return (data ?? []).map((row) => mapOrder(row, imageUrl));
}

export async function getSellerOrder(supabase: SupabaseClient<Database>, producerId: string, orderId: string): Promise<BuyerOrder | null> {
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT)
    .eq("id", orderId).eq("producer_id", producerId).maybeSingle();
  if (error) throw new Error("Seller order could not be loaded.");
  return data ? mapOrder(data, imageUrlBuilder(supabase)) : null;
}

export function parseCheckoutRpcResult(value: Json) {
  return checkoutResultSchema.parse(value);
}
