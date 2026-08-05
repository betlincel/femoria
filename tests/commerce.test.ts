import { describe, expect, it } from "vitest";
import { addressInputSchema, cartItemMutationInputSchema, cartMutationInputSchema, checkoutResultSchema, formatMinorPrice, parseCartSnapshot, sellerShippingInputSchema } from "@/lib/commerce";
import { commerceUi } from "@/lib/i18n";

const productId = "11111111-1111-4111-8111-111111111111";
const itemId = "22222222-2222-4222-8222-222222222222";

describe("commerce boundary models", () => {
  it("accepts only product id, safe quantity, locale, and return path for add-to-cart", () => {
    expect(cartMutationInputSchema.safeParse({ locale: "tr", productId, quantity: 1, returnTo: "/tr/products/x" }).success).toBe(true);
    expect(cartMutationInputSchema.safeParse({ locale: "tr", productId, quantity: 1, returnTo: "/tr/products/x", priceMinor: 1 }).success).toBe(false);
    expect(cartMutationInputSchema.safeParse({ locale: "tr", productId, quantity: 1, returnTo: "/tr/products/x", producerId: productId }).success).toBe(false);
  });

  it("rejects zero, twenty-one, and foreign-shaped cart mutations", () => {
    expect(cartItemMutationInputSchema.safeParse({ locale: "tr", itemId, quantity: 0 }).success).toBe(false);
    expect(cartItemMutationInputSchema.safeParse({ locale: "tr", itemId, quantity: 21 }).success).toBe(false);
    expect(cartItemMutationInputSchema.safeParse({ locale: "tr", itemId, quantity: 20 }).success).toBe(true);
  });

  it("parses current-price cart snapshots and preserves invalid reasons", () => {
    const cart = parseCartSnapshot({ quantity: 2, subtotal_minor: 25000, items: [{
      id: itemId, product_id: productId, quantity: 2, slug: "seramik-kupa", title_tr: "Seramik Kupa", title_en: "Ceramic Mug",
      price_minor: 12500, currency: "TRY", stock_mode: "in_stock", stock_quantity: 2, preparation_days: 1,
      producer_id: "33333333-3333-4333-8333-333333333333", producer_name: "Ada Atölye", image_path: null, invalid_reason: null,
    }] }, (path) => path);
    expect(cart.subtotal_minor).toBe(25000);
    expect(cart.items[0]?.imageUrl).toBe("/brand/product-placeholder.svg");
  });

  it("validates Turkish phones and address field bounds without accepting user ids", () => {
    const valid = { locale: "tr", addressId: "", label: "Ev", recipientName: "Ada Yılmaz", phone: "+90 555 111 22 33", city: "İzmir", district: "Urla", neighborhood: "İskele", addressLine: "Örnek sokak No 10", postalCode: "35430", deliveryNote: "", isDefault: true };
    expect(addressInputSchema.safeParse(valid).success).toBe(true);
    expect(addressInputSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
    expect(addressInputSchema.safeParse({ ...valid, userId: productId }).success).toBe(false);
  });

  it("requires a grouped checkout result with integer minor-unit total", () => {
    expect(checkoutResultSchema.safeParse({ checkout_group_id: productId, order_ids: [itemId], total_minor: 25000 }).success).toBe(true);
    expect(checkoutResultSchema.safeParse({ checkout_group_id: productId, order_ids: [], total_minor: 250.5 }).success).toBe(false);
    expect(formatMinorPrice(12500, "tr")).toContain("125");
  });

  it("provides complete TR and EN cart, checkout, and status messages", () => {
    expect(commerceUi.tr.cartTitle).toBe("Sepetim");
    expect(commerceUi.en.checkoutTitle).toBe("Order summary");
    expect(commerceUi.tr.orderStatus.awaiting_payment).toBe("Ödeme bekleniyor");
    expect(commerceUi.en.paymentStatus.unpaid).toBe("Unpaid");
  });

  it("validates seller shipping input without accepting payment or status fields", () => {
    const valid = { locale: "tr", orderId: productId, carrier: "PTT Kargo", trackingNumber: "TR123456", trackingUrl: "https://tracking.example/TR123456" };
    expect(sellerShippingInputSchema.safeParse(valid).success).toBe(true);
    expect(sellerShippingInputSchema.safeParse({ ...valid, trackingUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(sellerShippingInputSchema.safeParse({ ...valid, carrier: "" }).success).toBe(false);
    expect(sellerShippingInputSchema.safeParse({ ...valid, paymentStatus: "paid" }).success).toBe(false);
    expect(sellerShippingInputSchema.safeParse({ ...valid, orderStatus: "shipped" }).success).toBe(false);
  });
});
