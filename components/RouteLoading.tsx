"use client";

import { usePathname } from "next/navigation";
import { translations } from "@/lib/i18n";
import { LoadingSpinner } from "./LoadingSpinner";
import { ProductCardSkeleton } from "./ProductCardSkeleton";

export function RouteLoading({
  cards = 3,
}: {
  cards?: number;
}) {
  const pathname = usePathname();
  const locale = pathname.startsWith("/en") ? "en" : "tr";
  const m = translations[locale];
  return (
    <section className="route-loading" aria-live="polite">
      <div className="container">
        <LoadingSpinner label={m.loadingContent} />
        <div className="route-loading-heading" aria-hidden="true">
          <div className="skeleton skeleton-line short" />
          <div className="skeleton skeleton-line route-loading-title" />
        </div>
        {cards ? (
          <div className="product-grid loading-grid">
            {Array.from({ length: cards }, (_, index) => <ProductCardSkeleton key={index} />)}
          </div>
        ) : null}
      </div>
    </section>
  );
}
