import { describe, expect, it } from "vitest";
import {
  adminProductReviewInputSchema,
  countAdminProductStatuses,
  filterAdminProducts,
  mapAdminProduct,
  parseAdminProductFilters,
} from "@/lib/admin-products";
import { adminProductsUi } from "@/lib/i18n";

const baseRow = {
  id: "11111111-1111-4111-8111-111111111111",
  producer_id: "22222222-2222-4222-8222-222222222222",
  category_id: "33333333-3333-4333-8333-333333333333",
  slug: "seramik-kupa",
  title_tr: "Seramik Kupa",
  title_en: "Ceramic Mug",
  description_tr: "Elde şekillendirilen ve günlük kullanıma uygun seramik kupa açıklaması.",
  description_en: "A handmade ceramic mug suitable for thoughtful everyday use.",
  price_minor: 12500,
  currency: "TRY",
  status: "pending" as const,
  stock_mode: "made_to_order" as const,
  stock_quantity: null,
  preparation_days: 4,
  city: "İzmir",
  district: "Urla",
  rejection_reason: null,
  reviewed_at: null,
  reviewed_by: null,
  created_at: "2026-08-01T10:00:00.000Z",
  updated_at: "2026-08-01T10:00:00.000Z",
  category: { id: "33333333-3333-4333-8333-333333333333", slug: "seramik", name_tr: "Seramik", name_en: "Ceramics", kind: "craft" as const, active: true },
  producer: {
    id: "22222222-2222-4222-8222-222222222222",
    display_name: "Ada Atölye",
    city: "İzmir",
    district: "Urla",
    neighborhood_public: null,
    status: "active" as const,
    producer_profile: { story_tr: "El yapımı üretim.", story_en: "Handmade production.", verification_status: "approved" as const, approximate_area: "Urla çevresi" },
  },
  reviewer: null,
  images: [{ id: "44444444-4444-4444-8444-444444444444", storage_path: "seller/path.webp", alt_tr: "Seramik kupa", alt_en: "Ceramic mug", sort_order: 0 }],
};

function product(overrides: Record<string, unknown> = {}) {
  const mapped = mapAdminProduct({ ...baseRow, ...overrides }, (path) => `https://example.supabase.co/storage/v1/object/public/product-images/${path}`);
  if (!mapped) throw new Error("Fixture could not be mapped");
  return mapped;
}

describe("admin product review model", () => {
  it("parses safe filters and defaults invalid input", () => {
    expect(parseAdminProductFilters({ status: "approved", query: " kupa ", page: "2" })).toEqual({ status: "approved", query: "kupa", page: 2 });
    expect(parseAdminProductFilters({ status: "hidden", query: "", page: 1 }).status).toBe("pending");
  });

  it("filters pending, approved, rejected, and localized search values", () => {
    const products = [
      product(),
      product({ id: "55555555-5555-4555-8555-555555555555", status: "approved", slug: "ahsap-kase", title_tr: "Ahşap Kase", reviewed_at: "2026-08-03T10:00:00.000Z" }),
      product({ id: "66666666-6666-4666-8666-666666666666", status: "rejected", slug: "tekstil-canta", title_tr: "Tekstil Çanta", rejection_reason: "Ürün açıklaması malzeme bilgisini içermiyor.", reviewed_at: "2026-08-02T10:00:00.000Z" }),
    ];
    expect(filterAdminProducts(products, "pending", "").map((item) => item.status)).toEqual(["pending"]);
    expect(filterAdminProducts(products, "approved", "")).toHaveLength(1);
    expect(filterAdminProducts(products, "rejected", "")).toHaveLength(1);
    expect(filterAdminProducts(products, "all", "seramik")).toHaveLength(1);
    expect(filterAdminProducts(products, "all", "ADA ATÖLYE")).toHaveLength(3);
  });

  it("counts real product statuses without inventing business metrics", () => {
    const counts = countAdminProductStatuses([product(), product({ status: "approved" }), product({ status: "rejected" })]);
    expect(counts).toEqual({ pending: 1, approved: 1, rejected: 1, total: 3 });
  });

  it("requires a trimmed 10-1000 character rejection reason", () => {
    const input = { locale: "tr", productId: baseRow.id, action: "reject" };
    expect(adminProductReviewInputSchema.safeParse({ ...input, rejectionReason: "" }).success).toBe(false);
    expect(adminProductReviewInputSchema.safeParse({ ...input, rejectionReason: "çok kısa" }).success).toBe(false);
    expect(adminProductReviewInputSchema.safeParse({ ...input, rejectionReason: "x".repeat(1_001) }).success).toBe(false);
    expect(adminProductReviewInputSchema.safeParse({ ...input, rejectionReason: "  Yeterli bir ret gerekçesi.  " }).success).toBe(true);
    expect(adminProductReviewInputSchema.safeParse({ ...input, action: "approve", rejectionReason: "" }).success).toBe(true);
  });

  it("rejects client-supplied review audit and ownership fields", () => {
    expect(adminProductReviewInputSchema.safeParse({ locale: "tr", productId: baseRow.id, action: "approve", rejectionReason: "", reviewedBy: baseRow.producer_id }).success).toBe(false);
  });

  it("provides the required Turkish and English review messages", () => {
    expect(adminProductsUi.tr.title).toBe("Ürün değerlendirmeleri");
    expect(adminProductsUi.en.title).toBe("Product reviews");
    expect(adminProductsUi.tr.approveConfirm).toContain("katalogda yayımlanacak");
    expect(adminProductsUi.en.staleProduct).toContain("already reviewed");
  });
});
