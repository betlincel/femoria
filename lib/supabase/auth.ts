import "server-only";

import { redirect } from "next/navigation";
import { protectedRouteRedirect } from "@/lib/auth";
import type { Locale } from "@/lib/types";
import { createClient } from "./server";

export async function requireUser(locale: Locale, returnTo: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    const loginRedirect = protectedRouteRedirect(false, locale, returnTo);
    redirect(loginRedirect ?? `/${locale}/login`);
  }

  return { supabase, user: data.user };
}
