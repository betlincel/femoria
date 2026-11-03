// Vitrin (Ana sayfa) — e-ticaret düzeni: afiş, kategoriler, yeni ürünler, nasıl çalışır, güven.
import { h, greeting, loading, emptyState, icon, withIcon } from "../ui.js";
import { state } from "../store.js";
import { getCategories, latestProducts, nearbyProducts, announcements, districtDemand, RADIUS, photoUrl } from "../api.js";
import { productGrid, categoryTiles } from "../components.js";

function featureCard({ ico, title, text, href, warm = false, children = [] }) {
  return h(href ? "a" : "section", { class: `card ${warm ? "card-warm" : ""} ${href ? "card-link" : ""}`, href },
    h("div", { class: "feature" },
      h("div", { class: "feature-ico", "aria-hidden": "true" }, icon(ico)),
      h("div", { style: { flex: "1" } }, h("h3", {}, title), text ? h("p", { class: "muted" }, text) : null, ...children),
      href ? h("span", { style: { color: "var(--text-faint)", alignSelf: "center" } }, icon("chevron-right")) : null,
    ),
  );
}

// Afişin sağındaki görsel: son ürün fotoğraflarından kolaj, yoksa kategori ikonları
function heroArt(items) {
  const photos = items.map((p) => photoUrl(p.photos?.[0])).filter(Boolean).slice(0, 4);
  const cells = photos.length >= 3
    ? photos.map((u) => h("img", { src: u, alt: "" }))
    : ["cat-yemek", "cat-orgu", "cat-taki", "cat-ev-susu"].map((n) => h("div", { class: "art-tile" }, icon(n, 44)));
  return h("div", { class: "hero-art", "aria-hidden": "true" }, h("div", { class: "art-grid" }, cells));
}

export default async function render(root) {
  const name = state.profile?.full_name;
  const loc = state.location;
  const newArrivals = h("div", {}, loading());
  const extras = h("div", { class: "stack" });
  const heroArtSlot = h("div");

  root.append(
    h("section", { class: "hero" },
      h("div", { class: "hero-grid" },
        h("div", {},
          h("div", { class: "eyebrow" }, loc?.neighborhood ? `${loc.neighborhood}, ${loc.district}` : "Mahallenin el emeği pazarı"),
          h("h1", {}, name ? `${greeting(name)},` : "Komşunuzun elinden,"),
          h("h1", { style: { color: "var(--primary)" } }, name ? "bugün ne satıyoruz?" : "sofranıza ve evinize."),
          h("p", {}, "Ev yemekleri, örgü, takı ve daha fazlası. Evde ürettiğinizi 3 adımda satışa çıkarın; mahallenizdeki el emeğini keşfedin."),
          h("div", { class: "hero-actions" },
            h("a", { class: "btn btn-primary btn-xl", href: "#/sat", "data-highlight": "bir-sey-sat" }, withIcon("camera", "Ürün sat")),
            h("a", { class: "btn btn-secondary btn-xl", href: "#/yakinimda" }, withIcon("map-pin", "Yakınımdakileri gör")),
          ),
        ),
        heroArtSlot,
      ),
    ),

    h("section", { class: "section" },
      h("div", { class: "section-title" }, h("h2", {}, "Kategoriler"), h("a", { href: "#/yakinimda" }, "Tüm ürünler")),
      categoryTiles(await getCategories(), { hrefFor: (c) => `#/yakinimda?kategori=${c.slug}` }),
    ),

    extras,

    h("section", { class: "section" },
      h("div", { class: "section-title" },
        h("h2", {}, loc?.neighborhood ? "Mahallenizden yeni gelenler" : "Yeni gelenler"),
        h("a", { href: "#/yakinimda" }, "Tümünü gör"),
      ),
      newArrivals,
    ),

    h("section", { class: "section" },
      h("div", { class: "section-title" }, h("h2", {}, "Nasıl çalışır?")),
      h("div", { class: "how" },
        ...[
          ["Fotoğrafını çekin", "Ürününüzü pencere kenarında çekin; ışığını biz düzeltelim."],
          ["Sesle anlatın", "Konuşun, Ayşe Abla yazsın. Benzer ürünlerin fiyatını da söyler."],
          ["Komşunuz bulsun", "Mahallenizdeki alıcılar size yazar; anlaşınca sipariş kartı oluşur."],
        ].map(([t, d], i) => h("div", { class: "card step-card" }, h("span", { class: "num" }, i + 1), h("div", {}, h("h3", {}, t), h("p", { class: "muted", style: { margin: 0 } }, d)))),
      ),
    ),

    h("section", { class: "section trust" },
      featureCard({ ico: "lock", title: "Adresiniz gizli", text: "Yalnızca mahalleniz görünür; konum her kayıtta kaydırılır." }),
      featureCard({ ico: "shield-check", title: "Güvenli mesajlaşma", text: "Telefon ve IBAN paylaşımına karşı uyarı, tek dokunuşla engelleme." }),
      featureCard({ ico: "sparkles", title: "Ayşe Abla yanınızda", text: "Takıldığınız her an adım adım yol gösterir." }),
    ),

    h("div", { class: "section" },
      featureCard({ ico: "book", title: "Femoria'yı nasıl kullanırım?", text: "Adım adım rehber: katılma, satma, bulma, mesajlaşma.", href: "#/rehber" }),
    ),
  );
  root.querySelector('a[href="#/rehber"]').dataset.highlight = "rehber";

  // Yeni gelenler: konum varsa en yakınlar, yoksa en yeniler
  const items = await (loc?.lat
    ? nearbyProducts({ lat: loc.lat, lng: loc.lng, radiusKm: RADIUS.ilcem, limit: 30 })
        .then((rows) => rows.sort((a, b) => new Date(b.published_at) - new Date(a.published_at)).slice(0, 8))
    : latestProducts({ limit: 8 })
  ).catch(() => []);
  heroArtSlot.replaceWith(heroArt(items));
  newArrivals.replaceChildren(items.length
    ? productGrid(items)
    : h("div", { class: "card" }, emptyState("bag", "Henüz ürün yok", "Mahallenizde ilk ürünü siz koyun.", h("a", { class: "btn btn-primary", href: "#/sat" }, "İlk ürünü koy"))));

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
