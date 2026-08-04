import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "./supabase/database.types";

const categorySchema = z.object({
  id: z.string().uuid(), slug: z.string(), name_tr: z.string(), name_en: z.string(),
  kind: z.enum(["food", "craft"]), active: z.boolean(), sort_order: z.number().int(),
}).strict();

const imageSchema = z.object({
  id: z.string().uuid(), storage_path: z.string(), alt_tr: z.string(), alt_en: z.string(), sort_order: z.number().int(),
}).strict();

const productRowSchema = z.object({
  id: z.string().uuid(), category_id: z.string().uuid(), slug: z.string(), title_tr: z.string(), title_en: z.string(),
  description_tr: z.string(), description_en: z.string(), price_minor: z.number().int(), currency: z.string(),
  status: z.enum(["draft", "pending", "approved", "rejected"]),
  stock_mode: z.enum(["in_stock", "made_to_order", "unavailable"]), stock_quantity: z.number().int().nullable(),
  preparation_days: z.number().int(), city: z.string(), district: z.string(), created_at: z.string(), updated_at: z.string(),
  category: z.union([categorySchema, z.array(categorySchema)]), images: z.array(imageSchema),
}).strict();

export type SellerCategory = z.infer<typeof categorySchema>;
export type SellerProduct = Omit<z.infer<typeof productRowSchema>, "category" | "images"> & {
  category: SellerCategory;
  images: Array<z.infer<typeof imageSchema> & { publicUrl: string }>;
};

const PRODUCT_SELECT = `
  id, category_id, slug, title_tr, title_en, description_tr, description_en,
  price_minor, currency, status, stock_mode, stock_quantity, preparation_days,
  city, district, created_at, updated_at,
  category:categories!products_category_id_fkey!inner(id, slug, name_tr, name_en, kind, active, sort_order),
  images:product_images(id, storage_path, alt_tr, alt_en, sort_order)
`;

function firstCategory(value: z.infer<typeof productRowSchema>["category"]): SellerCategory | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapSellerProduct(
  value: unknown,
  imageUrl: (path: string) => string,
): SellerProduct | null {
  const parsed = productRowSchema.safeParse(value);
  if (!parsed.success) return null;
  const category = firstCategory(parsed.data.category);
  if (!category) return null;
  return {
    ...parsed.data,
    category,
    images: [...parsed.data.images]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((image) => ({ ...image, publicUrl: imageUrl(image.storage_path) })),
  };
}

function imageUrlBuilder(supabase: SupabaseClient<Database>) {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() || "product-images";
  return (path: string) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function listSellerCategories(supabase: SupabaseClient<Database>): Promise<SellerCategory[]> {
  const { data, error } = await supabase.from("categories")
    .select("id, slug, name_tr, name_en, kind, active, sort_order")
    .eq("active", true).order("sort_order").order("name_tr");
  if (error) throw new Error("Seller categories could not be loaded.");
  return (data ?? []).flatMap((row) => {
    const parsed = categorySchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function listSellerProducts(supabase: SupabaseClient<Database>, producerId: string): Promise<SellerProduct[]> {
  const { data, error } = await supabase.from("products").select(PRODUCT_SELECT)
    .eq("producer_id", producerId).order("updated_at", { ascending: false }).limit(200);
  if (error) throw new Error("Seller products could not be loaded.");
  const imageUrl = imageUrlBuilder(supabase);
  return (data ?? []).flatMap((row) => {
    const product = mapSellerProduct(row, imageUrl);
    return product ? [product] : [];
  });
}

export async function getSellerProduct(
  supabase: SupabaseClient<Database>,
  producerId: string,
  productId: string,
): Promise<SellerProduct | null> {
  const { data, error } = await supabase.from("products").select(PRODUCT_SELECT)
    .eq("producer_id", producerId).eq("id", productId).maybeSingle();
  if (error) throw new Error("Seller product could not be loaded.");
  return data ? mapSellerProduct(data, imageUrlBuilder(supabase)) : null;
}
