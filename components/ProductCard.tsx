"use client";

import Link from "next/link";
import { useState } from "react";
import { categories, deliveryLabels, type Messages } from "@/lib/i18n";
import type { Locale, Product } from "@/lib/types";
import { Icon } from "./Icons";

export function ProductCard({ product, locale, messages }: { product: Product; locale: Locale; messages: Messages }) {
  const [favorite, setFavorite] = useState(false);
  const delivery = deliveryLabels[product.delivery[0]][locale];
  return (
    <article className="product-card">
      <div className="product-card-image">
        <Link href={`/${locale}/products/${product.slug}`} aria-label={product.title[locale]}>
          <img src={product.image} alt={product.title[locale]} loading="lazy" />
        </Link>
        <span className="product-tag">{product.preparation[locale]}</span>
        <button className="favorite" type="button" aria-label={messages.addFavorite} aria-pressed={favorite} onClick={() => setFavorite((value) => !value)}><Icon name="heart" size={18} /></button>
      </div>
      <div className="product-body">
        <div className="product-meta">
          <span>{categories[product.category][locale]}</span>
          <span className="rating">★ {product.rating} ({product.reviews})</span>
        </div>
        <h3><Link href={`/${locale}/products/${product.slug}`}>{product.title[locale]}</Link></h3>
        <p className="producer">{product.producer}</p>
        <div className="product-place"><span>{product.district}, {product.city}</span><span>~{product.distanceKm.toLocaleString(locale)} km</span></div>
        <div className="product-foot">
          <span className="price">{product.price.toLocaleString(locale)} ₺</span>
          <span className="delivery-tag">{delivery}</span>
        </div>
      </div>
    </article>
  );
}
