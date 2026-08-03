"use client";

import { useEffect, useMemo, useState } from "react";
import { deliveryLabels, type Messages } from "@/lib/i18n";
import type { CatalogCategory, DeliveryType, Locale, Product } from "@/lib/types";
import { Icon } from "./Icons";
import { InfiniteProductGrid } from "./InfiniteProductGrid";

export function ProductsExplorer({
  products,
  categoryOptions,
  locale,
  messages: m,
  initialQuery = "",
  initialCategory = "",
  initialCity = "",
}: {
  products: Product[];
  categoryOptions: CatalogCategory[];
  locale: Locale;
  messages: Messages;
  initialQuery?: string;
  initialCategory?: string;
  initialCity?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [city, setCity] = useState(initialCity);
  const [delivery, setDelivery] = useState<DeliveryType[]>([]);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState("recommended");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("filters-open", filtersOpen);
    return () => document.body.classList.remove("filters-open");
  }, [filtersOpen]);

  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      const title = product.title[locale].toLocaleLowerCase(locale);
      const producer = product.producer.toLocaleLowerCase(locale);
      const needle = query.trim().toLocaleLowerCase(locale);
      return (!needle || title.includes(needle) || producer.includes(needle))
        && (!category || product.category === category)
        && (!city || product.city === city)
        && (!delivery.length || delivery.every((item) => product.delivery.includes(item)))
        && (!min || product.price >= Number(min))
        && (!max || product.price <= Number(max));
    });
    if (sort === "price") return [...result].sort((a, b) => a.price - b.price);
    if (sort === "rating") {
      return [...result].sort(
        (a, b) => (b.rating ?? Number.NEGATIVE_INFINITY)
          - (a.rating ?? Number.NEGATIVE_INFINITY),
      );
    }
    return result;
  }, [products, query, category, city, delivery, min, max, sort, locale]);

  const resetKey = [query, category, city, delivery.join(","), min, max, sort].join("|");
  const supportsDelivery = products.some((product) => product.delivery.length > 0);
  const supportsRating = products.some((product) => product.rating !== undefined);
  const clear = () => { setQuery(""); setCategory(""); setCity(""); setDelivery([]); setMin(""); setMax(""); };
  return (
    <section className="section">
      <div className="container">
        <div className="toolbar">
          <button className="btn btn-secondary mobile-filter" type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((value) => !value)}>{m.showFilters}</button>
          <span className="results-note"><strong>{filtered.length}</strong> {m.results}</span>
          <div className="view-buttons">
            <button className={view === "grid" ? "active" : ""} type="button" aria-label={m.gridView} onClick={() => setView("grid")}><Icon name="grid" /></button>
            <button className={view === "list" ? "active" : ""} type="button" aria-label={m.listView} onClick={() => setView("list")}><Icon name="list" /></button>
          </div>
        </div>
        <div className="explorer">
          <div
            className={`filter-backdrop ${filtersOpen ? "open" : ""}`}
            aria-hidden="true"
            onClick={() => setFiltersOpen(false)}
          />
          <aside className={`filters ${filtersOpen ? "open" : ""}`} aria-label={m.filters}>
            <div className="filter-head">
            <h2>{m.filters}</h2>
              <button className="filter-close" type="button" onClick={() => setFiltersOpen(false)} aria-label={m.close}>
                <Icon name="close" />
              </button>
            </div>
            <div className="filter-group"><label htmlFor="search-products">{m.searchLabel}</label><input id="search-products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={m.searchPlaceholder} /></div>
            <div className="filter-group"><label htmlFor="category-filter">{m.category}</label><select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{m.all}</option>{categoryOptions.map((item) => <option key={item.id} value={item.slug}>{item.name[locale]}</option>)}</select></div>
            <div className="filter-group"><span className="filter-legend">{m.price}</span><div className="filter-row"><input aria-label={m.minPrice} type="number" min="0" value={min} onChange={(event) => setMin(event.target.value)} placeholder={m.minPrice} /><input aria-label={m.maxPrice} type="number" min="0" value={max} onChange={(event) => setMax(event.target.value)} placeholder={m.maxPrice} /></div></div>
            <div className="filter-group"><label htmlFor="location-filter">{m.locationFilter}</label><select id="location-filter" value={city} onChange={(event) => setCity(event.target.value)}><option value="">{m.allLocations}</option>{[...new Set(products.map((product) => product.city))].map((item) => <option key={item}>{item}</option>)}</select></div>
            {supportsDelivery ? <fieldset className="filter-group delivery-filter"><legend className="filter-legend">{m.delivery}</legend>{(Object.keys(deliveryLabels) as DeliveryType[]).map((item) => <label className="check" key={item}><input type="checkbox" checked={delivery.includes(item)} onChange={() => setDelivery((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} /><span>{deliveryLabels[item][locale]}</span></label>)}</fieldset> : null}
            <div className="filter-group"><label htmlFor="sort-filter">{m.sort}</label><select id="sort-filter" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">{m.recommended}</option><option value="price">{m.lowestPrice}</option>{supportsRating ? <option value="rating">{m.highestRating}</option> : null}</select></div>
            <button className="btn btn-secondary" type="button" onClick={clear}>{m.clearFilters}</button>
          </aside>
          <div>
            {filtered.length ? (
              <InfiniteProductGrid
                key={resetKey}
                products={filtered}
                locale={locale}
                messages={m}
                view={view}
              />
            ) : <div className="empty-state"><h3>{m.noResultsTitle}</h3><p>{m.noResultsText}</p><button className="btn btn-primary" type="button" onClick={clear}>{m.clearFilters}</button></div>}
          </div>
        </div>
      </div>
    </section>
  );
}
