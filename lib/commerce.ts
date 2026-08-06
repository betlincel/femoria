import { z } from "zod";
import type { Locale } from "./types";

export const commerceLocaleSchema = z.enum(["tr", "en"]);
export const commerceUuidSchema = z.string().uuid();
export const cartQuantitySchema = z.number().int().min(1).max(20);

export const cartMutationInputSchema = z.object({
  locale: commerceLocaleSchema,
  productId: commerceUuidSchema,
  quantity: cartQuantitySchema.default(1),
  returnTo: z.string().max(500),
}).strict();

export const cartItemMutationInputSchema = z.object({
  locale: commerceLocaleSchema,
  itemId: commerceUuidSchema,
  quantity: cartQuantitySchema.optional(),
}).strict();

const cartItemSchema = z.object({
  id: commerceUuidSchema,
  product_id: commerceUuidSchema,
  quantity: cartQuantitySchema,
  slug: z.string().min(1),
  title_tr: z.string(),
  title_en: z.string(),
  price_minor: z.number().int().positive(),
  currency: z.literal("TRY"),
  stock_mode: z.enum(["in_stock", "made_to_order", "unavailable"]),
  stock_quantity: z.number().int().nonnegative().nullable(),
  preparation_days: z.number().int().min(0).max(365),
  producer_id: commerceUuidSchema,
  producer_name: z.string().min(1),
  image_path: z.string().nullable(),
  invalid_reason: z.enum(["own_product", "unavailable", "insufficient_stock"]).nullable(),
}).strict();

const cartSnapshotSchema = z.object({
  quantity: z.number().int().nonnegative(),
  subtotal_minor: z.number().int().nonnegative(),
  items: z.array(cartItemSchema),
}).strict();

export type CartItem = z.infer<typeof cartItemSchema> & { imageUrl: string };
export type CartSnapshot = Omit<z.infer<typeof cartSnapshotSchema>, "items"> & { items: CartItem[] };

export function parseCartSnapshot(value: unknown, imageUrl: (path: string) => string): CartSnapshot {
  const parsed = cartSnapshotSchema.safeParse(value);
  if (!parsed.success) throw new Error("Cart data is invalid.");
  return {
    ...parsed.data,
    items: parsed.data.items.map((item) => ({
      ...item,
      imageUrl: item.image_path ? imageUrl(item.image_path) : "/brand/product-placeholder.svg",
    })),
  };
}

export const addressSchema = z.object({
  id: commerceUuidSchema,
  profile_id: commerceUuidSchema,
  label: z.string(),
  recipient_name: z.string(),
  phone: z.string(),
  city: z.string(),
  district: z.string(),
  neighborhood: z.string().nullable(),
  address_line: z.string(),
  postal_code: z.string().nullable(),
  delivery_instructions: z.string().nullable(),
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
}).strict();
export type UserAddress = z.infer<typeof addressSchema>;

export const addressInputSchema = z.object({
  locale: commerceLocaleSchema,
  addressId: z.union([z.literal(""), commerceUuidSchema]).default(""),
  label: z.string().trim().min(2).max(50),
  recipientName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(30).refine((value) => {
    const digits = value.replace(/\D/g, "");
    return /^(?:0?5\d{9}|905\d{9})$/.test(digits);
  }),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  neighborhood: z.string().trim().min(2).max(120),
  addressLine: z.string().trim().min(10).max(500),
  postalCode: z.string().trim().max(20),
  deliveryNote: z.string().trim().max(500),
  isDefault: z.boolean(),
}).strict();

export type AddressInput = z.infer<typeof addressInputSchema>;

