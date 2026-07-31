"use client";

import { products } from "@/lib/mock-data";
import type { Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { useFavorites } from "./FavoritesProvider";
import { ProductCard } from "./ProductCard";
import { ProductCardSkeleton } from "./ProductCardSkeleton";

export function FavoritesView({
  locale,
  messages: m,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const { ids, ready } = useFavorites();
  const favorites = products.filter((product) => ids.includes(product.id));

  if (!ready) {
    return (
      <div className="product-grid">
        <ProductCardSkeleton />
        <ProductCardSkeleton />
      </div>
    );
  }

  if (!favorites.length) {
    return (
      <EmptyState
        title={m.favoritesEmptyTitle}
        text={m.favoritesEmptyText}
        action={{ href: `/${locale}/products`, label: m.exploreProducts }}
      />
    );
  }

  return (
    <div className="product-grid">
      {favorites.map((product) => (
        <ProductCard key={product.id} product={product} locale={locale} messages={m} />
      ))}
    </div>
  );
}
