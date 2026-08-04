import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isActiveAdminProfile } from "@/lib/account-access";
import type { Database } from "./database.types";

const adminProfileSchema = z.object({
  role: z.enum(["user", "buyer", "producer", "admin"]),
  status: z.enum(["active", "suspended"]),
}).strict();

export async function hasActiveAdminProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("Admin authorization could not be verified.");
  const profile = adminProfileSchema.safeParse(data);
  return profile.success && isActiveAdminProfile(profile.data);
}
