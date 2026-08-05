"use server";

import { revalidatePath } from "next/cache";
import {
  adminProductReviewInputSchema,
  type AdminProductReviewResult,
} from "@/lib/admin-products";
import { hasActiveAdminProfile } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function revalidateProductSurfaces(productId: string, slug: string | null) {
  for (const locale of ["tr", "en"] as const) {
    revalidatePath(`/${locale}/admin/products`);
    revalidatePath(`/${locale}/admin/products/${productId}`);
    revalidatePath(`/${locale}/products`);
    revalidatePath(`/${locale}/kitchen`);
    revalidatePath(`/${locale}/workshop`);
    revalidatePath(`/${locale}/seller/products`);
    revalidatePath(`/${locale}/seller/products/${productId}/edit`);
    revalidatePath(`/${locale}`);
    if (slug) revalidatePath(`/${locale}/products/${slug}`);
  }
}

export async function reviewAdminProduct(input: unknown): Promise<AdminProductReviewResult> {
  const parsed = adminProductReviewInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) return { status: "forbidden" };

  try {
    if (!(await hasActiveAdminProfile(supabase, data.user.id))) return { status: "forbidden" };
  } catch {
    return { status: "error" };
  }

  const { data: reviewed, error } = await supabase.rpc("review_product", {
    target_product_id: parsed.data.productId,
    review_action: parsed.data.action,
    input_rejection_reason: parsed.data.action === "reject" ? parsed.data.rejectionReason.trim() : null,
  });

  if (error) return { status: "error" };
  if (!reviewed) return { status: "conflict" };

  const { data: product } = await supabase
    .from("products")
    .select("slug")
    .eq("id", parsed.data.productId)
    .maybeSingle();

  revalidateProductSurfaces(parsed.data.productId, product?.slug ?? null);
  return { status: "success", action: parsed.data.action };
}