export function parseAddressFormData(formData: FormData) {
  return addressInputSchema.safeParse({
    locale: formData.get("locale"),
    addressId: formData.get("addressId") ?? "",
    label: formData.get("label"),
    recipientName: formData.get("recipientName"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    district: formData.get("district"),
    neighborhood: formData.get("neighborhood"),
    addressLine: formData.get("addressLine"),
    postalCode: formData.get("postalCode") ?? "",
    deliveryNote: formData.get("deliveryNote") ?? "",
    isDefault: formData.get("isDefault") === "on",
  });
}

export const orderStatusSchema = z.enum(["awaiting_payment", "confirmed", "preparing", "shipped", "delivered", "cancelled", "expired"]);
export const paymentStatusSchema = z.enum(["unpaid", "pending", "paid", "failed", "refunded"]);
export const sellerOrderFilterSchema = z.enum(["all", "awaiting_payment", "confirmed", "preparing", "shipped", "delivered", "cancelled", "expired"]);

export const sellerOrderMutationSchema = z.object({
  locale: commerceLocaleSchema,
  orderId: commerceUuidSchema,
}).strict();

export const sellerShippingInputSchema = sellerOrderMutationSchema.extend({
  carrier: z.string().trim().min(2).max(80),
  trackingNumber: z.string().trim().min(2).max(120),
  trackingUrl: z.union([z.literal(""), z.string().trim().url().max(500).refine((value) => /^https?:\/\//i.test(value))]),
}).strict();

const orderItemSchema = z.object({
  id: commerceUuidSchema,
  product_id: commerceUuidSchema.nullable(),
  product_slug_snapshot: z.string(),
  product_title_tr_snapshot: z.string(),
  product_title_en_snapshot: z.string(),
  unit_price_minor: z.number().int().positive(),
  quantity: cartQuantitySchema,
  line_total_minor: z.number().int().positive(),
  image_path_snapshot: z.string().nullable(),
  created_at: z.string(),
}).strict();

export const orderSchema = z.object({
  id: commerceUuidSchema,
  checkout_group_id: commerceUuidSchema,
  producer_id: commerceUuidSchema,
  producer_name_snapshot: z.string(),
  order_number: z.string(),
  order_status: orderStatusSchema,
  payment_status: paymentStatusSchema,
  currency: z.literal("TRY"),
  subtotal_minor: z.number().int().positive(),
  shipping_minor: z.number().int().nonnegative(),
  total_minor: z.number().int().positive(),
  recipient_name: z.string(),
  phone: z.string(),
  city: z.string(),
  district: z.string(),
  neighborhood: z.string(),
  address_line: z.string(),
  postal_code: z.string().nullable(),
  delivery_note: z.string().nullable(),
  shipping_carrier: z.string().nullable(),
  tracking_number: z.string().nullable(),
  tracking_url: z.string().url().refine((value) => /^https?:\/\//i.test(value)).nullable(),
  shipped_at: z.string().nullable(),
  cancellation_reason: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  created_at: z.string(),
  paid_at: z.string().nullable(),
  items: z.array(orderItemSchema),
}).strict();

export type BuyerOrder = Omit<z.infer<typeof orderSchema>, "items"> & {
  items: Array<z.infer<typeof orderItemSchema> & { imageUrl: string }>;
};

export const sellerOrderSchema = orderSchema.extend({
  phone: z.string().nullable(),
  neighborhood: z.string().nullable(),
  address_line: z.string().nullable(),
});

export type SellerOrder = Omit<z.infer<typeof sellerOrderSchema>, "items"> & {
  items: Array<z.infer<typeof orderItemSchema> & { imageUrl: string }>;
};

export function shouldShowBuyerPaymentNotice(
  paymentStatus: z.infer<typeof paymentStatusSchema>,
  orderStatus?: z.infer<typeof orderStatusSchema>,
) {
  if (orderStatus === "cancelled" || orderStatus === "expired") return false;
  return paymentStatus === "unpaid" || paymentStatus === "pending" || paymentStatus === "failed";
}

export function sellerCanViewDelivery(paymentStatus: z.infer<typeof paymentStatusSchema>) {
  return paymentStatus === "paid";
}

export function matchesSellerOrderFilter(
  order: Pick<SellerOrder, "order_status">,
  filter: z.infer<typeof sellerOrderFilterSchema>,
) {
  return filter === "all" || order.order_status === filter;
}

export const checkoutResultSchema = z.object({
  checkout_group_id: commerceUuidSchema,
  order_ids: z.array(commerceUuidSchema).min(1),
  total_minor: z.number().int().positive(),
}).strict();
export type CheckoutResult = z.infer<typeof checkoutResultSchema>;

export function localizeOrderTitle(item: z.infer<typeof orderItemSchema>, locale: Locale) {
  return locale === "tr"
    ? item.product_title_tr_snapshot || item.product_title_en_snapshot
    : item.product_title_en_snapshot || item.product_title_tr_snapshot;
}

export function formatMinorPrice(value: number, locale: Locale, currency = "TRY") {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency,
  }).format(value / 100);
}
