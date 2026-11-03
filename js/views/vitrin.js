// Vitrin (Ana sayfa) — taslak 1.2
import { h, greeting, loading, emptyState } from "../ui.js";
import { state } from "../store.js";
import { getCategories, latestProducts, nearbyProducts, announcements, districtDemand, RADIUS } from "../api.js";
import { productCard, categoryTiles } from "../components.js";

export default async function render(root) {
  const name = state.profile?.full_name;
  const newArrivals = h("div", { class: "stack" }, loading());
  const extras = h("div", { class: "stack" });

  root.append(
    h("h1", {}, greeting(name)),
    h("a", { class: "btn btn-primary btn-xl", href: "#/sat", "data-highlight": "bir-sey-sat" },
      h("span", { class: "ico", "aria-hidden": "true" }, "📸"), "Bir şey sat"),

    h("section", { class: "section" },
      h("h2", {}, "Ne arıyorsunuz?"),
      categoryTiles(await getCategories(), { hrefFor: (c) => `#/yakinimda?kategori=${c.slug}` }),
    ),

    extras,

    h("section", { class: "section" },
      h("div", { class: "section-title" },
        h("h2", {}, "Mahallenizden yeni gelenler"),
        h("a", { href: "#/yakinimda" }, "Tümü"),
      ),
      newArrivals,
    ),

    h("a", { class: "card card-link card-warm section", href: "#/rehber", "data-highlight": "rehber" },
      h("div", { class: "row" },
        h("span", { style: { flex: "0 0 auto", fontSize: "2.4rem" }, "aria-hidden": "true" }, "📖"),
        h("div", {}, h("h3", {}, "Femoria'yı nasıl kullanırım?"), h("p", { class: "muted small" }, "Ayşe Abla'nın küçük kitapçığı. Adım adım, resimli.")),
      ),
    ),
  );

  // Yeni gelenler: konum varsa en yakınlar, yoksa en yeniler
  const loc = state.location;
  const items = await (loc?.lat
    ? nearbyProducts({ lat: loc.lat, lng: loc.lng, radiusKm: RADIUS.ilcem, limit: 30 })
        .then((rows) => rows.sort((a, b) => new Date(b.published_at) - new Date(a.published_at)).slice(0, 6))
    : latestProducts({ limit: 6 })
  ).catch(() => []);
  newArrivals.replaceChildren(...(items.length
    ? items.map(productCard)
    : [emptyState("🧺", "Henüz ürün yok", "Mahallenizde ilk ürünü siz koyun!", h("a", { class: "btn btn-primary", href: "#/sat" }, "İlk ürünü koy"))]));

  // Kooperatif / buluşma günü duyuruları + "Mahallende Aranıyor"
  const [ann, demand] = await Promise.all([announcements(), state.user ? districtDemand() : []]);
  for (const a of ann.slice(0, 1)) {
    extras.append(h("section", { class: "card card-warm section" },
      h("h3", {}, `📣 ${a.title}`), h("p", {}, a.body)));
  }
  if (demand.length) {
    const top = demand[0];
    extras.append(h("section", { class: "card section" },
      h("h3", {}, "🔎 Mahallende aranıyor"),
      h("p", {}, `İlçenizde ${top.people} kişi "${top.query}" aradı.`),
      demand.length > 1 ? h("p", { class: "muted small" }, `Ayrıca: ${demand.slice(1, 4).map((d) => d.query).join(", ")}`) : null,
      h("a", { class: "btn btn-secondary", href: "#/sat" }, "Ben yapabilirim"),
    ));
  }
}
