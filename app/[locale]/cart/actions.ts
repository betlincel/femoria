"use server";

import { revalidatePath } from "next/cache";
import { cartItemMutationInputSchema, cartMutationInputSchema, commerceLocaleSchema } from "@/lib/commerce";
import { safeNextRedirect } from "@/lib/auth";
import { requireUser } from "@/lib/supabase/auth";

export type CartActionResult = { status: "success" | "invalid" | "unavailable" | "insufficient_stock" | "forbidden" | "error" };

function refreshCartPaths(locale: "tr" | "en") {
  revalidatePath(`/${locale}`, "layout");
  revalidatePath(`/${locale}/cart`);
  revalidatePath(`/${locale}/checkout`);
}

function mapCartError(error: { code?: string; message?: string } | null): CartActionResult {
  if (!error) return { status: "error" };
  if (error.code === "42501") return { status: "forbidden" };
  if (error.message?.includes("insufficient_stock")) return { status: "insufficient_stock" };
  if (error.message?.includes("product_unavailable")) return { status: "unavailable" };
  return { status: "error" };
}

export async function addProductToCart(input: unknown): Promise<CartActionResult> {
  const parsed = cartMutationInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const returnTo = safeNextRedirect(parsed.data.returnTo, parsed.data.locale);
  const { supabase } = await requireUser(parsed.data.locale, returnTo);
  const { data, error } = await supabase.rpc("add_product_to_cart", {
    target_product_id: parsed.data.productId,
    input_quantity: parsed.data.quantity,
  });
  if (error || !data) return mapCartError(error);
  refreshCartPaths(parsed.data.locale);
  return { status: "success" };
}

export async function updateCartItemQuantity(input: unknown): Promise<CartActionResult> {
  const parsed = cartItemMutationInputSchema.safeParse(input);
  if (!parsed.success || parsed.data.quantity === undefined) return { status: "invalid" };
  const { supabase } = await requireUser(parsed.data.locale, `/${parsed.data.locale}/cart`);
  const { data, error } = await supabase.rpc("update_cart_item_quantity", {
    target_cart_item_id: parsed.data.itemId,
    input_quantity: parsed.data.quantity,
  });
  if (error) return mapCartError(error);
  if (!data) return { status: "forbidden" };
  refreshCartPaths(parsed.data.locale);
  return { status: "success" };
}

export async function removeCartItem(input: unknown): Promise<CartActionResult> {
  const parsed = cartItemMutationInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const { supabase } = await requireUser(parsed.data.locale, `/${parsed.data.locale}/cart`);
  const { data, error } = await supabase.rpc("remove_cart_item", { target_cart_item_id: parsed.data.itemId });
  if (error) return mapCartError(error);
  if (!data) return { status: "forbidden" };
  refreshCartPaths(parsed.data.locale);
  return { status: "success" };
}

export async function clearUserCart(input: unknown): Promise<CartActionResult> {
  const locale = commerceLocaleSchema.safeParse(input);
  if (!locale.success) return { status: "invalid" };
  const { supabase } = await requireUser(locale.data, `/${locale.data}/cart`);
  const { error } = await supabase.rpc("clear_cart");
  if (error) return mapCartError(error);
  refreshCartPaths(locale.data);
  return { status: "success" };
}
