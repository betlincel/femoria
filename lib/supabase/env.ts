import { z } from "zod";

const publicSupabaseEnvSchema = z.object({
  url: z.string().url(),
  publishableKey: z.string().min(1),
});

export function getSupabasePublicEnv() {
  const result = publicSupabaseEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) {
    throw new Error(
      "Supabase public environment variables are missing or invalid.",
    );
  }

  return result.data;
}

export function isFavoritesSyncEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SUPABASE_FAVORITES_ENABLED === "true";
}
