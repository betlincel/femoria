"use client";

import { useMemo, useState } from "react";
import { products } from "@/lib/mock-data";
import type { Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";
import { LocationPicker } from "./LocationPicker";
import { useLocationSelection } from "./LocationProvider";
import { ProductCard } from "./ProductCard";

export function NearbyExperience({
  locale,
  messages: m,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { location } = useLocationSelection();
  const nearbyProducts = useMemo(
    () =>
      [...products].sort((a, b) => {
        if (location?.city) {
          const cityDifference =
            Number(b.city === location.city) - Number(a.city === location.city);
          if (cityDifference) return cityDifference;
        }
        return a.distanceKm - b.distanceKm;
      }),
    [location],
  );

  return (
    <>
      <div className="nearby-grid">
        <div className="map" role="img" aria-label={m.mapPrivacy}>
          <div className="map-road road-one" />
          <div className="map-road road-two" />
          {[1, 2, 3, 4].map((pin) => <div className={`map-pin pin-${pin}`} key={pin}><span>{pin}</span></div>)}
          <p className="map-note"><Icon name="shield" /> {m.mapPrivacy}</p>
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
        <div className="product-grid">
          {nearbyProducts.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} messages={m} />
          ))}
        </div>
      </div>
      <LocationPicker locale={locale} messages={m} open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}
