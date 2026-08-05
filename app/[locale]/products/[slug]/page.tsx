import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/Icons";
import { FavoriteButton } from "@/components/FavoriteButton";
import { SafeImage } from "@/components/SafeImage";
import { AddToCartButton } from "@/components/AddToCartButton";
import { getCatalogProductBySlug } from "@/lib/catalog";
import { deliveryLabels, getLocale, translations } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: localeValue, slug } = await params;
  const locale = getLocale(localeValue);
  const product = await getCatalogProductBySlug(slug);
  return { title: product?.title[locale] ?? translations[locale].noResultsTitle };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeValue, slug } = await params;
  const locale = getLocale(localeValue);
  const product = await getCatalogProductBySlug(slug);
  if (!product) notFound();
  const m = translations[locale];
  const location = [product.district, product.city].filter(Boolean).join(", ");
  const hasProductInfo = product.details.length > 0
    || Boolean(location)
    || product.distanceKm !== undefined;
  const hasDeliveryDetails = Boolean(
    product.deliveryDetails.pickup
      || product.deliveryDetails.courier
      || product.deliveryDetails.shipping,
  );
  const price = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: product.currency,
  }).format(product.price);

  return (
    <div className="container detail">
      <div className="detail-image">
        <SafeImage src={product.image} alt={product.imageAlt?.[locale] ?? product.title[locale]} sizes="(max-width: 900px) 100vw, 48vw" priority />
      </div>
      <article className="detail-copy">
        <nav className="breadcrumb" aria-label={m.breadcrumbLabel}>
          <Link href={`/${locale}`}>FEMORIA</Link> / <Link href={`/${locale}/products`}>{m.breadcrumbProducts}</Link>
        </nav>
        <p className="eyebrow">{product.preparation[locale]}</p>
        <h1>{product.title[locale]}</h1>
        {product.rating !== undefined ? (
          <div className="rating">
            ★ {product.rating}
            {product.reviews !== undefined ? ` · ${product.reviews} ${m.review}` : null}
          </div>
        ) : null}
        <p className="detail-description">{product.description[locale]}</p>
        <div className="detail-price">{price}</div>
        <div className="detail-actions">
          <AddToCartButton productId={product.id} locale={locale} disabled={!product.commerceReady || product.stockMode === "unavailable"} />
          <FavoriteButton productId={product.id} addLabel={m.addFavorite} removeLabel={m.removeFavorite} className="btn btn-secondary detail-favorite" withText />
        </div>
        {hasProductInfo ? <h2 className="detail-subtitle">{m.aboutProduct}</h2> : null}
        {hasProductInfo ? (
          <dl className="detail-info">
            {product.details.map((detail) => <div key={detail.label.tr}><dt>{detail.label[locale]}</dt><dd>{detail.value[locale]}</dd></div>)}
            {location ? <div><dt>{m.deliveryArea}</dt><dd>{location}</dd></div> : null}
            {product.distanceKm !== undefined ? <div><dt>{m.approximateDistance}</dt><dd>~{product.distanceKm.toLocaleString(locale)} km</dd></div> : null}
          </dl>
        ) : null}
        {hasDeliveryDetails ? <h2 className="detail-subtitle">{m.deliveryOptionsLabel}</h2> : null}
        {hasDeliveryDetails ? <div className="delivery-detail-grid">
          {product.deliveryDetails.pickup ? (
            <article>
              <h3>{deliveryLabels.pickup[locale]}</h3>
              <dl>
                <div><dt>{m.pickupAreaLabel}</dt><dd>{product.deliveryDetails.pickup.area[locale]}</dd></div>
                <div><dt>{m.readyAtLabel}</dt><dd>{product.deliveryDetails.pickup.readyAt[locale]}</dd></div>
                <div><dt>{m.pickupWindowLabel}</dt><dd>{product.deliveryDetails.pickup.window[locale]}</dd></div>
              </dl>
            </article>
          ) : null}
          {product.deliveryDetails.courier ? (
            <article>
              <h3>{deliveryLabels.courier[locale]}</h3>
              <dl>
                <div><dt>{m.courierDistrictsLabel}</dt><dd>{product.deliveryDetails.courier.districts[locale]}</dd></div>
                <div><dt>{m.courierEstimateLabel}</dt><dd>{product.deliveryDetails.courier.estimate[locale]}</dd></div>
                <div><dt>{m.courierFeeLabel}</dt><dd>{product.deliveryDetails.courier.fee[locale]}</dd></div>
              </dl>
            </article>
          ) : null}
          {product.deliveryDetails.shipping ? (
            <article>
              <h3>{deliveryLabels.shipping[locale]}</h3>
              <dl>
                <div><dt>{m.shippingEstimateLabel}</dt><dd>{product.deliveryDetails.shipping.estimate[locale]}</dd></div>
              </dl>
            </article>
          ) : null}
        </div> : null}
        <p className="delivery-privacy"><Icon name="shield" />{m.deliveryPrivacy}</p>
        <div className="seller-box">
          <div className="seller-avatar">
            <SafeImage src={product.producerImage} alt={product.producer} sizes="64px" />
          </div>
          <div><span>{m.producerLabel}</span><strong>{product.producer}</strong><span>{m.verifiedProducer}{product.delivery[0] ? ` · ${deliveryLabels[product.delivery[0]][locale]}` : ""}</span></div>
          <Icon name="shield" />
        </div>
      </article>
    </div>
  );
}
