// Femoria — uygulama girişi
import { isConfigured } from "./supabase.js";
import { state, initAuth, onChange, LS } from "./store.js";
import { route, startRouter, onRoute, navigate } from "./router.js";
import { subscribeIncoming, track, resetAdminCache, unreadCount, getCategories, categoryTree } from "./api.js";
import { initAssistant, assistantEvent } from "./assistant.js";
import { esc, toast, h } from "./ui.js";
import { iconSVG, ayseAvatarSVG } from "./icons.js";
import { ensureKvkkConsent } from "./consent.js";
import { loadFavorites } from "./favorites.js";
import { cartCount } from "./cart.js";
import { pickBrowsePlace, getBrowsePlace, placeLabel } from "./components.js";

route(/^\/$/, "vitrin", () => import("./views/vitrin.js"));
route(/^\/urunler$/, "urunler", () => import("./views/urunler.js"));
// Eski "Yakınımda" bağlantıları yeni ürün listesine gider (kategori ve arama korunur)
route(/^\/yakinimda$/, "urunler", async () => ({
  default: (_root, { query }) => {
    const qs = new URLSearchParams(Object.entries(query).filter(([k]) => ["kategori", "q"].includes(k))).toString();
    navigate(`/urunler${qs ? "?" + qs : ""}`, { replace: true });
  },
}));
route(/^\/sat$/, "sat", () => import("./views/sat.js"), "medium");
route(/^\/mesajlar$/, "mesajlar", () => import("./views/mesajlar.js"), "medium");
route(/^\/favoriler$/, "favoriler", () => import("./views/favoriler.js"));
route(/^\/sepet$/, "sepet", () => import("./views/sepet.js"));
route(/^\/odeme$/, "odeme", () => import("./views/odeme.js"));
route(/^\/siparislerim$/, "siparislerim", () => import("./views/siparislerim.js"), "medium");
route(/^\/odeme-hesabi$/, "profil", () => import("./views/odeme-hesabi.js"), "narrow");
route(/^\/magaza\/([\w-]+)$/, "magaza", () => import("./views/magaza.js"));
route(/^\/sohbet\/([\w-]+)$/, "mesajlar", () => import("./views/sohbet.js"), "medium");
route(/^\/urun\/([\w-]+)$/, "urun", () => import("./views/urun.js"));
route(/^\/profil$/, "profil", () => import("./views/profil.js"));
route(/^\/ayarlar$/, "profil", () => import("./views/ayarlar.js"), "narrow");
route(/^\/rehber$/, "rehber", () => import("./views/rehber.js"), "medium");
route(/^\/giris$/, "giris", () => import("./views/giris.js"), "narrow");
route(/^\/sifre-yenile$/, "giris", () => import("./views/sifre.js"), "narrow");
route(/^\/kazanc$/, "profil", () => import("./views/kazanc.js"), "narrow");
route(/^\/yonetim$/, "urunler", () => import("./views/yonetim.js"), "medium");
route(/^\/yasal\/([\w-]+)$/, "aydinlatma", () => import("./views/yasal.js"), "medium");
route(/^\/aydinlatma$/, "aydinlatma", () => import("./views/aydinlatma.js"), "medium");

