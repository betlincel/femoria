// Aydınlatma metni onay kontrolü: giriş yapmış kullanıcı güncel metni onaylamadıysa
// (eski hesap ya da metin değişti) kapatılamayan bir onay ekranı gösterilir.
import { h, sheet, toast } from "./ui.js";
import { state, updateProfile } from "./store.js";
import { KVKK_VERSION } from "./kvkk.js";
import { kvkkArticle } from "./views/aydinlatma.js";
import { track } from "./api.js";

let open = false;

export function ensureKvkkConsent() {
  const p = state.profile;
  if (!state.user || !p || p.kvkk_version === KVKK_VERSION || open) return;
  if (location.hash.startsWith("#/aydinlatma") || location.hash.startsWith("#/sifre-yenile")) return;
  open = true;

  const check = h("input", { type: "checkbox", id: "kvkk-reaccept", style: { width: "22px", height: "22px", flex: "0 0 auto", marginTop: "2px" } });
  const btn = h("button", { class: "btn btn-primary btn-xl", disabled: true }, "Okudum, anladım");
  check.addEventListener("change", () => (btn.disabled = !check.checked));

  const close = sheet(p.kvkk_version ? "Aydınlatma metni güncellendi" : "Aydınlatma metni", h("div", { class: "stack" },
    h("p", { class: "muted", style: { margin: 0 } }, "Devam etmeden önce kişisel verilerinizi nasıl işlediğimizi okuyun. Konum bilgisi için ayrıca izniniz istenir."),
    h("div", { class: "kvkk-scroll", tabindex: "0" }, kvkkArticle()),
    h("label", { for: "kvkk-reaccept", class: "row consent-check" }, check,
      h("span", { style: { flex: "1" } }, "Aydınlatma metnini okudum ve anladım.")),
    btn,
  ), { dismissible: false });

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await updateProfile({ kvkk_version: KVKK_VERSION, kvkk_accepted_at: new Date().toISOString() });
      track("kvkk_accepted", { version: KVKK_VERSION });
      open = false;
      close();
    } catch {
      btn.disabled = false;
      toast("Kaydedilemedi, tekrar deneyin.");
    }
  });
}
