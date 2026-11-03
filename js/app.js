// Femoria — uygulama girişi
import { isConfigured } from "./supabase.js";
import { state, initAuth, onChange, LS } from "./store.js";
import { route, startRouter, onRoute } from "./router.js";
import { subscribeIncoming, track, getCategories } from "./api.js";
import { initAssistant, assistantEvent } from "./assistant.js";
import { esc } from "./ui.js";

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
  else el.textContent = p?.full_name ? p.full_name.trim()[0].toUpperCase() : "👤";
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
});

async function main() {
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
