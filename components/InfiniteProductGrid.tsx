"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  mockProductPaginationService,
  PRODUCT_PAGE_SIZE,
} from "@/lib/catalog-pagination";
import type { Messages } from "@/lib/i18n";
import type { Locale, Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { ProductCardSkeleton } from "./ProductCardSkeleton";

export function InfiniteProductGrid({
  products,
  locale,
  messages: m,
  view,
}: {
  products: Product[];
  locale: Locale;
  messages: Messages;
  view: "grid" | "list";
}) {
  const [visibleCount, setVisibleCount] = useState(PRODUCT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [observerSupported, setObserverSupported] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const page = useMemo(
    () => mockProductPaginationService.page(products, 0, visibleCount),
    [products, visibleCount],
  );
  const hasMore = page.nextCursor !== null;

  useEffect(() => {
    if (!hasMore || loading) return;
    if (!("IntersectionObserver" in window)) {
      queueMicrotask(() => setObserverSupported(false));
      return;
    }
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setLoading(true);
        const timer = window.setTimeout(() => {
          setVisibleCount((current) => current + PRODUCT_PAGE_SIZE);
          setLoading(false);
        }, 160);
        observer.disconnect();
        return () => window.clearTimeout(timer);
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  return (
    <>
      <div className={`product-grid ${view === "list" ? "list" : ""}`}>
        {page.items.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            locale={locale}
            messages={m}
            imagePriority={index === 0}
          />
        ))}
        {loading
          ? Array.from({ length: Math.min(PRODUCT_PAGE_SIZE, products.length - page.items.length) }, (_, index) => (
              <ProductCardSkeleton key={`loading-${index}`} />
            ))
          : null}
      </div>
      <div className="infinite-sentinel" ref={sentinelRef} aria-hidden="true" />
      {!observerSupported && hasMore ? (
        <button
          className="btn btn-secondary load-more"
          type="button"
          onClick={() => setVisibleCount((current) => current + PRODUCT_PAGE_SIZE)}
        >
          {m.showMore}
        </button>
      ) : null}
      {!hasMore && products.length ? <p className="end-message">{m.allProductsSeen}</p> : null}
    </>
  );
}
