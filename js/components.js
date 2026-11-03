// Ekranlar arasında paylaşılan bileşenler.
import { h, formatPrice, formatDistance, toast, sheet, icon, withIcon } from "./ui.js";
import { categoryIconName } from "./icons.js";
import { photoUrl, getLocations } from "./api.js";
import { state, saveLocation } from "./store.js";

export function pageTitle(text, { back } = {}) {
  return h("div", { class: "page-title" },
    back ? h("button", { class: "back-btn", "aria-label": "Geri", onclick: () => (typeof back === "function" ? back() : history.back()) }, icon("chevron-left")) : null,
    h("h1", {}, text),
  );
}

export function productPhoto(product, cls = "ph") {
  const url = photoUrl(product.photos?.[0]);
  return url
    ? h("img", { class: cls, src: url, alt: product.title, loading: "lazy" })
    : h("div", { class: cls, "aria-hidden": "true" }, icon(categoryIconName(product.category)));
}

export function productCard(p) {
  const url = photoUrl(p.photos?.[0]);
  return h("a", { class: "pcard", href: `#/urun/${p.id}` },
    h("div", { class: "pcard-img" },
      url ? h("img", { src: url, alt: p.title, loading: "lazy" }) : icon(categoryIconName(p.category)),
      p.status === "satildi" ? h("span", { class: "chip pcard-badge" }, "Satıldı") : null,
    ),
    h("div", { class: "pcard-body" },
      h("div", { class: "pcard-title" }, p.title),
      h("div", { class: "price" }, formatPrice(p.price)),
      h("div", { class: "meta" },
        p.distance_km != null || p.neighborhood ? icon("map-pin") : null,
        p.distance_km != null ? formatDistance(p.distance_km) : p.neighborhood || "",
      ),
    ),
  );
}

/** Ürün ızgarası: telefonda 2, tablette 3, masaüstünde 4 sütun */
export const productGrid = (items, { cols4 = true } = {}) =>
  h("div", { class: `pgrid ${cols4 ? "pgrid-4" : ""}` }, items.map(productCard));

export function breadcrumb(...parts) {
  const out = [];
  parts.forEach(([label, href], i) => {
    if (i) out.push(icon("chevron-right"));
    out.push(href ? h("a", { href }, label) : h("span", { "aria-current": "page" }, label));
  });
  return h("nav", { class: "breadcrumb", "aria-label": "Konumunuz" }, out);
}

export function categoryTiles(categories, { selected = null, onSelect, hrefFor } = {}) {
  return h("div", { class: "tiles", role: "list" },
    categories.map((c) => {
      const props = {
        class: "tile", role: "listitem", "aria-pressed": String(selected === c.slug),
        "aria-label": c.name,
      };
      if (hrefFor) props.href = hrefFor(c);
      else props.onclick = () => onSelect?.(c);
      return h(hrefFor ? "a" : "button", { ...props, type: hrefFor ? null : "button" },
        h("span", { class: "tile-ico", "aria-hidden": "true" }, icon(categoryIconName(c.slug))), h("span", {}, c.name));
    }),
  );
}

export function badgeChips(badges) {
  if (!badges?.length) return null;
  return h("div", { class: "badges" }, badges.map((b) => h("span", { class: "chip chip-ok", title: b.description }, icon("award"), b.name)));
}

// ---------- Konum: "Nerede olduğunuzu öğrenebilir miyim?" ----------
function nearest(locations, lat, lng) {
  let best = null, bestD = Infinity;
  for (const l of locations) {
    const d = (l.lat - lat) ** 2 + ((l.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestD) { bestD = d; best = l; }
  }
  return best;
}

/** Konum sorar; Promise<location|null> */
export function askLocation() {
  return new Promise((resolve) => {
    const close = sheet("Nerede olduğunuzu öğrenebilir miyim?", (closeSheet) => h("div", { class: "stack" },
      h("p", { class: "muted" }, "Size en yakın ürünleri göstermek için. Ev adresiniz kimseye görünmez; yalnızca mahalleniz görünür."),
      h("button", { class: "btn btn-primary btn-xl", onclick: () => { closeSheet(); useGps().then(resolve); } },
        withIcon("map-pin", "Evet, konumumu kullan")),
      h("button", { class: "btn btn-secondary btn-xl", onclick: () => { closeSheet(); pickLocation().then(resolve); } },
        withIcon("list", "Kendim seçeceğim")),
    ));
    void close;
  });
}

async function useGps() {
  if (!("geolocation" in navigator)) return pickLocation();
  const pos = await new Promise((res) => navigator.geolocation.getCurrentPosition(res, () => res(null), { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }));
  if (!pos) {
    toast("Konumunuzu alamadım. Listeden seçebilirsiniz.");
    return pickLocation();
  }
  const { latitude: lat, longitude: lng } = pos.coords;
  const locations = await getLocations().catch(() => []);
  const n = nearest(locations, lat, lng);
  const loc = { lat, lng, city: n?.city ?? null, district: n?.district ?? null, neighborhood: n?.neighborhood ?? null, source: "gps" };
  await saveLocation(loc);
  return loc;
}

/** İl → ilçe → mahalle listesinden seçim (konum izni vermeyenler için). */
export function pickLocation() {
  return new Promise(async (resolve) => {
    const all = await getLocations().catch(() => []);
    if (!all.length) {
      toast("Mahalle listesi yüklenemedi.");
      return resolve(null);
    }
    const uniq = (arr) => [...new Set(arr)];
    let city = state.location?.city || null;
    let district = null;
    const body = h("div", { class: "stack" });
    let closeFn;

    const step = () => {
      body.replaceChildren();
      if (!city) {
        body.append(h("p", {}, "İlinizi seçin:"),
          ...uniq(all.map((l) => l.city)).map((c) => h("button", { class: "btn btn-secondary", onclick: () => { city = c; step(); } }, c)));
      } else if (!district) {
        body.append(h("p", {}, `${city} — ilçenizi seçin:`),
          ...uniq(all.filter((l) => l.city === city).map((l) => l.district)).map((d) => h("button", { class: "btn btn-secondary", onclick: () => { district = d; step(); } }, d)),
          h("button", { class: "btn btn-ghost", onclick: () => { city = null; step(); } }, withIcon("chevron-left", "Başka il")));
      } else {
        body.append(h("p", {}, `${district} — mahallenizi seçin:`),
          ...all.filter((l) => l.city === city && l.district === district).map((l) => h("button", {
            class: "btn btn-secondary",
            onclick: async () => {
              const loc = { lat: l.lat, lng: l.lng, city, district, neighborhood: l.neighborhood, source: "liste" };
              await saveLocation(loc);
              closeFn();
              resolve(loc);
            },
          }, l.neighborhood)),
          h("button", { class: "btn btn-ghost", onclick: () => { district = null; step(); } }, withIcon("chevron-left", "Başka ilçe")));
      }
    };
    step();
    closeFn = sheet("Neredesiniz?", body);
  });
}
