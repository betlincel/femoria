import type { Metadata } from "next";
import { NearbyExperience } from "@/components/NearbyExperience";
import { getLocale, translations } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: locale === "tr" ? "Yakınımdakiler" : "Nearby" };
}

export default async function NearbyPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  return (
    <>
      <section className="page-hero"><div className="container"><p className="eyebrow">{m.nearbyEyebrow}</p><h1 className="page-title">{m.nearbyPageTitle}</h1><p>{m.nearbyIntro}</p></div></section>
      <div className="container"><NearbyExperience locale={locale} messages={m} /></div>
    </>
  );
}
