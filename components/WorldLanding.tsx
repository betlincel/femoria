import Link from "next/link";
import { productWorlds, type Messages } from "@/lib/i18n";
import type { CatalogCategory, Locale, Product, ProductWorld } from "@/lib/types";
import { DeliveryExplainer } from "./DeliveryExplainer";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icons";
import { ProductCard } from "./ProductCard";
import { SectionHeader } from "./SectionHeader";
import { SafeImage } from "./SafeImage";

export function WorldLanding({
  world,
  locale,
  messages: m,
  products,
  categories,
}: {
  world: ProductWorld;
  locale: Locale;
  messages: Messages;
  products: Product[];
  categories: CatalogCategory[];
}) {
  const content = productWorlds[world];
  const isKitchen = world === "kitchen";

  return (
    <>
      <section className={`world-hero world-hero-${world}`}>
        <div className="container world-hero-grid">
          <div className="world-hero-copy">
            <p className="eyebrow">
              {isKitchen ? m.kitchenPageEyebrow : m.workshopPageEyebrow}
            </p>
            <h1>{isKitchen ? m.kitchenPageTitle : m.workshopPageTitle}</h1>
            <p>{isKitchen ? m.kitchenPageText : m.workshopPageText}</p>
            <Link className="btn btn-primary" href="#featured-products">
              {m.featuredProducts}<Icon name="arrow" />
            </Link>
          </div>
          <div className="world-hero-image">
            <div className="world-hero-image-frame">
              <SafeImage src={content.image} alt="" sizes="(max-width: 900px) 100vw, 50vw" priority />
            </div>
            <p>{content.description[locale]}</p>
          </div>
        </div>
      </section>

      <section className="section" id="categories">
        <div className="container">
          <SectionHeader
            eyebrow={content.title[locale]}
            title={m.categoryDirectory}
            text={m.categoryDirectoryText}
          />
          <div className="directory-grid">
            {categories.map((category, index) => (
              <Link
                href={`/${locale}/products?category=${encodeURIComponent(category.slug)}`}
                key={category.id}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{category.name[locale]}</strong>
                <Icon name="arrow" size={18} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tint" id="featured-products">
        <div className="container">
          <SectionHeader
            eyebrow={content.title[locale]}
            title={m.featuredProducts}
            text={isKitchen ? m.nearbyKitchenText : m.workshopCollectionsText}
            link={{
              href: `/${locale}/products`,
              label: m.seeAll,
            }}
          />
          {products.length ? (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  locale={locale}
                  messages={m}
                />
              ))}
            </div>
          ) : <EmptyState title={m.catalogEmptyTitle} text={m.catalogEmptyText} />}
        </div>
      </section>

      {isKitchen ? <DeliveryExplainer messages={m} /> : null}
    </>
  );
}
