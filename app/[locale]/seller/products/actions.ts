"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  initialSellerProductActionState,
  parseSellerProductFormData,
  sellerImageMetadataSchema,
  sellerImageOrderSchema,
  sellerPriceToMinor,
  sellerProductIdSchema,
  sellerStockQuantity,
  validateSellerImageFile,
  type SellerProductActionState,
  type SellerProductInput,
} from "@/lib/seller-products";
import { requireApprovedSeller } from "@/lib/supabase/seller";

const localeSchema = z.enum(["tr", "en"]);
const reviewSchema = z.object({ locale: localeSchema, productId: sellerProductIdSchema }).strict();
const imageMutationSchema = z.object({ locale: localeSchema, imageId: z.string().uuid() }).strict();
export type SellerMutationResult = { status: "success" | "cleanup_pending" | "invalid" | "forbidden" | "locked" | "error" };

function productRpcArgs(input: SellerProductInput) {
  return {
    input_category_id: input.categoryId,
    input_slug: input.slug,
    input_title_tr: input.titleTr,
    input_title_en: input.titleEn,
    input_description_tr: input.descriptionTr,
    input_description_en: input.descriptionEn,
    input_price_minor: sellerPriceToMinor(input.price),
    input_currency: input.currency,
    input_stock_mode: input.stockMode,
    input_stock_quantity: sellerStockQuantity(input),
    input_preparation_days: input.preparationDays,
    input_city: input.city,
    input_district: input.district,
  };
}

export async function createSellerProduct(
  _previous: SellerProductActionState = initialSellerProductActionState,
  formData: FormData,
): Promise<SellerProductActionState> {
  void _previous;
  const locale = localeSchema.safeParse(formData.get("locale"));
  const parsed = parseSellerProductFormData(formData);
  if (!locale.success || !parsed.success) return { status: "invalid" };
  const access = await requireApprovedSeller(locale.data, `/${locale.data}/seller/products/new`);
  if (!access.approved) return { status: "forbidden" };
  const { data, error } = await access.supabase.rpc("create_seller_product", productRpcArgs(parsed.data));
  if (error?.code === "23505") return { status: "duplicate" };
  if (error || !data) return { status: "error" };
  redirect(`/${locale.data}/seller/products/${data}/edit`);
}

export async function updateSellerProduct(
  _previous: SellerProductActionState = initialSellerProductActionState,
  formData: FormData,
): Promise<SellerProductActionState> {
  void _previous;
  const locale = localeSchema.safeParse(formData.get("locale"));
  const productId = sellerProductIdSchema.safeParse(formData.get("productId"));
  const parsed = parseSellerProductFormData(formData);
  if (!locale.success || !productId.success || !parsed.success) return { status: "invalid" };
  const returnTo = `/${locale.data}/seller/products/${productId.data}/edit`;
  const access = await requireApprovedSeller(locale.data, returnTo);
  if (!access.approved) return { status: "forbidden" };
  const { data, error } = await access.supabase.rpc("update_seller_product", {
    target_product_id: productId.data,
    ...productRpcArgs(parsed.data),
  });
  if (error?.code === "23505") return { status: "duplicate" };
  if (error) return { status: "error" };
  if (!data) return { status: "locked" };
  revalidatePath(returnTo);
  revalidatePath(`/${locale.data}/seller/products`);
  return { status: "success", productId: productId.data };
}

export async function submitSellerProductForReview(input: unknown): Promise<SellerMutationResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const access = await requireApprovedSeller(parsed.data.locale, `/${parsed.data.locale}/seller/products/${parsed.data.productId}/edit`);
  if (!access.approved) return { status: "forbidden" };
  const { data, error } = await access.supabase.rpc("submit_product_for_review", { target_product_id: parsed.data.productId });
  if (error) return { status: "error" };
  if (!data) return { status: "locked" };
  revalidatePath(`/${parsed.data.locale}/seller`);
  revalidatePath(`/${parsed.data.locale}/seller/products`);
  revalidatePath(`/${parsed.data.locale}/seller/products/${parsed.data.productId}/edit`);
  return { status: "success" };
}

