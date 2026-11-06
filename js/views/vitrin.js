// Vitrin (Ana sayfa) — e-ticaret düzeni: geçişli afiş (karosel), kategoriler, yeni ürünler, nasıl çalışır, güven.
import { h, greeting, loading, emptyState, icon, withIcon } from "../ui.js";
import { state } from "../store.js";
import { getCategories, latestProducts, photoUrl } from "../api.js";
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

// ---------- Ana sayfa afişi: geçişli karosel ----------
const SLIDES = [
  {
    cls: "s-sat", kicker: "Ücretsiz ilan", title: "Elinle yaptığını sat, emeğin kazandırsın!",
    text: "Reçelin, örgün, mantın… Fotoğrafını çek, anlat; 3 dakikada vitrinde.",
    cta: "Hemen satmaya başla", href: "#/sat", highlight: "bir-sey-sat",
    art: ["cat-yemek", "cat-orgu", "cat-taki"], badge: ["3 dakikada", "vitrinde"],
  },
  {
    cls: "s-yemek", kicker: "Ev yapımı", title: "Komşunun elinden ev yapımı lezzetler",
    text: "Tarhana, erişte, reçel, salça… Mahallendeki kadın üreticilerden.",
    cta: "Ev yemeklerine bak", href: "#/urunler?kategori=yemek",
    art: ["cat-yemek", "cat-kurutmalik", "cat-yemek"], badge: ["Taze", "ve ev yapımı"],
  },
  {
    cls: "s-ayse", kicker: "Yapay zeka yardımcın", title: "Yazmakla uğraşma, konuş — Ayşe Abla yazsın",
    text: "Ürününü sesle anlat; adını, açıklamasını ve fiyat önerisini o hazırlasın.",
    cta: "Ayşe Abla ile tanış", action: () => document.getElementById("assistant-fab")?.click(),
    art: ["mic", "sparkles", "message"], badge: ["Konuş,", "o yazsın"],
  },
  {
    cls: "s-guven", kicker: "Güvenli alışveriş", title: "Güvenle al, güvenle sat",
    text: "Ev adresin gizli, mesajların korumalı. Rahatsız eden olursa tek dokunuşla engelle.",
    cta: "Nasıl çalışır?", href: "#/rehber",
    art: ["shield-check", "lock", "users"], badge: ["Adresin", "gizli kalır"],
  },
];
const AUTO_MS = 6000;

