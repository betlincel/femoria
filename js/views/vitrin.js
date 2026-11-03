// Vitrin (Ana sayfa) — taslak 1.2
import { h, greeting, loading, emptyState, icon, withIcon } from "../ui.js";
import { state } from "../store.js";
import { getCategories, latestProducts, nearbyProducts, announcements, districtDemand, RADIUS } from "../api.js";
import { productCard, categoryTiles } from "../components.js";

function featureCard({ ico, title, text, href, warm = false, children = [] }) {
  return h(href ? "a" : "section", { class: `card ${warm ? "card-warm" : ""} ${href ? "card-link" : ""}`, href },
    h("div", { class: "feature" },
      h("div", { class: "feature-ico", "aria-hidden": "true" }, icon(ico)),
      h("div", { style: { flex: "1" } }, h("h3", {}, title), text ? h("p", { class: "muted" }, text) : null, ...children),
      href ? h("span", { style: { color: "var(--text-faint)", alignSelf: "center" } }, icon("chevron-right")) : null,
    ),
  );
}

export default async function render(root) {
  const name = state.profile?.full_name;
  const loc = state.location;
  const newArrivals = h("div", { class: "stack" }, loading());
  const extras = h("div", { class: "stack" });

  root.append(
    h("section", { class: "hero" },
      loc?.neighborhood ? h("div", { class: "eyebrow" }, `${loc.neighborhood}, ${loc.district}`) : null,
      h("h1", {}, greeting(name)),
      h("p", {}, "Elinizle yaptığınızı 3 adımda mahallenize sunun."),
      h("a", { class: "btn btn-primary btn-xl", href: "#/sat", "data-highlight": "bir-sey-sat" }, withIcon("camera", "Bir şey sat")),
    ),

    h("section", { class: "section" },
      h("div", { class: "section-title" }, h("h2", {}, "Ne arıyorsunuz?")),
      categoryTiles(await getCategories(), { hrefFor: (c) => `#/yakinimda?kategori=${c.slug}` }),
    ),

    extras,

    h("section", { class: "section" },
      h("div", { class: "section-title" },
        h("h2", {}, "Mahallenizden yeni gelenler"),
        h("a", { href: "#/yakinimda" }, "Tümünü gör"),
      ),
      newArrivals,
    ),

    h("div", { class: "section" },
      featureCard({ ico: "book", title: "Femoria'yı nasıl kullanırım?", text: "Adım adım rehber: katılma, satma, bulma, mesajlaşma.", href: "#/rehber" }),
    ),
  );
  root.querySelector('a[href="#/rehber"]').dataset.highlight = "rehber";

  // Yeni gelenler: konum varsa en yakınlar, yoksa en yeniler
  const items = await (loc?.lat
    ? nearbyProducts({ lat: loc.lat, lng: loc.lng, radiusKm: RADIUS.ilcem, limit: 30 })
        .then((rows) => rows.sort((a, b) => new Date(b.published_at) - new Date(a.published_at)).slice(0, 6))
    : latestProducts({ limit: 6 })
  ).catch(() => []);
  newArrivals.replaceChildren(...(items.length
    ? items.map(productCard)
    : [h("div", { class: "card" }, emptyState("bag", "Henüz ürün yok", "Mahallenizde ilk ürünü siz koyun.", h("a", { class: "btn btn-primary", href: "#/sat" }, "İlk ürünü koy")))]));

  // Kooperatif / buluşma günü duyuruları + "Mahallende Aranıyor"
  const [ann, demand] = await Promise.all([announcements(), state.user ? districtDemand() : []]);
  for (const a of ann.slice(0, 1)) {
    extras.append(h("div", { class: "section" }, featureCard({ ico: "megaphone", title: a.title, text: a.body, warm: true })));
  }
  if (demand.length) {
    const top = demand[0];
    extras.append(h("div", { class: "section" }, featureCard({
      ico: "search",
      title: "Mahallende aranıyor",
      text: `İlçenizde ${top.people} kişi "${top.query}" aradı.${demand.length > 1 ? ` Ayrıca: ${demand.slice(1, 4).map((d) => d.query).join(", ")}.` : ""}`,
      children: [h("a", { class: "btn btn-secondary", href: "#/sat", style: { marginTop: "12px" } }, "Ben yapabilirim")],
    })));
  }
}
