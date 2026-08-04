import { describe, expect, it } from "vitest";
import {
  filterAdminProducerApplications,
  mapAdminProducerApplication,
  parseAdminApplicationFilters,
  parseAdminDeliveryRegions,
  producerApplicationReviewInputSchema,
  type AdminProducerApplication,
} from "@/lib/admin-producer-applications";
import { adminProducerApplicationsUi } from "@/lib/i18n";

const baseRow = {
  profile_id: "63434023-ed88-44ef-8d28-87233ce4afeb",
  story_tr: "Yerel malzemelerle uzun süredir üretim yapıyorum.",
  story_en: "I have been making with local materials for years.",
  verification_status: "pending",
  delivery_regions: [{
    version: 1,
    regions: ["local", "shipping"],
    production_area: "both",
    product_types: "Reçel ve seramik",
    production_method: "Küçük partiler halinde el yapımı üretim.",
    made_to_order: "sometimes",
  }],
  approximate_area: "Çankaya çevresi",
  approved_at: null,
  created_at: "2026-08-04T08:00:00.000Z",
  updated_at: "2026-08-04T08:00:00.000Z",
  profile: { display_name: "İpek Usta", city: "Ankara", district: "Çankaya" },
};

function application(status: AdminProducerApplication["verificationStatus"], displayName: string): AdminProducerApplication {
  const mapped = mapAdminProducerApplication({ ...baseRow, verification_status: status, profile: { ...baseRow.profile, display_name: displayName } });
  if (!mapped) throw new Error("Fixture could not be mapped.");
  return mapped;
}

describe("admin producer application model", () => {
  it("uses pending as the safe default filter", () => {
    expect(parseAdminApplicationFilters({ status: "pending", query: "", page: 1 })).toEqual({ status: "pending", query: "", page: 1 });
    expect(parseAdminApplicationFilters({ status: "arbitrary", query: "", page: 1 })).toEqual({ status: "pending", query: "", page: 1 });
  });

  it("maps current delivery details without exposing unrelated data", () => {
    const mapped = mapAdminProducerApplication(baseRow);
    expect(mapped).toMatchObject({
      displayName: "İpek Usta",
      productionArea: "both",
      productTypes: "Reçel ve seramik",
      madeToOrder: "sometimes",
      deliveryRegions: ["local", "shipping"],
      deliveryPayloadValid: true,
    });
  });

  it("survives malformed or legacy delivery_regions JSON", () => {
    expect(parseAdminDeliveryRegions("not-json")).toEqual({
      regions: [], productionArea: null, productTypes: null, productionMethod: null, madeToOrder: null, valid: false,
    });
    expect(mapAdminProducerApplication({ ...baseRow, delivery_regions: { old: true } })?.deliveryPayloadValid).toBe(false);
  });

  it("filters pending, approved, rejected, and all applications", () => {
    const rows = [application("pending", "Bekleyen"), application("approved", "Onaylı"), application("rejected", "Reddedilen")];
    expect(filterAdminProducerApplications(rows, "pending", "")).toHaveLength(1);
    expect(filterAdminProducerApplications(rows, "approved", "")).toHaveLength(1);
    expect(filterAdminProducerApplications(rows, "rejected", "")).toHaveLength(1);
    expect(filterAdminProducerApplications(rows, "all", "")).toHaveLength(3);
  });

  it("searches display name, city, district, and approximate area with Turkish casing", () => {
    const rows = [application("pending", "İpek Usta")];
    expect(filterAdminProducerApplications(rows, "pending", "ipek")).toHaveLength(1);
    expect(filterAdminProducerApplications(rows, "pending", "ankara")).toHaveLength(1);
    expect(filterAdminProducerApplications(rows, "pending", "çankaya")).toHaveLength(1);
    expect(filterAdminProducerApplications(rows, "pending", "çevresi")).toHaveLength(1);
    expect(filterAdminProducerApplications(rows, "pending", "istanbul")).toHaveLength(0);
  });

  it("accepts only a UUID and approve or reject action", () => {
    expect(producerApplicationReviewInputSchema.safeParse({ profileId: baseRow.profile_id, action: "approve" }).success).toBe(true);
    expect(producerApplicationReviewInputSchema.safeParse({ profileId: baseRow.profile_id, action: "reject" }).success).toBe(true);
    expect(producerApplicationReviewInputSchema.safeParse({ profileId: baseRow.profile_id, action: "approved" }).success).toBe(false);
    expect(producerApplicationReviewInputSchema.safeParse({ profileId: baseRow.profile_id, action: "approve", adminId: baseRow.profile_id }).success).toBe(false);
  });

  it("provides the required Turkish and English review messages", () => {
    expect(adminProducerApplicationsUi.tr.accessDeniedTitle).toBe("Erişim reddedildi");
    expect(adminProducerApplicationsUi.en.accessDeniedTitle).toBe("Access denied");
    expect(adminProducerApplicationsUi.tr.approveConfirm).toContain("ürün yayımlama yetkisi");
    expect(adminProducerApplicationsUi.en.rejectConfirm).toContain("will not be able to apply again");
  });
});
