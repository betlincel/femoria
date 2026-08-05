import { describe, expect, it } from "vitest";
import {
  mapCatalogProduct,
  PRODUCT_IMAGE_FALLBACK,
} from "@/lib/catalog-mapper";

const productId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";
const producerId = "33333333-3333-4333-8333-333333333333";

function catalogRow() {
  return {
    id: productId,
    slug: "ev-yapimi-eriste",
    title_tr: "Ev yapımı erişte",
    title_en: "Homemade noodles",
    description_tr: "Geleneksel yöntemlerle hazırlandı.",
    description_en: "Prepared with traditional methods.",
    price_minor: 14550,
    currency: "TRY",
    status: "approved",
    stock_mode: "in_stock",
    stock_quantity: 4,
    preparation_days: 0,
    city: "İzmir",
    district: "Urla",
    category: {
      id: categoryId,
      slug: "dried",
      name_tr: "Kurutulmuş Ürünler",
      name_en: "Dried Goods",
      kind: "food",
      active: true,
      sort_order: 3,
    },
    producer: {
      id: producerId,
      role: "user",
      display_name: "Emine'nin Kileri",
      status: "active",
      producer_profile: {
        story_tr: "Mevsiminde üretir.",
        story_en: "Produces in season.",
        verification_status: "approved",
        approximate_area: "Urla çevresi",
      },
    },
    images: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        storage_path: "products/second.webp",
        alt_tr: "İkinci görsel",
        alt_en: "Second image",
        sort_order: 2,
      },
      {
        id: "55555555-5555-4555-8555-555555555555",
        storage_path: "products/main.webp",
        alt_tr: "Ana görsel",
        alt_en: "Main image",
        sort_order: 0,
      },
    ],
  };
}

describe("catalog row mapper", () => {
  it("maps approved rows and picks the lowest image sort order", () => {
    const product = mapCatalogProduct(
      catalogRow(),
      (path) => `https://storage.example/${path}`,
    );

    expect(product).toMatchObject({
      id: productId,
      slug: "ev-yapimi-eriste",
      world: "kitchen",
      category: "dried",
      producer: "Emine'nin Kileri",
      price: 145.5,
      currency: "TRY",
      image: "https://storage.example/products/main.webp",
    });
    expect(product?.imageAlt?.tr).toBe("Ana görsel");
  });

  it("uses the local placeholder when an image is missing", () => {
    const row = { ...catalogRow(), images: [] };
    const product = mapCatalogProduct(row, (path) => path);
    expect(product?.image).toBe(PRODUCT_IMAGE_FALLBACK);
  });

  it("does not expose products from an unapproved producer", () => {
    const row = catalogRow();
    row.producer.producer_profile.verification_status = "pending";
    expect(mapCatalogProduct(row, (path) => path)).toBeNull();
  });

  it("does not expose products from a suspended producer profile owner", () => {
    const row = catalogRow();
    row.producer.status = "suspended";
    expect(mapCatalogProduct(row, (path) => path)).toBeNull();
  });

  it("does not grant seller catalog visibility to an administrator role", () => {
    const row = catalogRow();
    row.producer.role = "admin";
    expect(mapCatalogProduct(row, (path) => path)).toBeNull();
  });
});
