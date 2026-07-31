import { z } from "zod";
import type { Locale } from "./types";

export const signupRoleSchema = z.enum(["buyer", "producer"]);
export type SignupRole = z.infer<typeof signupRoleSchema>;

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(6).max(128),
});

export const loginSchema = credentialsSchema;

export const signupSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(120),
  confirmation: z.string(),
  role: signupRoleSchema,
  locale: z.enum(["tr", "en"]),
  termsAccepted: z.literal(true),
}).refine((data) => data.password === data.confirmation, {
  path: ["confirmation"],
  message: "Passwords do not match.",
});

export const profileSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["buyer", "producer", "admin"]),
  status: z.enum(["active", "suspended"]),
  display_name: z.string().trim().min(2).max(120),
  locale: z.enum(["tr", "en"]),
  city: z.string().trim().max(80).nullable(),
  district: z.string().trim().max(80).nullable(),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  locale: z.enum(["tr", "en"]),
  city: z.string().trim().max(80),
  district: z.string().trim().max(80),
});

export function sanitizeSignupRole(value: unknown): SignupRole {
  const result = signupRoleSchema.safeParse(value);
  return result.success ? result.data : "buyer";
}

export function safeNextRedirect(
  value: string | null | undefined,
  fallbackLocale: Locale,
): string {
  const fallback = `/${fallbackLocale}/account`;
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(value, "https://femoria.local");
  } catch {
    return fallback;
  }

  if (parsed.origin !== "https://femoria.local") return fallback;
  if (!/^\/(tr|en)(?:\/|$)/.test(parsed.pathname)) return fallback;
  if (parsed.pathname.includes("/auth/callback")) return fallback;

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function protectedRouteRedirect(
  authenticated: boolean,
  locale: Locale,
  returnTo: string,
): string | null {
  if (authenticated) return null;
  const safeReturnTo = safeNextRedirect(returnTo, locale);
  return `/${locale}/login?next=${encodeURIComponent(safeReturnTo)}`;
}
