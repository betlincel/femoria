import "server-only";

import { z } from "zod";
import { getSellerAccessState, type SellerAccessState } from "@/lib/account-access";
import type { Locale } from "@/lib/types";
import { requireUser } from "./auth";
import { createClient } from "./server";

const sellerProfileSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "buyer", "producer", "admin"]),
  status: z.enum(["active", "suspended"]),
  display_name: z.string(),
  city: z.string().nullable(),
  district: z.string().nullable(),
}).strict();

const producerProfileSchema = z.object({
  verification_status: z.enum(["pending", "approved", "rejected"]),
  approximate_area: z.string().nullable(),
}).strict();

export async function requireApprovedSeller(locale: Locale, returnTo: string) {
  const { supabase, user } = await requireUser(locale, returnTo);
  const [profileResult, sellerResult] = await Promise.all([
    supabase.from("profiles").select("id, role, status, display_name, city, district").eq("id", user.id).single(),
    supabase.from("producer_profiles").select("verification_status, approximate_area").eq("profile_id", user.id).maybeSingle(),
  ]);
  if (profileResult.error || sellerResult.error) throw new Error("Seller access could not be verified.");
  const profile = sellerProfileSchema.safeParse(profileResult.data);
  const producerProfile = sellerResult.data ? producerProfileSchema.safeParse(sellerResult.data) : null;
  if (!profile.success || (producerProfile && !producerProfile.success)) throw new Error("Seller access data is invalid.");
  const seller = producerProfile?.data ?? null;
  const state = getSellerAccessState(profile.data, seller);
  return { supabase, user, profile: profile.data, producerProfile: seller, state, approved: state === "approved" };
}

export type SellerNavigationState = SellerAccessState | "admin";

export async function getSellerNavigationState(): Promise<SellerNavigationState> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return "none";
    const user = data.user;
    const [profileResult, sellerResult] = await Promise.all([
      supabase.from("profiles").select("role, status").eq("id", user.id).single(),
      supabase.from("producer_profiles").select("verification_status").eq("profile_id", user.id).maybeSingle(),
    ]);
    const profile = z.object({ role: z.enum(["user", "buyer", "producer", "admin"]), status: z.enum(["active", "suspended"]) }).safeParse(profileResult.data);
    const seller = sellerResult.data ? z.object({ verification_status: z.enum(["pending", "approved", "rejected"]) }).safeParse(sellerResult.data) : null;
    if (!profile.success || (seller && !seller.success)) return "none";
    const state = getSellerAccessState(profile.data, seller?.data ?? null);
    return profile.data.role === "admin" && state === "none" ? "admin" : state;
  } catch {
    return "none";
  }
}
