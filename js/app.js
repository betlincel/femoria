// Femoria — uygulama girişi
import { isConfigured } from "./supabase.js";
import { state, initAuth, onChange, LS } from "./store.js";
import { route, startRouter, onRoute, navigate } from "./router.js";
import { subscribeIncoming, track, getCategories } from "./api.js";
import { initAssistant, assistantEvent } from "./assistant.js";
import { esc, toast, h } from "./ui.js";
import { iconSVG, ayseAvatarSVG, categoryIconName } from "./icons.js";
import { ensureKvkkConsent } from "./consent.js";
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
route(/^\/sat$/, "sat", () => import("./views/sat.js"), "narrow");
route(/^\/mesajlar$/, "mesajlar", () => import("./views/mesajlar.js"), "medium");
route(/^\/sohbet\/([\w-]+)$/, "mesajlar", () => import("./views/sohbet.js"), "medium");
route(/^\/urun\/([\w-]+)$/, "urun", () => import("./views/urun.js"));
route(/^\/profil$/, "profil", () => import("./views/profil.js"));
route(/^\/ayarlar$/, "profil", () => import("./views/ayarlar.js"), "narrow");
route(/^\/rehber$/, "rehber", () => import("./views/rehber.js"), "medium");
route(/^\/giris$/, "giris", () => import("./views/giris.js"), "narrow");
route(/^\/sifre-yenile$/, "giris", () => import("./views/sifre.js"), "narrow");
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
    stopInbox();
    stopInbox = subscribeIncoming((msg) => {
      if (!location.hash.includes(msg.conversation_id)) {
        document.getElementById("unread-dot").hidden = false;
        document.getElementById("unread-dot-top").hidden = false;
      }
      assistantEvent("message_received", msg);
    });
  }
});

onRoute(({ screen }) => {
  if (screen === "mesajlar") {
    document.getElementById("unread-dot").hidden = true;
    document.getElementById("unread-dot-top").hidden = true;
  }
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

async function fillCategoryBar() {
  const cats = await getCategories();
  const bar = document.getElementById("category-bar");
  for (const c of cats) {
    const a = document.createElement("a");
    a.href = `#/urunler?kategori=${c.slug}`;
    a.innerHTML = iconSVG(categoryIconName(c.slug), 18);
    a.append(c.name);
    bar.append(a);
  }
}

async function main() {
  paintShell();
  paintPlace();
  fillCategoryBar();
  document.getElementById("config-banner").hidden = isConfigured;
  await initAuth();
  renderAvatar();
  initAssistant();
  startRouter();
  if (state.authLinkError) toast("Bağlantının süresi dolmuş ya da daha önce kullanılmış. Lütfen yeni bir bağlantı isteyin.", 6000);
  if (state.passwordRecovery) { state.passwordRecovery = false; navigate("/sifre-yenile", { replace: true }); }

  const lastVisit = LS.get("last_visit");
  track("app_open", { returning: !!lastVisit, days_since: lastVisit ? Math.floor((Date.now() - lastVisit) / 864e5) : null });
  LS.set("last_visit", Date.now());
}

main();
