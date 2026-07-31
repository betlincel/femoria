import type { Metadata } from "next";
import { WorldLanding } from "@/components/WorldLanding";
import { getLocale, translations } from "@/lib/i18n";
import { products } from "@/lib/mock-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  return { title: m.workshopPageTitle, description: m.workshopPageText };
}

export default async function WorkshopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = getLocale((await params).locale);
  return (
    <WorldLanding
      world="workshop"
      locale={locale}
      messages={translations[locale]}
      products={products.filter((product) => product.world === "workshop")}
    />
  );
}
