import { describe, expect, it } from "vitest";
import { protectedRouteRedirect } from "@/lib/auth";
import { producerApplicationUi } from "@/lib/i18n";
import {
  buildDeliveryRegionsPayload,
  canSubmitProducerApplication,
  getProducerApplicationStatusContent,
  parseProducerApplicationFormData,
} from "@/lib/producer-application";

function validApplicationForm(): FormData {
  const formData = new FormData();
  formData.set("locale", "tr");
  formData.set("productionArea", "workshop");
  formData.set("storyTr", "Seramik üretimine aile atölyesinde başladım ve doğal malzemelerle çalışıyorum.");
  formData.set("storyEn", "I make small-batch ceramics with natural materials.");
  formData.set("city", "İzmir");
  formData.set("district", "Urla");
  formData.set("approximateArea", "Urla merkez çevresi");
  formData.append("deliveryRegions", "local");
  formData.append("deliveryRegions", "city");
  formData.set("productTypes", "Seramik kupa ve vazo");
  formData.set("productionMethod", "Ürünleri elde şekillendiriyor ve küçük partiler hâlinde sırlıyorum.");
  formData.set("madeToOrder", "sometimes");
  formData.set("consent", "on");
  return formData;
}

describe("producer application boundary", () => {
  it("redirects an unauthenticated user to localized login", () => {
    expect(protectedRouteRedirect(false, "en", "/en/info/producer-application")).toBe(
      "/en/login?next=%2Fen%2Finfo%2Fproducer-application",
    );
  });

  it("accepts a valid application and creates the JSON-array payload", () => {
    const parsed = parseProducerApplicationFormData(validApplicationForm());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(buildDeliveryRegionsPayload(parsed.data)).toEqual([expect.objectContaining({
      version: 1,
      city: "İzmir",
      district: "Urla",
      regions: ["local", "city"],
      production_area: "workshop",
      made_to_order: "sometimes",
    })]);
  });

  it("rejects a missing required field", () => {
    const formData = validApplicationForm();
    formData.delete("productionMethod");
    expect(parseProducerApplicationFormData(formData).success).toBe(false);
  });

  it("rejects an overlong maker story", () => {
    const formData = validApplicationForm();
    formData.set("storyTr", "a".repeat(2_001));
    expect(parseProducerApplicationFormData(formData).success).toBe(false);
  });

  it("rejects a client-supplied verification status", () => {
    const formData = validApplicationForm();
    formData.set("verification_status", "approved");
    expect(parseProducerApplicationFormData(formData).success).toBe(false);
  });

  it("rejects a client-supplied approval date", () => {
    const formData = validApplicationForm();
    formData.set("approved_at", "2026-08-04T00:00:00.000Z");
    expect(parseProducerApplicationFormData(formData).success).toBe(false);
  });

  it("rejects a client-supplied profile id", () => {
    const formData = validApplicationForm();
    formData.set("profile_id", "63434023-ed88-44ef-8d28-87233ce4afeb");
    expect(parseProducerApplicationFormData(formData).success).toBe(false);
  });

  it("prevents duplicate submissions for every existing status", () => {
    expect(canSubmitProducerApplication(null)).toBe(true);
    expect(canSubmitProducerApplication("pending")).toBe(false);
    expect(canSubmitProducerApplication("approved")).toBe(false);
    expect(canSubmitProducerApplication("rejected")).toBe(false);
  });
});

describe("producer application status content", () => {
  it("shows the pending state and disables resubmission messaging", () => {
    const content = getProducerApplicationStatusContent("tr", "pending");
    expect(content.title).toBe(producerApplicationUi.tr.pendingTitle);
    expect(content.text).toContain("tekrar gönderilemez");
  });

  it("does not require a role change in the approved state", () => {
    const content = getProducerApplicationStatusContent("tr", "approved");
    expect(content.text).toContain("Aynı FEMORIA hesabıyla");
    expect(content.text).not.toContain("rol");
  });

  it("shows a general rejected state without inventing a reason", () => {
    const content = getProducerApplicationStatusContent("en", "rejected");
    expect(content.title).toBe(producerApplicationUi.en.rejectedTitle);
    expect(content.text).toContain("does not include a rejection reason");
  });

  it("provides localized Turkish and English validation messages", () => {
    expect(producerApplicationUi.tr.invalid).toContain("zorunlu alanları");
    expect(producerApplicationUi.en.invalid).toContain("required fields");
    expect(producerApplicationUi.tr.successTitle).not.toBe(producerApplicationUi.en.successTitle);
  });
});
