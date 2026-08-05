import { z } from "zod";

export const adminProductStatusSchema = z.enum(["pending", "approved", "rejected", "all"]);
export type AdminProductStatus = z.infer<typeof adminProductStatusSchema>;

export const adminProductFiltersSchema = z.object({
  status: adminProductStatusSchema.default("pending"),
  query: z.string().trim().max(80).default(""),
  page: z.coerce.number().int().positive().max(1_000).default(1),
}).strict();

export type AdminProductFilters = z.infer<typeof adminProductFiltersSchema>;
export const adminProductIdSchema = z.string().uuid();

export function parseAdminProductFilters(value: unknown): AdminProductFilters {
  const parsed = adminProductFiltersSchema.safeParse(value);
  return parsed.success ? parsed.data : { status: "pending", query: "", page: 1 };
}

export const adminProductReviewInputSchema = z.object({
  locale: z.enum(["tr", "en"]),
  productId: adminProductIdSchema,
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(1_000).optional().default(""),
}).strict().superRefine((value, context) => {
  if (value.action !== "reject") return;
  const length = value.rejectionReason.trim().length;
  if (length < 10 || length > 1_000) {
    context.addIssue({ code: "custom", path: ["rejectionReason"], message: "invalid_rejection_reason" });
  }
});

export type AdminProductReviewInput = z.infer<typeof adminProductReviewInputSchema>;
export type AdminProductReviewResult = {
  status: "success" | "invalid" | "forbidden" | "conflict" | "error";
  action?: AdminProductReviewInput["action"];
};

const categorySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name_tr: z.string(),
  name_en: z.string(),
  kind: z.enum(["food", "craft"]),
  active: z.boolean(),
}).strict();

const producerProfileSchema = z.object({
  story_tr: z.string(),
  story_en: z.string(),
  verification_status: z.enum(["pending", "approved", "rejected"]),
  approximate_area: z.string().nullable(),
}).strict();

const producerSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().trim().min(1),
  city: z.string().nullable(),
  district: z.string().nullable(),
  neighborhood_public: z.string().nullable(),
  status: z.enum(["active", "suspended"]),
  producer_profile: z.union([producerProfileSchema, z.array(producerProfileSchema)]).nullable(),
}).strict();

const reviewerSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().trim().min(1),
}).strict();

const imageSchema = z.object({
  id: z.string().uuid(),
  storage_path: z.string().trim().min(1),
  alt_tr: z.string(),
  alt_en: z.string(),
  sort_order: z.number().int(),
}).strict();

const adminProductRowSchema = z.object({
  id: z.string().uuid(),
  producer_id: z.string().uuid(),
  category_id: z.string().uuid(),
  slug: z.string(),
  title_tr: z.string(),
  title_en: z.string(),
  description_tr: z.string(),
  description_en: z.string(),
  price_minor: z.number().int(),
  currency: z.string(),
  status: z.enum(["draft", "pending", "approved", "rejected"]),
  stock_mode: z.enum(["in_stock", "made_to_order", "unavailable"]),
  stock_quantity: z.number().int().nullable(),
  preparation_days: z.number().int(),
  city: z.string(),
  district: z.string(),
  rejection_reason: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  reviewed_by: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  category: z.union([categorySchema, z.array(categorySchema)]),
  producer: z.union([producerSchema, z.array(producerSchema)]),
  reviewer: z.union([reviewerSchema, z.array(reviewerSchema)]).nullable(),
  images: z.array(imageSchema),
}).strict();

type ProductRow = z.infer<typeof adminProductRowSchema>;
type Category = z.infer<typeof categorySchema>;
type Producer = z.infer<typeof producerSchema>;
type ProducerProfile = z.infer<typeof producerProfileSchema>;
type Reviewer = z.infer<typeof reviewerSchema>;

export type AdminProduct = Omit<ProductRow, "category" | "producer" | "reviewer" | "images"> & {
  category: Category;
  producer: Omit<Producer, "producer_profile"> & { producerProfile: ProducerProfile | null };
  reviewer: Reviewer | null;
  images: Array<z.infer<typeof imageSchema> & { publicUrl: string }>;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function mapAdminProduct(
  value: unknown,
  imageUrl: (storagePath: string) => string,
): AdminProduct | null {
  const parsed = adminProductRowSchema.safeParse(value);
  if (!parsed.success) return null;
  const category = firstRelation(parsed.data.category);
  const producer = firstRelation(parsed.data.producer);
  if (!category || !producer) return null;
  const producerProfile = firstRelation(producer.producer_profile);
  const reviewer = firstRelation(parsed.data.reviewer);

  return {
    ...parsed.data,
    category,
    producer: { ...producer, producerProfile },
    reviewer,
    images: [...parsed.data.images]
      .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id))
      .map((image) => ({ ...image, publicUrl: imageUrl(image.storage_path) })),
  };
}

export function normalizeAdminProductSearch(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("tr-TR");
}

export function filterAdminProducts(
  products: AdminProduct[],
  status: AdminProductStatus,
  query: string,
): AdminProduct[] {
  const normalizedQuery = normalizeAdminProductSearch(query);
  const matching = products.filter((product) => {
    if (status !== "all" && product.status !== status) return false;
    if (!normalizedQuery) return true;
    return [
      product.title_tr,
      product.title_en,
      product.slug,
      product.producer.display_name,
      product.city,
      product.district,
    ].some((value) => normalizeAdminProductSearch(value).includes(normalizedQuery));
  });

  return matching.sort((left, right) => {
    if (status === "pending") {
      return Date.parse(left.created_at) - Date.parse(right.created_at);
    }
    const leftDate = Date.parse(left.reviewed_at ?? left.updated_at);
    const rightDate = Date.parse(right.reviewed_at ?? right.updated_at);
    return rightDate - leftDate;
  });
}

export function countAdminProductStatuses(products: AdminProduct[]) {
  return products.reduce(
    (counts, product) => {
      counts.total += 1;
      if (product.status === "pending" || product.status === "approved" || product.status === "rejected") {
        counts[product.status] += 1;
      }
      return counts;
    },
    { pending: 0, approved: 0, rejected: 0, total: 0 },
  );
}
