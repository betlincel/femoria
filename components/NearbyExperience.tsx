"use client";

import { useMemo, useState } from "react";
import { nearbyEditorial } from "@/lib/content/editorial-content";
import type { Messages } from "@/lib/i18n";
import type { Locale, Product } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icons";
import { LocationPicker } from "./LocationPicker";
import { useLocationSelection } from "./LocationProvider";
import { ProductCard } from "./ProductCard";

export function NearbyExperience({
  locale,
  messages: m,
  products,
}: {
  locale: Locale;
  messages: Messages;
  products: Product[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { location } = useLocationSelection();
  const nearbyProducts = useMemo(
    () => location?.source === "manual"
      ? products.filter((product) => product.city.toLocaleLowerCase("tr-TR") === location.city.toLocaleLowerCase("tr-TR"))
      : [],
    [location, products],
  );

  return (
    <>
      <div className="nearby-grid">
        <div className="map map-privacy" role="img" aria-label={m.mapPrivacy}>
          <span className="privacy-orbit orbit-one" aria-hidden="true" />
          <span className="privacy-orbit orbit-two" aria-hidden="true" />
          <span className="privacy-shield" aria-hidden="true"><Icon name="shield" size={44} /></span>
          <div className="map-note"><strong>{nearbyEditorial.privacyTitle[locale]}</strong><p>{nearbyEditorial.privacyText[locale]}</p></div>
        </div>
        <aside className="nearby-panel">
          <p className="eyebrow">{m.locationShort}</p>
          <h2>{location?.label ?? m.chooseLocation}</h2>
          <p>{m.chooseLocationText}</p>
          <div className="location-options">
            <button className="location-choice" type="button" onClick={() => setPickerOpen(true)}>
              <strong>{m.useMyLocation}</strong><span>{m.useMyLocationHint}</span>
            </button>
            <button className="location-choice" type="button" onClick={() => setPickerOpen(true)}>
              <strong>{m.chooseManually}</strong><span>{m.chooseManuallyHint}</span>
            </button>
          </div>
          <div className="privacy-note"><strong>{m.privacyTitle}</strong><br />{m.privacyDetail}</div>
        </aside>
      </div>
      <div className="nearby-results">
        <div className="section-head">
          <div><p className="eyebrow">{m.nearbyEyebrow}</p><h2>{m.nearbyTitle}</h2><p>{m.nearbyText}</p></div>
        </div>
        {nearbyProducts.length ? <div className="product-grid">
          {nearbyProducts.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} messages={m} />
          ))}
        </div> : <EmptyState
          title={location?.source === "browser" ? nearbyEditorial.browserLimitTitle[locale] : nearbyEditorial.emptyTitle[locale]}
          text={location?.source === "browser" ? nearbyEditorial.browserLimitText[locale] : nearbyEditorial.emptyText[locale]}
          action={{ href: `/${locale}/products`, label: m.exploreProducts }}
        />}
      </div>
      <LocationPicker locale={locale} messages={m} open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}
