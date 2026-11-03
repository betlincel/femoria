// Femoria — uygulama girişi
import { isConfigured } from "./supabase.js";
import { state, initAuth, onChange, LS } from "./store.js";
import { route, startRouter, onRoute } from "./router.js";
import { subscribeIncoming, track, getCategories } from "./api.js";
import { initAssistant, assistantEvent } from "./assistant.js";
import { esc } from "./ui.js";
import { iconSVG, ayseAvatarSVG } from "./icons.js";

route(/^\/$/, "vitrin", () => import("./views/vitrin.js"));
route(/^\/yakinimda$/, "yakinimda", () => import("./views/yakinimda.js"));
route(/^\/sat$/, "sat", () => import("./views/sat.js"));
route(/^\/mesajlar$/, "mesajlar", () => import("./views/mesajlar.js"));
route(/^\/sohbet\/([\w-]+)$/, "mesajlar", () => import("./views/sohbet.js"));
route(/^\/urun\/([\w-]+)$/, "urun", () => import("./views/urun.js"));
route(/^\/profil$/, "profil", () => import("./views/profil.js"));
route(/^\/ayarlar$/, "profil", () => import("./views/ayarlar.js"));
route(/^\/rehber$/, "rehber", () => import("./views/rehber.js"));
route(/^\/giris$/, "giris", () => import("./views/giris.js"));

// Alt menüde aktif sekme
onRoute(({ screen }) => {
  document.querySelectorAll(".bottom-nav a").forEach((a) => {
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
  document.querySelector(".fab-face").innerHTML = ayseAvatarSVG(p?.assistant_look, 40);
}

// Yeni mesaj: alt menüde kırmızı nokta + Ayşe Abla'nın ilk mesaj yardımı
let stopInbox = () => {};
let lastUserId = null;
onChange(() => {
  renderAvatar();
  if (state.user?.id !== lastUserId) {
    lastUserId = state.user?.id ?? null;
    stopInbox();
    stopInbox = subscribeIncoming((msg) => {
      if (!location.hash.includes(msg.conversation_id)) {
        document.getElementById("unread-dot").hidden = false;
      }
      assistantEvent("message_received", msg);
    });
  }
});

onRoute(({ screen }) => {
  if (screen === "mesajlar") document.getElementById("unread-dot").hidden = true;
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

async function main() {
  paintShell();
  document.getElementById("config-banner").hidden = isConfigured;
  await initAuth();
  renderAvatar();
  getCategories();
  initAssistant();
  startRouter();

  const lastVisit = LS.get("last_visit");
  track("app_open", { returning: !!lastVisit, days_since: lastVisit ? Math.floor((Date.now() - lastVisit) / 864e5) : null });
  LS.set("last_visit", Date.now());
}

main();
