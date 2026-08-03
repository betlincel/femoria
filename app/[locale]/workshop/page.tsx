import type { Metadata } from "next";
import { WorldLanding } from "@/components/WorldLanding";
import { listCatalogCategories, listCatalogProducts } from "@/lib/catalog";
import { getLocale, translations } from "@/lib/i18n";

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
  const [products, categories] = await Promise.all([
    listCatalogProducts(),
    listCatalogCategories(),
  ]);
  return (
    <WorldLanding
      world="workshop"
      locale={locale}
      messages={translations[locale]}
      products={products.filter((product) => product.world === "workshop")}
      categories={categories.filter((category) => category.kind === "craft")}
    />
  );
}
