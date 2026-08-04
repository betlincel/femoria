import { z } from "zod";

export const sellerProductStatusSchema = z.enum(["draft", "pending", "approved", "rejected"]);
export const sellerProductFilterSchema = z.enum(["all", "draft", "pending", "approved", "rejected"]);
export const sellerProductIdSchema = z.string().uuid();
export const sellerProductSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140);

const optionalLocalizedText = (minimum: number, maximum: number) => z.union([
  z.literal(""),
  z.string().trim().min(minimum).max(maximum),
]);

export const sellerProductInputSchema = z.object({
  categoryId: z.string().uuid(),
  slug: sellerProductSlugSchema,
  titleTr: z.string().trim().min(3).max(120),
  titleEn: optionalLocalizedText(3, 120),
  descriptionTr: z.string().trim().min(30).max(3_000),
  descriptionEn: optionalLocalizedText(30, 3_000),
  price: z.string().trim().regex(/^\d{1,9}(?:[.,]\d{1,2})?$/).refine((value) => {
    const amount = Number(value.replace(",", "."));
    return amount > 0 && amount <= 21_474_836.47;
  }),
  currency: z.literal("TRY"),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  stockMode: z.enum(["in_stock", "made_to_order", "unavailable"]),
  stockQuantity: z.union([z.literal(""), z.string().regex(/^\d{1,9}$/)]),
  preparationDays: z.coerce.number().int().min(0).max(60),
}).strict().superRefine((value, context) => {
  if (value.stockMode === "in_stock" && value.stockQuantity === "") {
    context.addIssue({ code: "custom", path: ["stockQuantity"], message: "required" });
  }
  if (value.stockMode === "unavailable" && value.stockQuantity !== "" && value.stockQuantity !== "0") {
    context.addIssue({ code: "custom", path: ["stockQuantity"], message: "unavailable" });
  }
});

export type SellerProductInput = z.infer<typeof sellerProductInputSchema>;

export type SellerProductActionState = {
  status: "idle" | "success" | "invalid" | "duplicate" | "forbidden" | "locked" | "error";
  productId?: string;
};

export const initialSellerProductActionState: SellerProductActionState = { status: "idle" };

export function parseSellerProductFormData(formData: FormData) {
  return sellerProductInputSchema.safeParse({
    categoryId: formData.get("categoryId"),
    slug: formData.get("slug"),
    titleTr: formData.get("titleTr"),
    titleEn: formData.get("titleEn"),
    descriptionTr: formData.get("descriptionTr"),
    descriptionEn: formData.get("descriptionEn"),
    price: formData.get("price"),
    currency: formData.get("currency"),
    city: formData.get("city"),
    district: formData.get("district"),
    stockMode: formData.get("stockMode"),
    stockQuantity: formData.get("stockQuantity"),
    preparationDays: formData.get("preparationDays"),
  });
}

export function sellerPriceToMinor(price: string): number {
  const normalized = price.replace(",", ".");
  const [whole, fractional = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fractional.padEnd(2, "0"));
}

export function sellerStockQuantity(input: SellerProductInput): number | null {
  if (input.stockMode === "made_to_order") return input.stockQuantity ? Number(input.stockQuantity) : null;
  if (input.stockMode === "unavailable") return input.stockQuantity === "0" ? 0 : null;
  return Number(input.stockQuantity);
}

const turkishSlugMap: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u",
  Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u",
};

export function suggestSellerProductSlug(title: string): string {
  return title
    .split("").map((character) => turkishSlugMap[character] ?? character).join("")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 140);
}

export const sellerImageMetadataSchema = z.object({
  productId: sellerProductIdSchema,
  altTr: z.string().trim().min(3).max(160),
  altEn: z.union([z.literal(""), z.string().trim().min(3).max(160)]),
}).strict();

export const sellerImageOrderSchema = z.object({
  productId: sellerProductIdSchema,
  imageIds: z.array(z.string().uuid()).min(1).max(6).refine((ids) => new Set(ids).size === ids.length),
}).strict();

export const SELLER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const imageTypeExtensions = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
} as const;

export type SellerImageValidation = { valid: true; extension: "jpg" | "png" | "webp" } | { valid: false };

export async function validateSellerImageFile(file: File): Promise<SellerImageValidation> {
  if (file.size <= 0 || file.size > SELLER_IMAGE_MAX_BYTES) return { valid: false };
  const allowedExtensions = imageTypeExtensions[file.type as keyof typeof imageTypeExtensions];
  if (!allowedExtensions) return { valid: false };
  const originalExtension = file.name.split(".").pop()?.toLowerCase();
  if (!originalExtension || !(allowedExtensions as readonly string[]).includes(originalExtension)) return { valid: false };
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (file.type === "image/jpeg" && jpeg) return { valid: true, extension: "jpg" };
  if (file.type === "image/png" && png) return { valid: true, extension: "png" };
  if (file.type === "image/webp" && webp) return { valid: true, extension: "webp" };
  return { valid: false };
}
