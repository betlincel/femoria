import { z } from "zod";
import { producerApplicationUi } from "./i18n";
import type { Json } from "./supabase/database.types";
import type { Locale } from "./types";

export const producerApplicationStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type ProducerApplicationStatus = z.infer<typeof producerApplicationStatusSchema>;

export const producerApplicationSchema = z.object({
  locale: z.enum(["tr", "en"]),
  productionArea: z.enum(["kitchen", "workshop", "both"]),
  storyTr: z.string().trim().min(40).max(2_000),
  storyEn: z.string().trim().max(2_000).default(""),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  approximateArea: z.string().trim().min(2).max(160),
  deliveryRegions: z.array(z.enum(["local", "city", "shipping"])).min(1).max(3),
  productTypes: z.string().trim().min(2).max(500),
  productionMethod: z.string().trim().min(10).max(800),
  madeToOrder: z.enum(["yes", "no", "sometimes"]),
  consent: z.literal(true),
}).strict();

export type ProducerApplicationInput = z.infer<typeof producerApplicationSchema>;

export const producerApplicationRowSchema = z.object({
  profile_id: z.string().uuid(),
  verification_status: producerApplicationStatusSchema,
  approved_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ProducerApplicationRow = z.infer<typeof producerApplicationRowSchema>;

export type ProducerApplicationFormState = {
  status: "idle" | "success" | "invalid" | "duplicate" | "error";
};

export const initialProducerApplicationState: ProducerApplicationFormState = { status: "idle" };

export function parseProducerApplicationFormData(formData: FormData) {
  return producerApplicationSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    deliveryRegions: formData.getAll("deliveryRegions"),
    consent: formData.get("consent") === "on",
  });
}

export function buildDeliveryRegionsPayload(input: ProducerApplicationInput): Json {
  return [{
    version: 1,
    city: input.city,
    district: input.district,
    regions: input.deliveryRegions,
    production_area: input.productionArea,
    product_types: input.productTypes,
    production_method: input.productionMethod,
    made_to_order: input.madeToOrder,
  }];
}

export function canSubmitProducerApplication(existingStatus: ProducerApplicationStatus | null): boolean {
  return existingStatus === null;
}

export function getProducerApplicationStatusContent(
  locale: Locale,
  status: ProducerApplicationStatus | "success" | "unavailable" | "ineligible",
) {
  const ui = producerApplicationUi[locale];
  if (status === "pending") return { title: ui.pendingTitle, text: ui.pendingText };
  if (status === "approved") {
    return { title: ui.approvedTitle, text: ui.approvedText };
  }
  if (status === "rejected") return { title: ui.rejectedTitle, text: ui.rejectedText };
  if (status === "success") return { title: ui.successTitle, text: ui.successText };
  if (status === "ineligible") return { title: ui.ineligibleTitle, text: ui.ineligibleText };
  return { title: ui.unavailableTitle, text: ui.unavailableText };
}
