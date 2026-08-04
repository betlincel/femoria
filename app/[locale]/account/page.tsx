import type { Metadata } from "next";
import { AccountView } from "@/components/AccountView";
import { profileSchema } from "@/lib/auth";
import { getLocale, translations } from "@/lib/i18n";
import { producerApplicationStatusSchema } from "@/lib/producer-application";
import { requireUser } from "@/lib/supabase/auth";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: translations[locale].accountTitle };
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  const { supabase, user } = await requireUser(locale, `/${locale}/account`);
  const [profileResult, sellerResult] = await Promise.all([
    supabase.from("profiles").select("id, role, status, display_name, locale, city, district").eq("id", user.id).single(),
    supabase.from("producer_profiles").select("verification_status").eq("profile_id", user.id).maybeSingle(),
  ]);
  const profile = profileSchema.safeParse(profileResult.data);
  const sellerStatus = sellerResult.data
    ? producerApplicationStatusSchema.safeParse(sellerResult.data.verification_status)
    : null;
  if (profileResult.error || sellerResult.error || !profile.success || (sellerStatus && !sellerStatus.success)) {
    throw new Error("Authenticated profile is unavailable.");
  }
  return (
    <>
      <section className="page-hero"><div className="container"><p className="eyebrow">{m.accountEyebrow}</p><h1 className="page-title">{m.accountTitle}</h1><p>{m.accountText}</p></div></section>
      <section className="section"><div className="container"><AccountView locale={locale} email={user.email ?? ""} profile={profile.data} sellerStatus={sellerStatus?.data ?? null} messages={m} /></div></section>
    </>
  );
}
