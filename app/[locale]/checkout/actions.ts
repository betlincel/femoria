"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { commerceLocaleSchema, commerceUuidSchema, parseAddressFormData } from "@/lib/commerce";
import { requireUser } from "@/lib/supabase/auth";
import { parseCheckoutRpcResult } from "@/lib/supabase/commerce";

export type AddressActionResult = { status: "success" | "invalid" | "limit" | "forbidden" | "error"; addressId?: string };
export type CheckoutActionResult = { status: "success" | "invalid" | "empty" | "unavailable" | "forbidden" | "error"; orderId?: string };

function addressArgs(input: ReturnType<typeof parseAddressFormData>["data"]) {
  if (!input) throw new Error("Address input is required.");
  return {
    input_label: input.label,
    input_recipient_name: input.recipientName,
    input_phone: input.phone,
    input_city: input.city,
    input_district: input.district,
    input_neighborhood: input.neighborhood,
    input_address_line: input.addressLine,
    input_postal_code: input.postalCode || null,
    input_delivery_note: input.deliveryNote || null,
    input_is_default: input.isDefault,
  };
}

export async function saveUserAddress(formData: FormData): Promise<AddressActionResult> {
  const parsed = parseAddressFormData(formData);
  if (!parsed.success) return { status: "invalid" };
  const { supabase } = await requireUser(parsed.data.locale, `/${parsed.data.locale}/checkout`);
  const result = parsed.data.addressId
    ? await supabase.rpc("update_user_address", { target_address_id: parsed.data.addressId, ...addressArgs(parsed.data) })
    : await supabase.rpc("create_user_address", addressArgs(parsed.data));
  if (result.error?.message.includes("address_limit")) return { status: "limit" };
  if (result.error?.code === "42501") return { status: "forbidden" };
  if (result.error) return { status: "error" };
  if (!result.data) return { status: "forbidden" };
  revalidatePath(`/${parsed.data.locale}/checkout`);
  return { status: "success", addressId: typeof result.data === "string" ? result.data : parsed.data.addressId };
}

const addressMutationSchema = z.object({ locale: commerceLocaleSchema, addressId: commerceUuidSchema }).strict();

export async function deleteUserAddress(input: unknown): Promise<AddressActionResult> {
  const parsed = addressMutationSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const { supabase } = await requireUser(parsed.data.locale, `/${parsed.data.locale}/checkout`);
  const { data, error } = await supabase.rpc("delete_user_address", { target_address_id: parsed.data.addressId });
  if (error) return { status: error.code === "42501" ? "forbidden" : "error" };
  if (!data) return { status: "forbidden" };
  revalidatePath(`/${parsed.data.locale}/checkout`);
  return { status: "success" };
}

export async function setDefaultUserAddress(input: unknown): Promise<AddressActionResult> {
  const parsed = addressMutationSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const { supabase } = await requireUser(parsed.data.locale, `/${parsed.data.locale}/checkout`);
  const { data, error } = await supabase.rpc("set_default_user_address", { target_address_id: parsed.data.addressId });
  if (error) return { status: error.code === "42501" ? "forbidden" : "error" };
  if (!data) return { status: "forbidden" };
  revalidatePath(`/${parsed.data.locale}/checkout`);
  return { status: "success" };
}

const checkoutInputSchema = z.object({
  locale: commerceLocaleSchema,
  addressId: commerceUuidSchema,
  attemptId: commerceUuidSchema,
}).strict();

export async function createAwaitingPaymentOrders(input: unknown): Promise<CheckoutActionResult> {
  const parsed = checkoutInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const { supabase } = await requireUser(parsed.data.locale, `/${parsed.data.locale}/checkout`);
  const { data, error } = await supabase.rpc("create_awaiting_payment_orders", {
    target_address_id: parsed.data.addressId,
    checkout_attempt_id: parsed.data.attemptId,
  });
  if (error?.code === "42501") return { status: "forbidden" };
  if (error?.message.includes("empty_cart")) return { status: "empty" };
  if (error?.message.includes("invalid_product") || error?.message.includes("invalid_address")) return { status: "unavailable" };
  if (error || !data) return { status: "error" };
  const result = parseCheckoutRpcResult(data);
  revalidatePath(`/${parsed.data.locale}`, "layout");
  revalidatePath(`/${parsed.data.locale}/cart`);
  revalidatePath(`/${parsed.data.locale}/checkout`);
  revalidatePath(`/${parsed.data.locale}/account/orders`);
  return { status: "success", orderId: result.order_ids[0] };
}
