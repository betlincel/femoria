// Vitrin (Ana sayfa) — geçişli afiş (ilk slayt: nasıl çalışır), yeni ürünler, güven, rehber.
import { h, loading, emptyState, icon } from "../ui.js";
import { state } from "../store.js";
import { latestProducts } from "../api.js";
import { productGrid } from "../components.js";
import { ayseAvatarSVG } from "../icons.js";

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
// Görseller ürün fotoğrafı değil, slayta özel çizimlerdir (beyaz tonlar, zemin rengine uyar).
const W = "rgba(255,255,255,", ART = {
  // Telefonla çekim: vizörde kavanoz, deklanşör
  how: `<svg viewBox="0 0 360 280" aria-hidden="true">
    <rect x="118" y="18" width="150" height="250" rx="26" fill="${W}.95)"/>
    <rect x="130" y="40" width="126" height="176" rx="12" fill="${W}.25)" stroke="${W}.9)" stroke-width="0"/>
    <rect x="130" y="40" width="126" height="176" rx="12" fill="#2B1D14" opacity=".55"/>
    <rect x="148" y="62" width="90" height="128" rx="10" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="9 7"/>
    <rect x="172" y="88" width="42" height="14" rx="4" fill="#F4C27A"/>
    <path d="M168 104h50v52c0 10-8 18-18 18h-14c-10 0-18-8-18-18z" fill="#E86A4A"/>
    <rect x="176" y="122" width="34" height="20" rx="4" fill="#fff" opacity=".9"/>
    <circle cx="193" cy="240" r="14" fill="none" stroke="#2B1D14" stroke-opacity=".25" stroke-width="4"/>
    <g fill="${W}.95)"><circle cx="58" cy="70" r="26"/><circle cx="300" cy="120" r="26"/><circle cx="64" cy="200" r="26"/></g>
    <g font-family="Inter, sans-serif" font-weight="800" font-size="26" text-anchor="middle" fill="#2B1D14"><text x="58" y="79">1</text><text x="300" y="129">2</text><text x="64" y="209">3</text></g>
    <path d="M84 74c20 0 26 8 32 16M274 122c-10 0-14 2-18 4M90 198c12-4 20-8 28-14" stroke="${W}.7)" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="2 8"/>
  </svg>`,
  // Kavanoz + yün yumağı + fiyat etiketi
  sat: `<svg viewBox="0 0 360 280" aria-hidden="true">
    <rect x="70" y="60" width="96" height="26" rx="8" fill="${W}.95)"/>
    <path d="M62 92h112v110c0 22-18 40-40 40h-32c-22 0-40-18-40-40z" fill="${W}.25)" stroke="${W}.95)" stroke-width="4"/>
    <path d="M70 150h96v52c0 18-14 32-32 32h-32c-18 0-32-14-32-32z" fill="#7A1E2B" opacity=".75"/>
    <rect x="84" y="118" width="68" height="34" rx="6" fill="#fff"/>
    <circle cx="258" cy="176" r="66" fill="${W}.92)"/>
    <g fill="none" stroke="#B8241B" stroke-width="5" stroke-linecap="round" opacity=".8">
      <path d="M204 150c30 6 64 30 82 78"/><path d="M196 186c34-2 70 16 86 52"/><path d="M226 116c26 18 50 52 52 100"/><path d="M262 110c18 22 32 52 30 92"/>
    </g>
    <path d="M300 30l44 0 0 44-58 58-44-44z" fill="#fff" transform="rotate(8 300 60)"/>
    <circle cx="326" cy="52" r="6" fill="#B8241B"/>
    <text x="300" y="104" font-family="Inter, sans-serif" font-weight="800" font-size="28" fill="#B8241B" transform="rotate(8 300 60)">₺</text>
  </svg>`,
  // Buharı tüten tencere + kase
  yemek: `<svg viewBox="0 0 360 280" aria-hidden="true">
    <g fill="none" stroke="${W}.85)" stroke-width="6" stroke-linecap="round">
      <path d="M140 70c-14-18 14-26 0-46"/><path d="M180 66c-14-18 14-26 0-46"/><path d="M220 70c-14-18 14-26 0-46"/>
    </g>
    <rect x="90" y="92" width="180" height="22" rx="11" fill="${W}.95)"/>
    <rect x="166" y="78" width="28" height="16" rx="6" fill="${W}.95)"/>
    <path d="M98 118h164v70c0 30-24 54-54 54h-56c-30 0-54-24-54-54z" fill="${W}.9)"/>
    <rect x="60" y="132" width="40" height="16" rx="8" fill="${W}.9)"/><rect x="260" y="132" width="40" height="16" rx="8" fill="${W}.9)"/>
    <path d="M120 160h120" stroke="#1E4D3A" stroke-opacity=".25" stroke-width="6" stroke-linecap="round"/>
    <path d="M250 222h88c0 26-20 44-44 44s-44-18-44-44z" fill="#F4C27A"/>
    <circle cx="276" cy="216" r="7" fill="#E86A4A"/><circle cx="296" cy="212" r="7" fill="#8CC084"/><circle cx="314" cy="217" r="7" fill="#E86A4A"/>
  </svg>`,
  // Konuşan Ayşe Abla
  ayse: () => `<svg viewBox="0 0 360 280" aria-hidden="true">
    <circle cx="150" cy="150" r="104" fill="${W}.18)"/>
    <g transform="translate(66 66) scale(3.5)">${ayseAvatarSVG(48).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>
    <path d="M226 40h112a16 16 0 0 1 16 16v48a16 16 0 0 1-16 16h-72l-26 22 6-22h-20a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16z" fill="#fff"/>
    <g fill="#6A2F8F"><rect x="236" y="62" width="96" height="10" rx="5"/><rect x="236" y="82" width="70" height="10" rx="5" opacity=".6"/></g>
    <circle cx="300" cy="214" r="34" fill="${W}.95)"/>
    <path d="M300 194a9 9 0 0 0-9 9v12a9 9 0 0 0 18 0v-12a9 9 0 0 0-9-9zM286 214a14 14 0 0 0 28 0M300 228v8" stroke="#6A2F8F" stroke-width="4" fill="none" stroke-linecap="round"/>
  </svg>`,
  // Kalkan + kilit + gizlenmiş numara
  guven: `<svg viewBox="0 0 360 280" aria-hidden="true">
    <path d="M150 26l92 34v62c0 66-44 112-92 132-48-20-92-66-92-132V60z" fill="${W}.92)"/>
    <path d="M110 140l28 28 56-58" stroke="#1F4E8C" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="252" y="40" width="96" height="74" rx="14" fill="${W}.95)"/>
    <path d="M276 40v-12a24 24 0 0 1 48 0v12" stroke="${W}.95)" stroke-width="10" fill="none"/>
    <circle cx="300" cy="74" r="10" fill="#1F4E8C"/><rect x="296" y="78" width="8" height="18" rx="4" fill="#1F4E8C"/>
    <rect x="232" y="178" width="120" height="56" rx="16" fill="#fff"/>
    <text x="292" y="214" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800" font-size="20" fill="#1F4E8C" letter-spacing="1">05•• •••</text>
  </svg>`,
};

