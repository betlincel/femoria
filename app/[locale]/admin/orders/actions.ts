"use server";

import { revalidatePath } from "next/cache";
import {
  adminCancelOrderSchema,
  adminOrderMutationSchema,
  type AdminOrderActionResult,
} from "@/lib/admin-orders";
import { hasActiveAdminProfile } from "@/lib/supabase/admin";
import {
  cancelAdminOrderRpc,
  expireAdminOrderRpc,
} from "@/lib/supabase/admin-orders";
import { createClient } from "@/lib/supabase/server";

function revalidateOrderSurfaces(orderId: string) {
  for (const locale of ["tr", "en"] as const) {
    revalidatePath(`/${locale}/admin/orders`);
    revalidatePath(`/${locale}/admin/orders/${orderId}`);
    revalidatePath(`/${locale}/account/orders`);
    revalidatePath(`/${locale}/account/orders/${orderId}`);
    revalidatePath(`/${locale}/seller/orders`);
    revalidatePath(`/${locale}/seller/orders/${orderId}`);
  }
}

async function getAuthorizedAdminClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  try {
    return (await hasActiveAdminProfile(supabase, data.user.id))
      ? supabase
      : null;
  } catch {
    return null;
  }
}

export async function cancelAdminOrder(
  input: unknown,
): Promise<AdminOrderActionResult> {
  const parsed = adminCancelOrderSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const supabase = await getAuthorizedAdminClient();
  if (!supabase) return { status: "forbidden" };

  const { data, error } = await cancelAdminOrderRpc(
    supabase,
    parsed.data.orderId,
    parsed.data.reason,
  );
  if (error?.code === "42501") return { status: "forbidden" };
  if (error?.message.includes("invalid_cancellation_reason")) {
    return { status: "invalid" };
  }
  if (error) return { status: "error" };
  if (!data) return { status: "conflict" };

  revalidateOrderSurfaces(parsed.data.orderId);
  return { status: "success" };
}

export async function expireAdminOrder(
  input: unknown,
): Promise<AdminOrderActionResult> {
  const parsed = adminOrderMutationSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const supabase = await getAuthorizedAdminClient();
  if (!supabase) return { status: "forbidden" };

  const { data, error } = await expireAdminOrderRpc(
    supabase,
    parsed.data.orderId,
  );
  if (error?.code === "42501") return { status: "forbidden" };
  if (error) return { status: "error" };
  if (!data) return { status: "conflict" };

  revalidateOrderSurfaces(parsed.data.orderId);
  return { status: "success" };
}
