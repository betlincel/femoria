import { z } from "zod";
import type { Json } from "./supabase/database.types";

export const adminApplicationStatusFilterSchema = z.enum(["pending", "approved", "rejected", "all"]);
export type AdminApplicationStatusFilter = z.infer<typeof adminApplicationStatusFilterSchema>;

export const adminApplicationFiltersSchema = z.object({
  status: adminApplicationStatusFilterSchema.default("pending"),
  query: z.string().trim().max(80).default(""),
  page: z.coerce.number().int().positive().max(1_000).default(1),
}).strict();

export type AdminApplicationFilters = z.infer<typeof adminApplicationFiltersSchema>;

export function parseAdminApplicationFilters(value: unknown): AdminApplicationFilters {
  const parsed = adminApplicationFiltersSchema.safeParse(value);
  return parsed.success ? parsed.data : { status: "pending", query: "", page: 1 };
}

export const producerApplicationReviewInputSchema = z.object({
  profileId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
}).strict();

export type ProducerApplicationReviewInput = z.infer<typeof producerApplicationReviewInputSchema>;
export type ProducerApplicationReviewResult = {
  status: "success" | "invalid" | "forbidden" | "conflict" | "error";
  action?: ProducerApplicationReviewInput["action"];
};

const applicationProfileSchema = z.object({
  display_name: z.string().trim().min(1),
  city: z.string().trim().nullable(),
  district: z.string().trim().nullable(),
}).strict();

const applicationRowSchema = z.object({
  profile_id: z.string().uuid(),
  story_tr: z.string(),
  story_en: z.string(),
  verification_status: z.enum(["pending", "approved", "rejected"]),
  delivery_regions: z.unknown(),
  approximate_area: z.string().trim().nullable(),
  approved_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  profile: z.union([applicationProfileSchema, z.array(applicationProfileSchema)]),
}).strict();

const deliveryEntrySchema = z.object({
  regions: z.array(z.enum(["local", "city", "shipping"])).default([]),
  production_area: z.enum(["kitchen", "workshop", "both"]).nullable().optional(),
  product_types: z.string().trim().max(500).nullable().optional(),
  production_method: z.string().trim().max(800).nullable().optional(),
  made_to_order: z.enum(["yes", "no", "sometimes"]).nullable().optional(),
}).passthrough();

export type AdminProducerApplication = {
  profileId: string;
  displayName: string;
  city: string | null;
  district: string | null;
  approximateArea: string | null;
  storyTr: string;
  storyEn: string | null;
  deliveryRegions: Array<"local" | "city" | "shipping">;
  productionArea: "kitchen" | "workshop" | "both" | null;
  productTypes: string | null;
  productionMethod: string | null;
  madeToOrder: "yes" | "no" | "sometimes" | null;
  deliveryPayloadValid: boolean;
  verificationStatus: "pending" | "approved" | "rejected";
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function firstProfile(value: z.infer<typeof applicationRowSchema>["profile"]) {
  return Array.isArray(value) ? value[0] : value;
}

function decodeDeliveryPayload(value: Json | unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function parseAdminDeliveryRegions(value: Json | unknown) {
  const decoded = decodeDeliveryPayload(value);
  const parsed = z.array(deliveryEntrySchema).min(1).safeParse(decoded);
  const entry = parsed.success ? parsed.data[0] : null;
  return {
    regions: entry?.regions ?? [],
    productionArea: entry?.production_area ?? null,
    productTypes: entry?.product_types || null,
    productionMethod: entry?.production_method || null,
    madeToOrder: entry?.made_to_order ?? null,
    valid: parsed.success,
  };
}

export function mapAdminProducerApplication(value: unknown): AdminProducerApplication | null {
  const parsed = applicationRowSchema.safeParse(value);
  if (!parsed.success) return null;
  const profile = firstProfile(parsed.data.profile);
  if (!profile) return null;
  const delivery = parseAdminDeliveryRegions(parsed.data.delivery_regions);
  return {
    profileId: parsed.data.profile_id,
    displayName: profile.display_name,
    city: profile.city,
    district: profile.district,
    approximateArea: parsed.data.approximate_area,
    storyTr: parsed.data.story_tr,
    storyEn: parsed.data.story_en.trim() || null,
    deliveryRegions: delivery.regions,
    productionArea: delivery.productionArea,
    productTypes: delivery.productTypes,
    productionMethod: delivery.productionMethod,
    madeToOrder: delivery.madeToOrder,
    deliveryPayloadValid: delivery.valid,
    verificationStatus: parsed.data.verification_status,
    approvedAt: parsed.data.approved_at,
    createdAt: parsed.data.created_at,
    updatedAt: parsed.data.updated_at,
  };
}

export function normalizeAdminApplicationSearch(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("tr-TR");
}

export function filterAdminProducerApplications(
  applications: AdminProducerApplication[],
  status: AdminApplicationStatusFilter,
  query: string,
): AdminProducerApplication[] {
  const normalizedQuery = normalizeAdminApplicationSearch(query);
  return applications.filter((application) => {
    if (status !== "all" && application.verificationStatus !== status) return false;
    if (!normalizedQuery) return true;
    return [application.displayName, application.city, application.district, application.approximateArea]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizeAdminApplicationSearch(value).includes(normalizedQuery));
  });
}