export async function uploadSellerProductImage(formData: FormData): Promise<SellerMutationResult> {
  const locale = localeSchema.safeParse(formData.get("locale"));
  const metadata = sellerImageMetadataSchema.safeParse({
    productId: formData.get("productId"), altTr: formData.get("altTr"), altEn: formData.get("altEn"),
  });
  const file = formData.get("file");
  if (!locale.success || !metadata.success || !(file instanceof File)) return { status: "invalid" };
  const checkedFile = await validateSellerImageFile(file);
  if (!checkedFile.valid) return { status: "invalid" };
  const access = await requireApprovedSeller(locale.data, `/${locale.data}/seller/products/${metadata.data.productId}/edit`);
  if (!access.approved) return { status: "forbidden" };
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() || "product-images";
  const storagePath = `seller/${access.user.id}/${metadata.data.productId}/${randomUUID()}.${checkedFile.extension}`;
  const { error: uploadError } = await access.supabase.storage.from(bucket).upload(storagePath, file, {
    cacheControl: "3600", contentType: file.type, upsert: false,
  });
  if (uploadError) return { status: "error" };
  const { data: imageId, error: imageError } = await access.supabase.rpc("add_seller_product_image", {
    target_product_id: metadata.data.productId, input_storage_path: storagePath,
    input_alt_tr: metadata.data.altTr, input_alt_en: metadata.data.altEn,
  });
  if (imageError || !imageId) {
    await access.supabase.storage.from(bucket).remove([storagePath]);
    return { status: imageError?.code === "23514" ? "locked" : "error" };
  }
  revalidatePath(`/${locale.data}/seller/products/${metadata.data.productId}/edit`);
  return { status: "success" };
}

export async function updateSellerProductImageAlt(input: unknown): Promise<SellerMutationResult> {
  const parsed = z.object({ locale: localeSchema, imageId: z.string().uuid(), altTr: z.string().trim().min(3).max(160), altEn: z.union([z.literal(""), z.string().trim().min(3).max(160)]) }).strict().safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const access = await requireApprovedSeller(parsed.data.locale, `/${parsed.data.locale}/seller/products`);
  if (!access.approved) return { status: "forbidden" };
  const { data, error } = await access.supabase.rpc("update_seller_product_image_alt", {
    target_image_id: parsed.data.imageId, input_alt_tr: parsed.data.altTr, input_alt_en: parsed.data.altEn,
  });
  if (error) return { status: "error" };
  return { status: data ? "success" : "locked" };
}

export async function reorderSellerProductImages(input: unknown): Promise<SellerMutationResult> {
  const parsed = z.object({ locale: localeSchema, ...sellerImageOrderSchema.shape }).strict().safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const access = await requireApprovedSeller(parsed.data.locale, `/${parsed.data.locale}/seller/products/${parsed.data.productId}/edit`);
  if (!access.approved) return { status: "forbidden" };
  const { data, error } = await access.supabase.rpc("reorder_seller_product_images", {
    target_product_id: parsed.data.productId, ordered_image_ids: parsed.data.imageIds,
  });
  if (error) return { status: "error" };
  if (!data) return { status: "locked" };
  revalidatePath(`/${parsed.data.locale}/seller/products/${parsed.data.productId}/edit`);
  return { status: "success" };
}

export async function deleteSellerProductImage(input: unknown): Promise<SellerMutationResult> {
  const parsed = imageMutationSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const access = await requireApprovedSeller(parsed.data.locale, `/${parsed.data.locale}/seller/products`);
  if (!access.approved) return { status: "forbidden" };
  const { data: storagePath, error } = await access.supabase.rpc("delete_seller_product_image", { target_image_id: parsed.data.imageId });
  if (error) return { status: "error" };
  if (!storagePath) return { status: "locked" };
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() || "product-images";
  const { error: storageError } = await access.supabase.storage.from(bucket).remove([storagePath]);
  return { status: storageError ? "cleanup_pending" : "success" };
}