// Alt menüde aktif sekme
onRoute(({ screen }) => {
  document.querySelectorAll(".bottom-nav a, .header-link").forEach((a) => {
    const active = a.dataset.route === screen;
    a.classList.toggle("active", active);
    if (active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
});

// Sağ üstteki yuvarlak profil fotoğrafı
function renderAvatar() {
  const el = document.getElementById("topbar-avatar");
  const p = state.profile;
  if (p?.avatar_url) el.innerHTML = `<img src="${esc(p.avatar_url)}" alt="">`;
  else if (p?.full_name) el.textContent = p.full_name.trim()[0].toLocaleUpperCase("tr-TR");
  else el.innerHTML = iconSVG("user", 22);
  document.getElementById("account-label").textContent = state.user ? (p?.full_name?.split(" ")[0] || "Hesabım") : "Giriş yap";
  document.querySelector('.header-link[data-route="profil"]').setAttribute("href", state.user ? "#/profil" : "#/giris");
  // Giriş yapılmamışsa belirgin "Giriş" düğmesi, yapılmışsa hesap bağlantısı
  document.getElementById("login-pill").hidden = !!state.user;
  document.querySelector('.header-link[data-route="profil"]').classList.toggle("logged-out", !state.user);
  document.querySelector(".fab-face").innerHTML = ayseAvatarSVG(40);
}

// Yeni mesaj: alt menüde kırmızı nokta + Ayşe Abla'nın ilk mesaj yardımı
let stopInbox = () => {};
let lastUserId = null;
onChange(() => {
  renderAvatar();
  ensureKvkkConsent();
  if (state.passwordRecovery) {
    state.passwordRecovery = false;
    navigate("/sifre-yenile", { replace: true });
  }
  if (state.user?.id !== lastUserId) {
    lastUserId = state.user?.id ?? null;
    resetAdminCache();
    loadFavorites();
    refreshUnread();
    stopInbox();
    stopInbox = subscribeIncoming((msg) => {
      // Sunucudaki sayıyı yenile; migration yoksa bu oturumdaki yeni mesajları sayar
      if (!location.hash.includes(msg.conversation_id)) { if (!countSupported) paintUnread(unread + 1); refreshUnread(); }
      assistantEvent("message_received", msg);
    });
  }
});

// Mesaj simgesindeki okunmamış sohbet sayısı (üst çubuk + alt menü + sekme başlığı)
let unread = 0, countSupported = true;
function paintUnread(n) {
  unread = n;
  for (const id of ["unread-dot", "unread-dot-top"]) {
    const el = document.getElementById(id);
    el.textContent = n > 99 ? "99+" : String(n);
    el.hidden = !n;
  }
  document.title = n ? `(${n}) ${document.title.replace(/^\(\d+\+?\)\s*/, "")}` : document.title.replace(/^\(\d+\+?\)\s*/, "");
}
async function refreshUnread() {
  if (!state.user) return paintUnread(0);
  const n = await unreadCount().catch(() => null);
  if (n === null) { countSupported = false; return; }
  countSupported = true;
  paintUnread(n);
}
window.addEventListener("focus", refreshUnread);
setInterval(() => { if (!document.hidden) refreshUnread(); }, 45000);

onRoute(({ screen }) => {
  setTimeout(refreshUnread, screen === "mesajlar" ? 1200 : 300); // sohbet açılınca okundu işaretlenir, ardından sayı güncellenir
  setTimeout(ensureKvkkConsent, 0); // aydınlatma sayfasından çıkınca onay iste
  // Başlıktaki arama kutusu ürün listesi dışında temizlenir
  if (screen !== "urunler") document.getElementById("q").value = "";
  expandFab();
});

// Ayşe Abla düğmesi: her sayfada birkaç saniye adıyla görünür, sonra avatara küçülür.
let fabTimer;
function expandFab() {
  const fab = document.getElementById("assistant-fab");
  fab.classList.remove("compact");
  clearTimeout(fabTimer);
  fabTimer = setTimeout(() => fab.classList.add("compact"), 3500);
}
window.addEventListener("scroll", () => {
  if (window.scrollY > 40) document.getElementById("assistant-fab").classList.add("compact");
}, { passive: true });

// Kabuktaki ikonlar (alt menü, Ayşe Abla düğmesi)
function paintShell() {
  document.querySelectorAll("[data-icon]").forEach((el) => el.insertAdjacentHTML("afterbegin", iconSVG(el.dataset.icon, 24)));
}

// Başlıktaki arama: sonuçlar "Tüm ürünler" sayfasında gösterilir
document.getElementById("header-search").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = document.getElementById("q").value.trim();
  navigate(q ? `/urunler?q=${encodeURIComponent(q)}` : "/urunler");
});

// Masaüstünde arama simgeyle açılan şeride dönüşür (telefonda hep görünür)
{
  const header = document.querySelector(".site-header");
  const toggle = document.getElementById("search-toggle");
  const setOpen = (open) => {
    header.classList.toggle("search-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (open) document.getElementById("q").focus();
  };
  toggle.addEventListener("click", () => setOpen(!header.classList.contains("search-open")));
  document.getElementById("header-search").addEventListener("submit", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && header.classList.contains("search-open")) { setOpen(false); toggle.focus(); } });
  onRoute(() => setOpen(false));
}