const SLIDES = [
  {
    cls: "s-how", kicker: "Nasıl çalışır?", title: "3 adımda satışa çık",
    steps: [
      ["Fotoğrafını çek", "Pencere kenarında çek; ışığını biz düzeltelim."],
      ["Sesle anlat", "Konuş, Ayşe Abla yazsın; fiyat önerisini de söylesin."],
      ["Satışa çıkar", "Alıcılar sana yazar; anlaşınca sipariş kartı oluşur."],
    ],
    cta: "Hemen başla", href: "#/sat", highlight: "bir-sey-sat", art: "how",
  },
  {
    cls: "s-sat", kicker: "Ücretsiz ilan", title: "Elinle yaptığını sat, emeğin kazandırsın!",
    text: "Reçelin, örgün, mantın… El emeğin alıcısını bulsun.",
    cta: "Ürün sat", href: "#/sat", art: "sat",
  },
  {
    cls: "s-yemek", kicker: "Ev yapımı", title: "Komşunun elinden ev yapımı lezzetler",
    text: "Tarhana, erişte, reçel, salça… Kadın üreticilerden.",
    cta: "Ev yemeklerine bak", href: "#/urunler?kategori=yemek", art: "yemek",
  },
  {
    cls: "s-ayse", kicker: "Yapay zeka yardımcın", title: "Yazmakla uğraşma, konuş — Ayşe Abla yazsın",
    text: "Ürününü sesle anlat; adını, açıklamasını ve fiyat önerisini o hazırlasın.",
    cta: "Ayşe Abla ile tanış", action: () => document.getElementById("assistant-fab")?.click(), art: "ayse",
  },
  {
    cls: "s-guven", kicker: "Güvenli alışveriş", title: "Güvenle al, güvenle sat",
    text: "Ev adresin gizli, mesajların korumalı. Rahatsız eden olursa tek dokunuşla engelle.",
    cta: "Güvenlik ipuçları", href: "#/rehber#mesajlasmak", art: "guven",
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
      sl.steps
        ? h("ol", { class: "promo-steps" }, sl.steps.map(([t, d], k) => h("li", {}, h("span", { class: "n" }, k + 1), h("div", {}, h("strong", {}, t), h("span", {}, d)))))
        : h("p", {}, sl.text),
      sl.href
        ? h("a", { class: "btn promo-cta", href: sl.href, "data-highlight": sl.highlight || null, tabindex: i ? "-1" : null }, sl.cta, icon("arrow-right", 20))
        : h("button", { type: "button", class: "btn promo-cta", onclick: sl.action, tabindex: i ? "-1" : null }, sl.cta, icon("arrow-right", 20)),
    ),
    h("div", { class: "promo-art", "aria-hidden": "true", html: typeof ART[sl.art] === "function" ? ART[sl.art]() : ART[sl.art] }),
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
  };
}

export default async function render(root) {
  const newArrivals = h("div", {}, loading());
  const extras = h("div", { class: "stack" });

  const promo = promoCarousel();
  root.append(
    h("h1", { class: "sr-only" }, "Femoria — mahallenin el emeği pazarı"),
    promo.el,


    extras,

    h("section", { class: "section" },
      h("div", { class: "section-title" },
        h("h2", {}, "Yeni gelenler"),
        h("a", { href: "#/urunler" }, "Tümünü gör"),
      ),
      newArrivals,
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
