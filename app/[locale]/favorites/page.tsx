import type { Metadata } from "next";
import { FavoritesView } from "@/components/FavoritesView";
import { getLocale, translations } from "@/lib/i18n";
import { requireUser } from "@/lib/supabase/auth";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: translations[locale].favoritesTitle };
}

export default async function FavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  await requireUser(locale, `/${locale}/favorites`);
  return (
    <>
      <section className="page-hero"><div className="container"><p className="eyebrow">{m.favoritesEyebrow}</p><h1 className="page-title">{m.favoritesTitle}</h1><p>{m.favoritesText}</p></div></section>
      <section className="section"><div className="container"><FavoritesView locale={locale} messages={m} /></div></section>
    </>
  );
}
