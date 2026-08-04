import type { Metadata } from "next";
import { NearbyExperience } from "@/components/NearbyExperience";
import { listCatalogProducts } from "@/lib/catalog";
import { nearbyEditorial } from "@/lib/content/editorial-content";
import { getLocale, translations } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return {
    title: locale === "tr" ? "Yakınımdakiler" : "Nearby",
    description: nearbyEditorial.privacyText[locale],
    openGraph: { title: translations[locale].nearbyPageTitle, description: nearbyEditorial.privacyText[locale] },
  };
}

export default async function NearbyPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  const products = await listCatalogProducts();
  return (
    <>
      <section className="page-hero"><div className="container"><p className="eyebrow">{m.nearbyEyebrow}</p><h1 className="page-title">{m.nearbyPageTitle}</h1><p>{m.nearbyIntro}</p></div></section>
      <div className="container"><NearbyExperience locale={locale} messages={m} products={products} /></div>
    </>
  );
}
