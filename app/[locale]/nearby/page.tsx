import type { Metadata } from "next";
import { Icon } from "@/components/Icons";
import { getLocale, translations } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: locale === "tr" ? "Yakınımdakiler" : "Nearby" };
}

export default async function NearbyPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  return (
    <>
      <section className="page-hero"><div className="container"><p className="eyebrow">{m.nearbyEyebrow}</p><h1 className="page-title">{m.nearbyPageTitle}</h1><p>{m.nearbyIntro}</p></div></section>
      <div className="container nearby-grid">
        <div className="map" role="img" aria-label={m.mapPrivacy}>
          <div className="map-road road-one" />
          <div className="map-road road-two" />
          {[1, 2, 3, 4].map((pin) => <div className={`map-pin pin-${pin}`} key={pin}><span>{pin}</span></div>)}
          <p className="map-note"><Icon name="shield" /> {m.mapPrivacy}</p>
        </div>
        <aside className="nearby-panel">
          <p className="eyebrow">{m.locationShort}</p>
          <h2>{m.chooseLocation}</h2>
          <p>{m.chooseLocationText}</p>
          <div className="location-options">
            <button className="location-choice" type="button"><strong>{m.useMyLocation}</strong><span>{m.useMyLocationHint}</span></button>
            <button className="location-choice" type="button"><strong>{m.chooseManually}</strong><span>{m.chooseManuallyHint}</span></button>
          </div>
          <div className="privacy-note"><strong>{m.privacyTitle}</strong><br />{m.privacyDetail}</div>
        </aside>
      </div>
    </>
  );
}
