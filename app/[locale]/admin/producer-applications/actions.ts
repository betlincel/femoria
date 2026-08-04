"use server";

import { revalidatePath } from "next/cache";
import {
  producerApplicationReviewInputSchema,
  type ProducerApplicationReviewResult,
} from "@/lib/admin-producer-applications";
import { hasActiveAdminProfile } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function reviewProducerApplication(input: unknown): Promise<ProducerApplicationReviewResult> {
  const parsed = producerApplicationReviewInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) return { status: "forbidden" };

  try {
    if (!(await hasActiveAdminProfile(supabase, data.user.id))) return { status: "forbidden" };
  } catch {
    return { status: "error" };
  }

  const { data: updated, error } = await supabase.rpc("review_producer_application", {
    target_profile_id: parsed.data.profileId,
    review_action: parsed.data.action,
  });
  if (error) return { status: "error" };
  if (!updated) return { status: "conflict" };

  revalidatePath("/tr/admin/producer-applications");
  revalidatePath("/en/admin/producer-applications");
  revalidatePath("/tr/account");
  revalidatePath("/en/account");
  return { status: "success", action: parsed.data.action };
}