// Başlıktaki konum düğmesi: il / ilçe seç → o yerin ürünleri
function paintPlace(place = getBrowsePlace()) {
  const label = document.getElementById("place-label");
  const name = [place?.district, place?.city].filter(Boolean).join(", ");
  if (place?.current && name) {
    // İki satır: küçük "Mevcut konum" etiketi + yer adı (kısalıp kaybolmasın)
    label.replaceChildren(h("small", {}, "Mevcut konum"), h("b", {}, place.district || place.city));
    label.classList.add("is-current");
  } else {
    label.textContent = placeLabel(place);
    label.classList.remove("is-current");
  }
  document.getElementById("place-pill").title = placeLabel(place);
}
document.getElementById("place-pill").addEventListener("click", async () => {
  const place = await pickBrowsePlace();
  if (!place) return;
  const qs = new URLSearchParams();
  if (place.city) qs.set("il", place.city);
  if (place.district) qs.set("ilce", place.district);
  if (place.current) qs.set("konum", "mevcut");
  navigate(`/urunler${qs.toString() ? "?" + qs : ""}`);
});
window.addEventListener("femoria:place", (e) => paintPlace(e.detail));

// Üst kategori çubuğu: ana kategoriler + "Tüm Kategoriler" paneli (alt kategoriler sütunlar halinde)
async function fillCategoryBar() {
  const tree = categoryTree(await getCategories());
  const bar = document.getElementById("category-bar");
  const fcol = document.getElementById("footer-cats");
  if (fcol) for (const g of tree.filter((x) => x.slug !== "diger")) fcol.append(h("a", { href: `#/urunler?kategori=${g.slug}` }, g.name));
  for (const g of tree) {
    const a = document.createElement("a");
    a.href = `#/urunler?kategori=${g.slug}`;
    a.textContent = g.name;
    bar.append(a);
  }

  // Çubuğa sığmayan kategoriler gizlenir (hepsi "Tüm Kategoriler" panelinde)
  const links = [...bar.querySelectorAll("a")];
  const fit = () => {
    links.forEach((a) => (a.hidden = false));
    const firstTop = links[0]?.offsetTop;
    links.forEach((a) => { if (a.offsetTop > firstTop + 4) a.hidden = true; });
  };
  fit();
  document.fonts?.ready.then(fit);
  window.addEventListener("load", fit);
  let fitTimer;
  window.addEventListener("resize", () => { clearTimeout(fitTimer); fitTimer = setTimeout(fit, 120); });

  const btn = document.getElementById("all-cats-btn");
  const mega = document.getElementById("cat-mega");
  mega.replaceChildren(h("div", { class: "cat-mega-grid" }, tree.filter((g) => g.slug !== "diger").map((g) => h("section", { class: "cat-col" },
    h("a", { class: "cat-col-title", href: `#/urunler?kategori=${g.slug}` }, g.name),
    h("ul", {}, g.children.map((c) => h("li", {}, h("a", { href: `#/urunler?kategori=${c.slug}` }, c.name)))),
  ))), h("a", { class: "cat-mega-all", href: "#/urunler" }, "Tüm ürünleri gör"));
  const set = (open) => {
    mega.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    btn.classList.toggle("open", open);
  };
  btn.addEventListener("click", (e) => { e.stopPropagation(); set(mega.hidden); });
  mega.addEventListener("click", (e) => e.target.closest("a") && set(false));
  document.addEventListener("click", (e) => { if (!mega.hidden && !e.target.closest("#cat-mega")) set(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !mega.hidden) { set(false); btn.focus(); } });
  onRoute(() => set(false));
}

// Başlıktaki sepet sayısı (sepet bu cihazda tutulur)
function paintCartCount() {
  const n = cartCount();
  const el = document.getElementById("cart-count");
  el.hidden = !n;
  el.textContent = n > 99 ? "99+" : String(n);
}
window.addEventListener("femoria:cart", paintCartCount);
window.addEventListener("storage", (e) => e.key === "femoria:cart" && paintCartCount()); // başka sekmede değişirse

async function main() {
  paintShell();
  paintPlace();
  fillCategoryBar();
  document.getElementById("config-banner").hidden = isConfigured;
  await initAuth();
  renderAvatar();
  loadFavorites();
  paintCartCount();
  initAssistant();
  startRouter();
  if (state.authLinkError) toast("Bağlantının süresi dolmuş ya da daha önce kullanılmış. Lütfen yeni bir bağlantı isteyin.", 6000);
  if (state.passwordRecovery) { state.passwordRecovery = false; navigate("/sifre-yenile", { replace: true }); }

  const lastVisit = LS.get("last_visit");
  track("app_open", { returning: !!lastVisit, days_since: lastVisit ? Math.floor((Date.now() - lastVisit) / 864e5) : null });
  LS.set("last_visit", Date.now());
}

main();
