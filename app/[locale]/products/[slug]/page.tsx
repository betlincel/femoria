import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/Icons";
import { deliveryLabels, getLocale, translations } from "@/lib/i18n";
import { getProduct, products } from "@/lib/mock-data";

export function generateStaticParams() {
  return products.flatMap((product) => [
    { locale: "tr", slug: product.slug },
    { locale: "en", slug: product.slug },
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: localeValue, slug } = await params;
  const locale = getLocale(localeValue);
  const product = getProduct(slug);
  return { title: product?.title[locale] ?? translations[locale].noResultsTitle };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeValue, slug } = await params;
  const locale = getLocale(localeValue);
  const product = getProduct(slug);
  if (!product) notFound();
  const m = translations[locale];

  return (
    <div className="container detail">
      <div className="detail-image">
        <img src={product.image} alt={product.title[locale]} />
      </div>
      <article className="detail-copy">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href={`/${locale}`}>FEMORIA</Link> / <Link href={`/${locale}/products`}>{m.breadcrumbProducts}</Link>
        </nav>
        <p className="eyebrow">{product.preparation[locale]}</p>
        <h1>{product.title[locale]}</h1>
        <div className="rating">★ {product.rating} · {product.reviews} {m.review}</div>
        <p className="detail-description">{product.description[locale]}</p>
        <div className="detail-price">{product.price.toLocaleString(locale)} ₺</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button className="btn btn-primary" type="button">{m.requestOrder}<Icon name="arrow" /></button>
          <button className="btn btn-secondary" type="button"><Icon name="heart" />{m.addFavorite}</button>
        </div>
        <h2 style={{ color: "var(--plum)", fontFamily: "Georgia, serif", marginTop: 36 }}>{m.aboutProduct}</h2>
        <dl className="detail-info">
          {product.details.map((detail) => <div key={detail.label.tr}><dt>{detail.label[locale]}</dt><dd>{detail.value[locale]}</dd></div>)}
          <div><dt>{m.deliveryArea}</dt><dd>{product.district}, {product.city}</dd></div>
          <div><dt>{m.approximateDistance}</dt><dd>~{product.distanceKm.toLocaleString(locale)} km</dd></div>
        </dl>
        <div className="seller-box">
          <img src={product.producerImage} alt="" />
          <div><span>{m.producerLabel}</span><strong>{product.producer}</strong><span>{m.verifiedProducer} · {deliveryLabels[product.delivery[0]][locale]}</span></div>
          <Icon name="shield" />
        </div>
      </article>
    </div>
  );
}
