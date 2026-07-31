"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { profileUpdateSchema } from "@/lib/auth";
import { requireUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/types";

export interface ProfileFormState {
  status: "idle" | "saved" | "invalid" | "error";
}

const localeSchema = z.enum(["tr", "en"]);

export async function updateProfile(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const localeResult = localeSchema.safeParse(formData.get("locale"));
  if (!localeResult.success) return { status: "invalid" };
  const locale: Locale = localeResult.data;
  const parsed = profileUpdateSchema.safeParse({
    displayName: formData.get("displayName"),
    locale: formData.get("profileLocale"),
    city: formData.get("city"),
    district: formData.get("district"),
  });
  if (!parsed.success) return { status: "invalid" };

  const { supabase, user } = await requireUser(locale, `/${locale}/account`);
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      locale: parsed.data.locale,
      city: parsed.data.city || null,
      district: parsed.data.district || null,
    })
    .eq("id", user.id);

  if (error) return { status: "error" };
  revalidatePath(`/${locale}/account`);
  return { status: "saved" };
}

export async function signOut(formData: FormData) {
  const localeResult = localeSchema.safeParse(formData.get("locale"));
  const locale: Locale = localeResult.success ? localeResult.data : "tr";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
