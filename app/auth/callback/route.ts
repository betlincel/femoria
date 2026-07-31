import { NextResponse } from "next/server";
import { safeNextRedirect } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const locale: Locale = requestedNext?.startsWith("/en") ? "en" : "tr";
  const next = safeNextRedirect(requestedNext, locale);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  const loginUrl = new URL(`/${locale}/login`, url.origin);
  loginUrl.searchParams.set("next", next);
  loginUrl.searchParams.set("error", "callback");
  return NextResponse.redirect(loginUrl);
}
