"use server";

import { revalidatePath } from "next/cache";
import {
  sellerOrderMutationSchema,
  sellerShippingInputSchema,
} from "@/lib/commerce";
import { requireApprovedSeller } from "@/lib/supabase/seller";

export type SellerOrderActionResult = {
  status: "success" | "invalid" | "forbidden" | "conflict" | "error";
};

function revalidateSellerOrderPaths(locale: "tr" | "en", orderId: string) {
  revalidatePath(`/${locale}/seller`);
  revalidatePath(`/${locale}/seller/orders`);
  revalidatePath(`/${locale}/seller/orders/${orderId}`);
  revalidatePath(`/${locale}/account/orders`);
  revalidatePath(`/${locale}/account/orders/${orderId}`);
}

export async function markSellerOrderPreparing(
  input: unknown,
): Promise<SellerOrderActionResult> {
  const parsed = sellerOrderMutationSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const access = await requireApprovedSeller(
    parsed.data.locale,
    `/${parsed.data.locale}/seller/orders/${parsed.data.orderId}`,
  );
  if (!access.approved) return { status: "forbidden" };
  const { data, error } = await access.supabase.rpc(
    "mark_seller_order_preparing",
    {
      target_order_id: parsed.data.orderId,
    },
  );
  if (error?.code === "42501") return { status: "forbidden" };
  if (error) return { status: "error" };
  if (!data) return { status: "conflict" };
  revalidateSellerOrderPaths(parsed.data.locale, parsed.data.orderId);
  return { status: "success" };
}

export async function markSellerOrderShipped(
  input: unknown,
): Promise<SellerOrderActionResult> {
  const parsed = sellerShippingInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const access = await requireApprovedSeller(
    parsed.data.locale,
    `/${parsed.data.locale}/seller/orders/${parsed.data.orderId}`,
  );
  if (!access.approved) return { status: "forbidden" };
  const { data, error } = await access.supabase.rpc(
    "mark_seller_order_shipped",
    {
      target_order_id: parsed.data.orderId,
      input_shipping_carrier: parsed.data.carrier,
      input_tracking_number: parsed.data.trackingNumber,
      input_tracking_url: parsed.data.trackingUrl || null,
    },
  );
  if (error?.code === "42501") return { status: "forbidden" };
  if (error?.message.includes("invalid_tracking")) return { status: "invalid" };
  if (error) return { status: "error" };
  if (!data) return { status: "conflict" };
  revalidateSellerOrderPaths(parsed.data.locale, parsed.data.orderId);
  return { status: "success" };
}
