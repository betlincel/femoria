import { z } from "zod";

export const adminOrderFilterSchema = z.enum([
  "all",
  "awaiting_payment",
  "paid",
  "unpaid",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "expired",
  "failed",
  "refunded",
]);

export type AdminOrderFilter = z.infer<typeof adminOrderFilterSchema>;

export const adminOrderFiltersSchema = z
  .object({
    status: adminOrderFilterSchema.default("all"),
    query: z.string().trim().max(80).default(""),
  })
  .strict();

export function parseAdminOrderFilters(value: unknown) {
  const parsed = adminOrderFiltersSchema.safeParse(value);
  return parsed.success ? parsed.data : { status: "all" as const, query: "" };
}

export const adminOrderIdSchema = z.string().uuid();

export const adminOrderMutationSchema = z
  .object({
    locale: z.enum(["tr", "en"]),
    orderId: adminOrderIdSchema,
  })
  .strict();

export const adminCancelOrderSchema = adminOrderMutationSchema
  .extend({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export type AdminOrderActionResult = {
  status: "success" | "invalid" | "forbidden" | "conflict" | "error";
};

const orderStatusSchema = z.enum([
  "awaiting_payment",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "expired",
]);

const paymentStatusSchema = z.enum([
  "unpaid",
  "pending",
  "paid",
  "failed",
  "refunded",
]);

const profileSchema = z
  .object({
    id: z.string().uuid(),
    display_name: z.string().trim().min(1),
    role: z.enum(["user", "buyer", "producer", "admin"]),
    status: z.enum(["active", "suspended"]),
  })
  .strict();

const producerProfileSchema = z
  .object({
    verification_status: z.enum(["pending", "approved", "rejected"]),
  })
  .strict();

const producerSchema = profileSchema
  .extend({
    producer_profile: z
      .union([producerProfileSchema, z.array(producerProfileSchema)])
      .nullable(),
  })
  .strict();

const currentProductSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().min(1),
  })
  .strict();

const adminOrderItemSchema = z
  .object({
    id: z.string().uuid(),
    product_id: z.string().uuid().nullable(),
    product_slug_snapshot: z.string(),
    product_title_tr_snapshot: z.string(),
    product_title_en_snapshot: z.string(),
    unit_price_minor: z.number().int().positive(),
    quantity: z.number().int().min(1).max(20),
    line_total_minor: z.number().int().positive(),
    image_path_snapshot: z.string().nullable(),
    created_at: z.string(),
    product: z
      .union([currentProductSchema, z.array(currentProductSchema)])
      .nullable(),
  })
  .strict();

const adminOrderRowSchema = z
  .object({
    id: z.string().uuid(),
    checkout_group_id: z.string().uuid(),
    checkout_attempt_id: z.string().uuid(),
    buyer_id: z.string().uuid(),
    producer_id: z.string().uuid(),
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
    tracking_url: z.string().nullable(),
    shipped_at: z.string().nullable(),
    cancellation_reason: z.string().nullable(),
    cancelled_at: z.string().nullable(),
    cancelled_by: z.string().uuid().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    paid_at: z.string().nullable(),
    expires_at: z.string().nullable(),
    buyer: z.union([profileSchema, z.array(profileSchema)]),
    producer: z.union([producerSchema, z.array(producerSchema)]),
    canceller: z.union([profileSchema, z.array(profileSchema)]).nullable(),
    items: z.array(adminOrderItemSchema),
  })
  .strict();

type AdminOrderRow = z.infer<typeof adminOrderRowSchema>;
type Profile = z.infer<typeof profileSchema>;
type Producer = z.infer<typeof producerSchema>;
type ProducerProfile = z.infer<typeof producerProfileSchema>;
type CurrentProduct = z.infer<typeof currentProductSchema>;
type AdminOrderItem = z.infer<typeof adminOrderItemSchema>;

export type AdminOrder = Omit<
  AdminOrderRow,
  "buyer" | "producer" | "canceller" | "items"
> & {
  buyer: Profile;
  producer: Omit<Producer, "producer_profile"> & {
    producerProfile: ProducerProfile | null;
  };
  canceller: Profile | null;
  items: Array<
    Omit<AdminOrderItem, "product"> & {
      product: CurrentProduct | null;
      imageUrl: string;
    }
  >;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function mapAdminOrder(
  value: unknown,
  imageUrl: (storagePath: string) => string,
): AdminOrder | null {
  const parsed = adminOrderRowSchema.safeParse(value);
  if (!parsed.success) return null;
  const buyer = firstRelation(parsed.data.buyer);
  const producer = firstRelation(parsed.data.producer);
  if (!buyer || !producer) return null;

  return {
    ...parsed.data,
    buyer,
    producer: {
      ...producer,
      producerProfile: firstRelation(producer.producer_profile),
    },
    canceller: firstRelation(parsed.data.canceller),
    items: parsed.data.items.map((item) => ({
      ...item,
      product: firstRelation(item.product),
      imageUrl: item.image_path_snapshot
        ? imageUrl(item.image_path_snapshot)
        : "/brand/product-placeholder.svg",
    })),
  };
}

export function normalizeAdminOrderSearch(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("tr-TR");
}

export function filterAdminOrderSearch(
  orders: AdminOrder[],
  query: string,
): AdminOrder[] {
  const normalizedQuery = normalizeAdminOrderSearch(query);
  if (!normalizedQuery) return orders;
  return orders.filter((order) =>
    [
      order.order_number,
      order.buyer.display_name,
      order.recipient_name,
      order.producer.display_name,
      order.producer_name_snapshot,
    ].some((value) =>
      normalizeAdminOrderSearch(value).includes(normalizedQuery),
    ),
  );
}
