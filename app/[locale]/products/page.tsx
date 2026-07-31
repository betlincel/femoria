import type { Metadata } from "next";
import { ProductsExplorer } from "@/components/ProductsExplorer";
import { categories, getLocale, translations } from "@/lib/i18n";
import { products } from "@/lib/mock-data";
import type { CategoryId } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: locale === "tr" ? "Ürünleri keşfet" : "Discover products" };
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  const query = await searchParams;
  const initialQuery = typeof query.q === "string" ? query.q : "";
  const initialCity = typeof query.city === "string" ? query.city : "";
  const categoryValue =
    typeof query.category === "string" && query.category in categories
      ? (query.category as CategoryId)
      : "";
  return (
    <>
      <section className="page-hero"><div className="container"><p className="eyebrow">{m.productsEyebrow}</p><h1 className="page-title">{m.productsTitle}</h1><p>{m.productsIntro}</p></div></section>
      <ProductsExplorer
        key={`${initialQuery}-${categoryValue}-${initialCity}`}
        products={products}
        locale={locale}
        messages={m}
        initialQuery={initialQuery}
        initialCategory={categoryValue}
        initialCity={initialCity}
      />
    </>
  );
}
