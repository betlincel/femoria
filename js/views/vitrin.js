// Vitrin (Ana sayfa) — e-ticaret düzeni: afiş, kategoriler, yeni ürünler, nasıl çalışır, güven.
import { h, greeting, loading, loadingGrid, emptyState, icon, withIcon } from "../ui.js";
import { state } from "../store.js";
import { getCategories, latestProducts, nearbyProducts, announcements, districtDemand, RADIUS, photoUrl } from "../api.js";
import { productGrid, categoryTiles } from "../components.js";

// Hero arkasına el çizimi çiçek illüstrasyonu (dekoratif, erişilebilirlik için gizli).
function heroDecor() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "hero-decor");
  svg.setAttribute("viewBox", "0 0 260 280");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `
    <g stroke="#B9455A" stroke-width="1.4" fill="none" stroke-linecap="round">
      <path d="M130 60 C 140 45 160 48 162 68 C 164 48 184 45 192 60 C 200 48 214 60 208 78 C 220 78 224 96 212 104 C 220 118 208 128 194 122 C 196 136 180 142 170 132 C 168 148 150 148 142 138 C 136 148 120 146 118 132 C 108 136 96 128 104 114 C 90 110 92 92 106 90 C 100 76 112 68 128 76 C 124 60 130 60 130 60 Z"/>
      <path d="M170 100 L 170 220" stroke-dasharray="2 4"/>
      <circle cx="170" cy="100" r="4" fill="#B9455A"/>
      <path d="M90 180 Q 110 160 135 175" stroke-dasharray="3 3"/>
      <path d="M140 240 Q 155 220 175 235" stroke-dasharray="3 3"/>
      <circle cx="75" cy="200" r="2" fill="#B9455A"/>
      <circle cx="200" cy="180" r="2" fill="#B9455A"/>
    </g>
  `;
  return svg;
}

function featureCard({ ico, title, text, href, warm = false, children = [] }) {
  return h(href ? "a" : "section", { class: `card ${warm ? "card-warm" : ""} ${href ? "card-link" : ""}`, href },
    h("div", { class: "feature" },
      h("div", { class: "feature-ico", "aria-hidden": "true" }, icon(ico)),
      h("div", { style: { flex: "1" } }, h("h3", {}, title), text ? h("p", { class: "muted" }, text) : null, ...children),
      href ? h("span", { style: { color: "var(--text-faint)", alignSelf: "center" } }, icon("chevron-right")) : null,
    ),
  );
}

// Hero'nun altındaki koyu şerit: "YENI" başlıklı, 4 ürün önizlemesi.
// Dergi hissi veren, kart değil düz satır. Ürün yoksa el emeği kategori ikonlarına düşer.
function featuredStrip(items) {
  const photos = items.map((p) => ({ u: photoUrl(p.photos?.[0]), p })).filter((x) => x.u).slice(0, 4);
  const tiles = photos.length
    ? photos.map((x) => h("a", { class: "fstrip-tile", href: `#/urun/${x.p.id}`, "aria-label": x.p.title },
        h("img", { src: x.u, alt: "" })))
    : ["cat-kavanoz", "cat-seramik", "cat-orgu", "cat-bez-canta"].map((n) =>
        h("div", { class: "fstrip-tile fstrip-empty", "aria-hidden": "true" }, icon(n, 26)));
  return h("section", { class: "fstrip", "aria-label": "Yeni gelenler" },
    h("span", { class: "fstrip-label" }, "Yeni"),
    h("div", { class: "fstrip-tiles" }, ...tiles),
    h("a", { class: "fstrip-more", href: "#/yakinimda" }, "Tümü ", h("span", { "aria-hidden": "true" }, "→")),
  );
}

export default async function render(root) {
  const name = state.profile?.full_name;
  const gender = state.profile?.gender;
  const loc = state.location;
  const newArrivals = h("div", {}, loadingGrid(4));
  const extras = h("div", { class: "stack" });
  const heroArtSlot = h("div", { hidden: true });
  const stripSlot = h("div");

  root.append(
    h("section", { class: "hero" },
      heroDecor(),
      h("div", { class: "hero-grid" },
        h("div", { class: "hero-text" },
          h("div", { class: "eyebrow" }, loc?.neighborhood ? `${loc.neighborhood} · ${loc.district}` : "Ev emeği · 2026"),
          h("h1", {}, name ? `${greeting(name, gender)},` : "komşu-"),
          h("h1", {}, name ? "bugün ne satıyoruz?" : "nuzun eli."),
          h("p", {}, name
            ? "Mahallenizde bir yemek, bir reçel, bir patik bekliyor. Keşfedin ya da siz de üretin."
            : "Bir reçelin, bir patiğin ardında bir kadın, bir hikâye, bir mahalle var."),
          h("div", { class: "hero-actions" },
            h("a", { class: "btn btn-primary btn-xl", href: "#/yakinimda" }, "Keşfet"),
            h("a", { class: "btn btn-secondary btn-xl", href: "#/sat", "data-highlight": "bir-sey-sat" }, "Ürün sat"),
          ),
          h("div", { class: "hero-meta" },
            h("span", { class: "dot", "aria-hidden": "true" }),
            h("span", {}, loc?.neighborhood ? `${loc.neighborhood}, ${loc.district}` : "Mahallenizi seçin"),
            h("span", { class: "sep" }, "·"),
            h("span", {}, "El emeğiyle"),
          ),
        ),
        heroArtSlot,
      ),
    ),

    stripSlot,

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
      h("div", { class: "section-title" }, h("h2", {}, "Nasıl çalışır")),
      h("div", { class: "how" },
        ...[
          ["Fotoğrafını çekin", "Ürününüzü pencere kenarında çekin; ışığını biz düzeltelim."],
          ["Sesle anlatın", "Konuşun, Ayşe Abla yazsın. Benzer ürünlerin fiyatını da söyler."],
          ["Komşunuz bulsun", "Mahallenizdeki alıcılar size yazar; anlaşınca sipariş kartı oluşur."],
        ].map(([t, d], i) => h("div", { class: "how-step" },
          h("span", { class: "how-num" }, String(i + 1).padStart(2, "0")),
          h("h3", {}, t),
          h("p", { class: "muted" }, d),
        )),
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
  stripSlot.replaceWith(featuredStrip(items));
  newArrivals.replaceChildren(items.length
    ? productGrid(items)
    : h("div", { class: "card" }, emptyState("bag", "Henüz ürün yok", "Mahallenizde ilk ürünü siz koyun.", h("a", { class: "btn btn-primary", href: "#/sat" }, "İlk ürünü koy"))));

  // Kooperatif / buluşma günü duyuruları + "Mahallende Aranıyor"
  // Cinsiyet seçmemiş (eski) hesaplara bir kerelik hatırlatma
  if (state.user && state.profile && !state.profile.gender) {
    extras.append(h("div", { class: "section" }, featureCard({
      ico: "user", title: "Size nasıl hitap edelim?",
      text: "Cinsiyetinizi seçerseniz size \"Hanım\" ya da \"Bey\" diye hitap ederiz. Başkalarına gösterilmez.",
      href: "#/ayarlar?hitap=1", warm: true,
    })));
  }

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