function promoCarousel() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let index = 0, timer = null, paused = false;

  const slides = SLIDES.map((sl, i) => h("div", {
    class: `promo-slide ${sl.cls}`, role: "group", "aria-roledescription": "slayt",
    "aria-label": `${i + 1} / ${SLIDES.length}: ${sl.title}`, "aria-hidden": i ? "true" : "false",
  },
    h("div", { class: "copy" },
      h("span", { class: "kicker" }, icon("sparkles", 14), sl.kicker),
      h("h2", {}, sl.title),
      h("p", {}, sl.text),
      sl.href
        ? h("a", { class: "btn promo-cta", href: sl.href, "data-highlight": sl.highlight || null, tabindex: i ? "-1" : null }, sl.cta, icon("arrow-right", 20))
        : h("button", { type: "button", class: "btn promo-cta", onclick: sl.action, tabindex: i ? "-1" : null }, sl.cta, icon("arrow-right", 20)),
    ),
    h("div", { class: "promo-art", "aria-hidden": "true" },
      h("div", { class: "float f1" }, icon(sl.art[0])),
      h("div", { class: "float f2" }, icon(sl.art[1])),
      h("div", { class: "float f3" }, icon(sl.art[2])),
      h("div", { class: "badge" }, sl.badge[0], h("small", {}, sl.badge[1])),
    ),
  ));

  const track = h("div", { class: "promo-track", "aria-live": reduceMotion ? "polite" : "off" }, slides);
  const dots = h("div", { class: "promo-dots", role: "group", "aria-label": "Slayt seç" },
    SLIDES.map((sl, i) => h("button", { type: "button", "aria-label": `${i + 1}. slayt: ${sl.title}`, "aria-current": String(i === 0), onclick: () => go(i, true) })));
  const prev = h("button", { type: "button", class: "promo-nav prev", "aria-label": "Önceki slayt", onclick: () => go(index - 1, true) }, icon("chevron-left"));
  const next = h("button", { type: "button", class: "promo-nav next", "aria-label": "Sonraki slayt", onclick: () => go(index + 1, true) }, icon("chevron-right"));
  const root = h("section", { class: "promo", "aria-roledescription": "karosel", "aria-label": "Femoria'dan öne çıkanlar" }, track, prev, next, dots);

  function go(i, byUser = false) {
    index = (i + SLIDES.length) % SLIDES.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    slides.forEach((el, k) => {
      el.setAttribute("aria-hidden", String(k !== index));
      el.querySelector(".promo-cta").tabIndex = k === index ? 0 : -1;
    });
    [...dots.children].forEach((d, k) => d.setAttribute("aria-current", String(k === index)));
    if (byUser) restart();
  }
  function restart() {
    clearInterval(timer);
    if (!reduceMotion) timer = setInterval(() => { if (!paused && !document.hidden) go(index + 1); }, AUTO_MS);
  }

  // Fare üstündeyken ya da klavyeyle içindeyken durur
  root.addEventListener("mouseenter", () => (paused = true));
  root.addEventListener("mouseleave", () => (paused = false));
  root.addEventListener("focusin", () => (paused = true));
  root.addEventListener("focusout", () => (paused = false));
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(index + 1, true);
    if (e.key === "ArrowLeft") go(index - 1, true);
  });
  // Telefonda kaydırma
  let startX = null;
  track.addEventListener("pointerdown", (e) => { startX = e.clientX; });
  track.addEventListener("pointerup", (e) => {
    if (startX == null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1), true);
  });

  restart();
  return {
    el: root,
    stop: () => clearInterval(timer),
    /** Son ürünlerin fotoğrafları varsa ilk iki slaytın görselinde kullan */
    setPhotos(urls) {
      if (urls.length < 3) return;
      slides.slice(0, 2).forEach((el, k) => {
        el.querySelectorAll(".float").forEach((f, j) => {
          const u = urls[(j + k * 3) % urls.length];
          f.replaceChildren(h("img", { src: u, alt: "", loading: "lazy" }));
        });
      });
    },
  };
}

export default async function render(root) {
  const name = state.profile?.full_name;
  const gender = state.profile?.gender;
  const loc = state.location;
  const newArrivals = h("div", {}, loading());
  const extras = h("div", { class: "stack" });

  const promo = promoCarousel();
  root.append(
    h("h1", { class: "sr-only" }, "Femoria — mahallenin el emeği pazarı"),
    name ? h("p", { class: "home-greeting" }, `${greeting(name, gender)}, bugün ne satıyoruz?`) : null,
    promo.el,

    h("section", { class: "section" },
      h("div", { class: "section-title" }, h("h2", {}, "Kategoriler"), h("a", { href: "#/urunler" }, "Tüm ürünler")),
      categoryTiles(await getCategories(), { hrefFor: (c) => `#/urunler?kategori=${c.slug}` }),
    ),

    extras,

    h("section", { class: "section" },
      h("div", { class: "section-title" },
        h("h2", {}, "Yeni gelenler"),
        h("a", { href: "#/urunler" }, "Tümünü gör"),
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

  // Yeni gelenler: tüm Türkiye'den en yeni ürünler
  const items = await latestProducts({ limit: 8 }).catch(() => []);
  promo.setPhotos(items.map((p) => photoUrl(p.photos?.[0])).filter(Boolean).slice(0, 6));
  newArrivals.replaceChildren(items.length
    ? productGrid(items)
    : h("div", { class: "card" }, emptyState("bag", "Henüz ürün yok", "İlk ürünü siz koyun.", h("a", { class: "btn btn-primary", href: "#/sat" }, "İlk ürünü koy"))));

  // Cinsiyet seçmemiş (eski) hesaplara bir kerelik hatırlatma
  if (state.user && state.profile && !state.profile.gender) {
    extras.append(h("div", { class: "section" }, featureCard({
      ico: "user", title: "Size nasıl hitap edelim?",
      text: "Cinsiyetinizi seçerseniz size \"Hanım\" ya da \"Bey\" diye hitap ederiz. Başkalarına gösterilmez.",
      href: "#/ayarlar?hitap=1", warm: true,
    })));
  }

  return promo.stop;
}
