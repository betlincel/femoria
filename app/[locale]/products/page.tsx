import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { ProductsExplorer } from "@/components/ProductsExplorer";
import { listCatalogCategories, listCatalogProducts } from "@/lib/catalog";
import { catalogSlugSchema } from "@/lib/catalog-schemas";
import { getLocale, translations } from "@/lib/i18n";

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
  const [products, categoryOptions] = await Promise.all([
    listCatalogProducts(),
    listCatalogCategories(),
  ]);
  const initialQuery = typeof query.q === "string" ? query.q : "";
  const initialCity = typeof query.city === "string" ? query.city : "";
  const parsedCategory = catalogSlugSchema.safeParse(query.category);
  const categoryValue = parsedCategory.success ? parsedCategory.data : "";
  return (
    <>
      <section className="page-hero"><div className="container"><p className="eyebrow">{m.productsEyebrow}</p><h1 className="page-title">{m.productsTitle}</h1><p>{m.productsIntro}</p></div></section>
      {products.length ? (
        <ProductsExplorer
          key={`${initialQuery}-${categoryValue}-${initialCity}`}
          products={products}
          categoryOptions={categoryOptions}
          locale={locale}
          messages={m}
          initialQuery={initialQuery}
          initialCategory={categoryValue}
          initialCity={initialCity}
        />
      ) : (
        <section className="section">
          <div className="container">
            <EmptyState title={m.catalogEmptyTitle} text={m.catalogEmptyText} />
          </div>
        </section>
      )}
    </>
  );
}
