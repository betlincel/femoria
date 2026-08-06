import { describe, expect, it } from "vitest";
import {
  adminCancelOrderSchema,
  filterAdminOrderSearch,
  mapAdminOrder,
  parseAdminOrderFilters,
} from "@/lib/admin-orders";

const buyerId = "11111111-1111-4111-8111-111111111111";
const producerId = "22222222-2222-4222-8222-222222222222";
const orderId = "33333333-3333-4333-8333-333333333333";
const groupId = "44444444-4444-4444-8444-444444444444";
const attemptId = "55555555-5555-4555-8555-555555555555";
const itemId = "66666666-6666-4666-8666-666666666666";
const productId = "77777777-7777-4777-8777-777777777777";

const row = {
  id: orderId,
  checkout_group_id: groupId,
  checkout_attempt_id: attemptId,
  buyer_id: buyerId,
  producer_id: producerId,
  producer_name_snapshot: "Ayşe'nin Atölyesi",
  order_number: "FM-1234567890ABCDEF",
  order_status: "awaiting_payment",
  payment_status: "unpaid",
  currency: "TRY",
  subtotal_minor: 12500,
  shipping_minor: 0,
  total_minor: 12500,
  recipient_name: "İpek Yılmaz",
  phone: "+905551112233",
  city: "İzmir",
  district: "Urla",
  neighborhood: "İskele",
  address_line: "Örnek teslimat adresi",
  postal_code: null,
  delivery_note: null,
  shipping_carrier: null,
  tracking_number: null,
  tracking_url: null,
  shipped_at: null,
  cancellation_reason: null,
  cancelled_at: null,
  cancelled_by: null,
  created_at: "2026-08-05T10:00:00.000Z",
  updated_at: "2026-08-05T10:00:00.000Z",
  paid_at: null,
  expires_at: "2026-08-06T10:00:00.000Z",
  buyer: {
    id: buyerId,
    display_name: "İpek Yılmaz",
    role: "buyer",
    status: "active",
  },
  producer: {
    id: producerId,
    display_name: "Ayşe Usta",
    role: "producer",
    status: "active",
    producer_profile: { verification_status: "approved" },
  },
  canceller: null,
  items: [
    {
      id: itemId,
      product_id: productId,
      product_slug_snapshot: "seramik-kupa",
      product_title_tr_snapshot: "Seramik Kupa",
      product_title_en_snapshot: "Ceramic Mug",
      unit_price_minor: 12500,
      quantity: 1,
      line_total_minor: 12500,
      image_path_snapshot: "seller/product/image.webp",
      created_at: "2026-08-05T10:00:00.000Z",
      product: { id: productId, slug: "seramik-kupa" },
    },
  ],
} as const;

describe("admin order boundary models", () => {
  it("validates filter query parameters and falls back safely", () => {
    expect(
      parseAdminOrderFilters({ status: "paid", query: " FM-12 " }),
    ).toEqual({
      status: "paid",
      query: "FM-12",
    });
    expect(parseAdminOrderFilters({ status: "unknown", query: "x" })).toEqual({
      status: "all",
      query: "",
    });
  });

  it("accepts only locale, order ID, and a bounded cancellation reason", () => {
    const valid = {
      locale: "tr",
      orderId,
      reason: "  Teslimat mümkün değil  ",
    };
    expect(adminCancelOrderSchema.safeParse(valid).success).toBe(true);
    expect(
      adminCancelOrderSchema.safeParse({ ...valid, reason: "kısa" }).success,
    ).toBe(false);
    expect(
      adminCancelOrderSchema.safeParse({ ...valid, paymentStatus: "unpaid" })
        .success,
    ).toBe(false);
    expect(
      adminCancelOrderSchema.safeParse({ ...valid, adminId: buyerId }).success,
    ).toBe(false);
  });

  it("maps profile relations and preserves immutable item snapshots", () => {
    const order = mapAdminOrder(
      row,
      (path) => `https://images.example/${path}`,
    );
    expect(order?.buyer.display_name).toBe("İpek Yılmaz");
    expect(order?.producer.producerProfile?.verification_status).toBe(
      "approved",
    );
    expect(order?.items[0]?.product_title_tr_snapshot).toBe("Seramik Kupa");
    expect(order?.items[0]?.unit_price_minor).toBe(12500);
    expect(order?.items[0]?.imageUrl).toContain("seller/product/image.webp");
  });

  it("searches order, buyer, recipient, and producer names with Turkish normalization", () => {
    const order = mapAdminOrder(row, (path) => path);
    expect(order).not.toBeNull();
    if (!order) return;
    expect(filterAdminOrderSearch([order], "ipek")).toHaveLength(1);
    expect(filterAdminOrderSearch([order], "AYŞE")).toHaveLength(1);
    expect(filterAdminOrderSearch([order], "FM-1234")).toHaveLength(1);
    expect(filterAdminOrderSearch([order], "başka")).toHaveLength(0);
  });
});
