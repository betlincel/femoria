"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canApplyAsSeller } from "@/lib/account-access";
import {
  buildDeliveryRegionsPayload,
  canSubmitProducerApplication,
  parseProducerApplicationFormData,
  producerApplicationStatusSchema,
  type ProducerApplicationFormState,
} from "@/lib/producer-application";
import { requireUser } from "@/lib/supabase/auth";
import type { Database } from "@/lib/supabase/database.types";

const localeSchema = z.enum(["tr", "en"]);

export async function submitProducerApplication(
  _previousState: ProducerApplicationFormState,
  formData: FormData,
): Promise<ProducerApplicationFormState> {
  const localeResult = localeSchema.safeParse(formData.get("locale"));
  if (!localeResult.success) return { status: "invalid" };
  const locale = localeResult.data;
  const returnTo = `/${locale}/info/producer-application`;
  const { supabase, user } = await requireUser(locale, returnTo);
  const parsed = parseProducerApplicationFormData(formData);
  if (!parsed.success) return { status: "invalid" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, status, city, district")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile || profile.status !== "active") return { status: "error" };

  const { data: existing, error: existingError } = await supabase
    .from("producer_profiles")
    .select("verification_status")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (existingError) return { status: "error" };
  const existingStatus = producerApplicationStatusSchema.safeParse(existing?.verification_status);
  if (existing && (!existingStatus.success || !canSubmitProducerApplication(existingStatus.data))) {
    return { status: "duplicate" };
  }
  if (!canApplyAsSeller(profile, null)) return { status: "error" };

  const { error: insertError } = await supabase.from("producer_profiles").insert({
    profile_id: user.id,
    story_tr: parsed.data.storyTr,
    story_en: parsed.data.storyEn || "",
    approximate_area: parsed.data.approximateArea,
    delivery_regions: buildDeliveryRegionsPayload(parsed.data),
  });
  if (insertError?.code === "23505") return { status: "duplicate" };
  if (insertError) return { status: "error" };

  const profileUpdate: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (!profile.city) profileUpdate.city = parsed.data.city;
  if (!profile.district) profileUpdate.district = parsed.data.district;
  if (Object.keys(profileUpdate).length) {
    await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
  }

  revalidatePath(returnTo);
  return { status: "success" };
}
