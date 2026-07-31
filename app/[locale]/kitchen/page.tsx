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
  return { title: m.kitchenPageTitle, description: m.kitchenPageText };
}

export default async function KitchenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = getLocale((await params).locale);
  return (
    <WorldLanding
      world="kitchen"
      locale={locale}
      messages={translations[locale]}
      products={products.filter((product) => product.world === "kitchen")}
    />
  );
}
