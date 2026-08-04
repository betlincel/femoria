import "server-only";

import { cache } from "react";
import { catalogSlugSchema } from "./catalog-schemas";
import {
  mapCatalogCategory,
  mapCatalogProduct,
  mapCatalogProducts,
} from "./catalog-mapper";
import { createClient } from "./supabase/server";
import type { CatalogCategory, Product } from "./types";

const PRODUCT_SELECT = `
  id,
  slug,
  title_tr,
  title_en,
  description_tr,
  description_en,
  price_minor,
  currency,
  status,
  stock_mode,
  stock_quantity,
  preparation_days,
  city,
  district,
  created_at,
  category:categories!inner(
    id,
    slug,
    name_tr,
    name_en,
    kind,
    active,
    sort_order
  ),
  producer:profiles!products_producer_id_fkey!inner(
    id,
    display_name,
    status,
    producer_profile:producer_profiles!inner(
      story_tr,
      story_en,
      verification_status,
      approximate_area
    )
  ),
  images:product_images(
    id,
    storage_path,
    alt_tr,
    alt_en,
    sort_order
  )
`;

function catalogQueryError(
  subject: string,
  error: { code: string; message: string; details?: unknown; hint?: string },
): Error {
  const details = typeof error.details === "string"
    ? error.details
    : error.details
      ? JSON.stringify(error.details)
      : "";
  const context = [details, error.hint].filter(Boolean).join(" ");
  return new Error(
    `Public catalog ${subject} are unavailable (${error.code}): ${error.message}${context ? ` ${context}` : ""}`,
  );
}

function imageUrlBuilder(
  supabase: Awaited<ReturnType<typeof createClient>>,
): (storagePath: string) => string {
  const bucket =
    process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() ||
    "product-images";
  return (storagePath) =>
    supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
}

export async function listCatalogCategories(): Promise<CatalogCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name_tr, name_en, kind, active, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name_tr", { ascending: true });

  if (error) {
    throw catalogQueryError("categories", error);
  }
  return (data ?? []).flatMap((row) => {
    const category = mapCatalogCategory(row);
    return category ? [category] : [];
  });
}

export async function listCatalogProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    throw catalogQueryError("products", error);
  }
  return mapCatalogProducts(data ?? [], imageUrlBuilder(supabase));
}

export const getCatalogProductBySlug = cache(
  async (slugValue: string): Promise<Product | null> => {
    const slug = catalogSlugSchema.safeParse(slugValue);
    if (!slug.success) return null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "approved")
      .eq("slug", slug.data)
      .maybeSingle();

    if (error) {
      throw catalogQueryError("product", error);
    }
    if (!data) return null;
    return mapCatalogProduct(data, imageUrlBuilder(supabase));
  },
);
