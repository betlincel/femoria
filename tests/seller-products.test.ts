import { describe, expect, it } from "vitest";
import {
  canCreateProduct, canDeleteProduct, canEditProduct, canManageProductImages,
  canSubmitProductForReview, getSellerAccessState, type AccessProfile,
} from "@/lib/account-access";
import { sellerUi } from "@/lib/i18n";
import {
  SELLER_IMAGE_MAX_BYTES, sellerImageOrderSchema, sellerPriceToMinor,
  sellerProductInputSchema, sellerStockQuantity, suggestSellerProductSlug,
  validateSellerImageFile,
} from "@/lib/seller-products";

const active: AccessProfile = { role: "user", status: "active" };
const approved = { verification_status: "approved" as const };
const pending = { verification_status: "pending" as const };
const rejected = { verification_status: "rejected" as const };
const validInput = {
  categoryId: "11111111-1111-4111-8111-111111111111", slug: "el-yapimi-kupa",
  titleTr: "El Yapımı Kupa", titleEn: "Handmade Mug",
  descriptionTr: "Malzeme, üretim ve bakım ayrıntılarını açıklayan yeterli Türkçe metin.",
  descriptionEn: "A sufficiently detailed English description of materials and care.",
  price: "325,50", currency: "TRY" as const, city: "Ankara", district: "Çankaya",
  stockMode: "in_stock" as const, stockQuantity: "4", preparationDays: 3,
};

describe("seller access and product validation", () => {
  it("allows only active approved sellers, not role alone", () => {
    expect(getSellerAccessState(active, approved)).toBe("approved");
    expect(getSellerAccessState(active, pending)).toBe("pending");
    expect(getSellerAccessState(active, rejected)).toBe("rejected");
    expect(getSellerAccessState({ ...active, status: "suspended" }, approved)).toBe("suspended");
    expect(canCreateProduct(active, approved)).toBe(true);
    expect(canCreateProduct(active, pending)).toBe(false);
    const admin: AccessProfile = { role: "admin", status: "active" };
    expect(canCreateProduct(admin, null)).toBe(false);
    expect(canCreateProduct(admin, approved)).toBe(true);
  });

  it("edits, submits, deletes, and manages images only for draft or rejected products", () => {
    for (const status of ["draft", "rejected"] as const) {
      expect(canEditProduct(active, approved, status)).toBe(true);
      expect(canSubmitProductForReview(active, approved, status)).toBe(true);
      expect(canDeleteProduct(active, approved, status)).toBe(true);
      expect(canManageProductImages(active, approved, status)).toBe(true);
    }
    expect(canEditProduct(active, approved, "pending")).toBe(false);
    expect(canEditProduct(active, approved, "approved")).toBe(false);
  });

  it("strictly rejects arbitrary producer, status, and timestamp fields", () => {
    expect(sellerProductInputSchema.safeParse(validInput).success).toBe(true);
    expect(sellerProductInputSchema.safeParse({ ...validInput, producerId: crypto.randomUUID() }).success).toBe(false);
    expect(sellerProductInputSchema.safeParse({ ...validInput, status: "approved" }).success).toBe(false);
    expect(sellerProductInputSchema.safeParse({ ...validInput, createdAt: new Date().toISOString() }).success).toBe(false);
  });

  it("converts prices to minor units and rejects zero", () => {
    expect(sellerPriceToMinor("325,50")).toBe(32550);
    expect(sellerPriceToMinor("10")).toBe(1000);
    expect(sellerProductInputSchema.safeParse({ ...validInput, price: "0" }).success).toBe(false);
  });

  it("enforces stock mode rules", () => {
    expect(sellerProductInputSchema.safeParse({ ...validInput, stockMode: "in_stock", stockQuantity: "" }).success).toBe(false);
    expect(sellerProductInputSchema.safeParse({ ...validInput, stockMode: "unavailable", stockQuantity: "3" }).success).toBe(false);
    const madeToOrder = sellerProductInputSchema.parse({ ...validInput, stockMode: "made_to_order", stockQuantity: "" });
    expect(sellerStockQuantity(madeToOrder)).toBeNull();
  });

  it("generates a safe editable slug from Turkish text", () => {
    expect(suggestSellerProductSlug("İpek Şal & Örgü Çanta")).toBe("ipek-sal-orgu-canta");
  });

  it("validates jpg, png, and webp magic bytes and rejects SVG", async () => {
    const jpg = new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], "photo.jpg", { type: "image/jpeg" });
    const png = new File([new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])], "photo.png", { type: "image/png" });
    const webp = new File([new TextEncoder().encode("RIFF0000WEBP")], "photo.webp", { type: "image/webp" });
    const svg = new File(["<svg></svg>"], "photo.svg", { type: "image/svg+xml" });
    expect(await validateSellerImageFile(jpg)).toEqual({ valid: true, extension: "jpg" });
    expect(await validateSellerImageFile(png)).toEqual({ valid: true, extension: "png" });
    expect(await validateSellerImageFile(webp)).toEqual({ valid: true, extension: "webp" });
    expect(await validateSellerImageFile(svg)).toEqual({ valid: false });
  });

  it("rejects MIME-extension mismatch and files above 5 MB", async () => {
    const mismatch = new File([new Uint8Array([0xff, 0xd8, 0xff])], "photo.png", { type: "image/jpeg" });
    const large = new File([new Uint8Array(SELLER_IMAGE_MAX_BYTES + 1)], "large.jpg", { type: "image/jpeg" });
    expect(await validateSellerImageFile(mismatch)).toEqual({ valid: false });
    expect(await validateSellerImageFile(large)).toEqual({ valid: false });
  });

  it("requires unique image order IDs and caps ordering at six images", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(sellerImageOrderSchema.safeParse({ productId: id, imageIds: [id] }).success).toBe(true);
    expect(sellerImageOrderSchema.safeParse({ productId: id, imageIds: [id, id] }).success).toBe(false);
    expect(sellerImageOrderSchema.safeParse({ productId: id, imageIds: Array.from({ length: 7 }, () => crypto.randomUUID()) }).success).toBe(false);
  });

  it("contains Turkish and English form and status copy", () => {
    expect(sellerUi.tr.dashboardTitle).toBe("Üretici paneli");
    expect(sellerUi.en.newProduct).toBe("Add new product");
    expect(sellerUi.tr.needImage).toContain("en az bir görsel");
    expect(sellerUi.en.approvedChangeSoon).toContain("change-request system");
  });
});
