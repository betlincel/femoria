import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const catalogSlugSchema = z.string().trim().min(1).max(180).regex(slugPattern);

export const catalogCategoryRowSchema = z.object({
  id: z.string().uuid(),
  slug: catalogSlugSchema,
  name_tr: z.string().trim().min(1),
  name_en: z.string().trim().min(1),
  kind: z.enum(["food", "craft"]),
  active: z.boolean(),
  sort_order: z.number().int(),
});

const producerProfileRowSchema = z.object({
  story_tr: z.string().default(""),
  story_en: z.string().default(""),
  verification_status: z.enum(["pending", "approved", "rejected"]),
  approximate_area: z.string().trim().nullable().optional(),
});

const relation = <Schema extends z.ZodType>(schema: Schema) =>
  z.union([schema, z.array(schema)]).nullable().optional();

const producerRowSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().trim().min(1),
  status: z.enum(["active", "suspended"]),
  producer_profile: relation(producerProfileRowSchema),
});

const productImageRowSchema = z.object({
  id: z.string().uuid(),
  storage_path: z.string().trim().min(1),
  alt_tr: z.string().default(""),
  alt_en: z.string().default(""),
  sort_order: z.number().int().default(0),
});

export const catalogProductRowSchema = z.object({
  id: z.string().uuid(),
  slug: catalogSlugSchema,
  title_tr: z.string().default(""),
  title_en: z.string().default(""),
  description_tr: z.string().default(""),
  description_en: z.string().default(""),
  price_minor: z.number().int().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  status: z.literal("approved"),
  stock_mode: z.enum(["in_stock", "made_to_order", "unavailable"]),
  stock_quantity: z.number().int().nonnegative().nullable(),
  preparation_days: z.number().int().min(0).max(365),
  city: z.string().trim().nullable().optional(),
  district: z.string().trim().nullable().optional(),
  category: relation(catalogCategoryRowSchema),
  producer: relation(producerRowSchema),
  images: z.array(productImageRowSchema).default([]),
});

export type CatalogProductRow = z.infer<typeof catalogProductRowSchema>;
