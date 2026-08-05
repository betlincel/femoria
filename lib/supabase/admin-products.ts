import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { mapAdminProduct, type AdminProduct, type AdminProductStatus } from "@/lib/admin-products";
import type { Database } from "./database.types";

const ADMIN_PRODUCT_SELECT = `
  id, producer_id, category_id, slug, title_tr, title_en, description_tr, description_en,
  price_minor, currency, status, stock_mode, stock_quantity, preparation_days, city, district,
  rejection_reason, reviewed_at, reviewed_by, created_at, updated_at,
  category:categories!products_category_id_fkey!inner(id, slug, name_tr, name_en, kind, active),
  producer:profiles!products_producer_id_fkey!inner(
    id, display_name, city, district, neighborhood_public, status,
    producer_profile:producer_profiles!producer_profiles_profile_id_fkey(
      story_tr, story_en, verification_status, approximate_area
    )
  ),
  reviewer:profiles!products_reviewed_by_fkey(id, display_name),
  images:product_images(id, storage_path, alt_tr, alt_en, sort_order)
`;

function imageUrlBuilder(supabase: SupabaseClient<Database>) {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() || "product-images";
  return (path: string) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function listAdminProducts(
  supabase: SupabaseClient<Database>,
  status: AdminProductStatus,
): Promise<AdminProduct[]> {
  let request = supabase
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .limit(500);

  if (status !== "all") request = request.eq("status", status);
  request = status === "pending"
    ? request.order("created_at", { ascending: true })
    : request.order("reviewed_at", { ascending: false, nullsFirst: false }).order("updated_at", { ascending: false });
  const { data, error } = await request;

  if (error) throw new Error("Admin products could not be loaded.");
  const imageUrl = imageUrlBuilder(supabase);
  return (data ?? []).flatMap((row) => {
    const product = mapAdminProduct(row, imageUrl);
    return product ? [product] : [];
  });
}

export async function getAdminProductCounts(supabase: SupabaseClient<Database>) {
  const statuses = ["pending", "approved", "rejected"] as const;
  const [totalResult, ...statusResults] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    ...statuses.map((status) => supabase.from("products").select("id", { count: "exact", head: true }).eq("status", status)),
  ]);
  if (totalResult.error || statusResults.some((result) => result.error)) {
    throw new Error("Admin product counts could not be loaded.");
  }
  return {
    pending: statusResults[0].count ?? 0,
    approved: statusResults[1].count ?? 0,
    rejected: statusResults[2].count ?? 0,
    total: totalResult.count ?? 0,
  };
}

export async function getAdminProduct(
  supabase: SupabaseClient<Database>,
  productId: string,
): Promise<AdminProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .eq("id", productId)
    .maybeSingle();

  if (error) throw new Error("Admin product could not be loaded.");
  return data ? mapAdminProduct(data, imageUrlBuilder(supabase)) : null;
}
