"use client";

import Link from "next/link";
import { useState } from "react";
import { categories, deliveryLabels, type Messages } from "@/lib/i18n";
import type { Locale, Product } from "@/lib/types";
import { Badge } from "./Badge";
import { Icon } from "./Icons";

export function ProductCard({
  product,
  locale,
  messages: m,
}: {
  product: Product;
  locale: Locale;
  messages: Messages;
}) {
  const [favorite, setFavorite] = useState(false);
  const primaryDetail =
    product.world === "kitchen" ? product.portion : product.material;

  return (
    <article className={`product-card product-card-${product.world}`}>
      <div className="product-card-image">
        <Link
          href={`/${locale}/products/${product.slug}`}
          aria-label={product.title[locale]}
        >
          <img src={product.image} alt={product.title[locale]} loading="lazy" />
        </Link>
        <div className="product-image-badges">
          <Badge tone={product.world === "kitchen" ? "terracotta" : "sage"}>
            {categories[product.category][locale]}
          </Badge>
        </div>
        <button
          className="favorite"
          type="button"
          aria-label={m.addFavorite}
          aria-pressed={favorite}
          onClick={() => setFavorite((value) => !value)}
        >
          <Icon name="heart" size={18} />
        </button>
      </div>
      <div className="product-body">
        <div className="product-kicker">
          <span>{product.preparation[locale]}</span>
          <span className="rating">★ {product.rating} <small>({product.reviews})</small></span>
        </div>
        <h3>
          <Link href={`/${locale}/products/${product.slug}`}>
            {product.title[locale]}
          </Link>
        </h3>
        <p className="producer">{product.producer}</p>

        <dl className="card-facts">
          {primaryDetail ? (
            <div>
              <dt>{product.world === "kitchen" ? m.portionLabel : m.materialLabel}</dt>
              <dd>{primaryDetail[locale]}</dd>
            </div>
          ) : null}
          <div>
            <dt>{m.preparationLabel}</dt>
            <dd>{product.preparation[locale]}</dd>
          </div>
        </dl>

        <div className="product-place">
          <span><Icon name="pin" size={15} />{product.district}, {product.city}</span>
          <span>~{product.distanceKm.toLocaleString(locale)} km</span>
        </div>

        <div className="delivery-badges" aria-label={m.deliveryOptionsLabel}>
          {product.delivery.map((delivery) => (
            <Badge key={delivery} tone={delivery === "courier" ? "sage" : "neutral"}>
              {deliveryLabels[delivery][locale]}
            </Badge>
          ))}
          {product.customizable ? <Badge tone="gold">{m.customizableYes}</Badge> : null}
        </div>

        <div className="product-foot">
          <span className="price">{product.price.toLocaleString(locale)} ₺</span>
          <Link
            className="card-arrow"
            href={`/${locale}/products/${product.slug}`}
            aria-label={product.title[locale]}
          >
            <Icon name="arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
}
