// Aydınlatma metni (KVKK) — tam metin sayfası. Bölümlere #/aydinlatma#konum gibi bağlanılabilir.
import { h, speak, withIcon, canSpeak, stopSpeaking } from "../ui.js";
import { pageTitle } from "../components.js";
import { KVKK_SECTIONS, KVKK_VERSION, kvkkPlainText } from "../kvkk.js";
import { state } from "../store.js";
import { track } from "../api.js";

export function kvkkArticle() {
  return h("article", { class: "guide kvkk" },
    ...KVKK_SECTIONS.map((s) => h("section", { id: s.id || null },
      h("h2", {}, s.title),
      ...(s.body || []).map((t) => h("p", {}, t)),
      s.list ? h("ul", {}, s.list.map((t) => h("li", {}, t))) : null,
    )),
  );
}

export default async function render(root) {
  track("kvkk_opened");
  const p = state.profile;
  const date = new Date(KVKK_VERSION).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  root.append(
    pageTitle("Aydınlatma metni", { back: true }),
    h("p", { class: "lead" }, `Kişisel verilerinizin işlenmesi hakkında · Son güncelleme: ${date}`),
    p?.kvkk_accepted_at
      ? h("p", { class: "chip chip-ok", style: { marginBottom: "12px" } }, `Bu metni ${new Date(p.kvkk_accepted_at).toLocaleDateString("tr-TR")} tarihinde onayladınız`)
      : null,
    canSpeak ? h("button", { class: "btn btn-secondary", onclick: () => speak(kvkkPlainText(), { force: true }) }, ...withIcon("volume", "Sesli dinle")) : null,
    kvkkArticle(),
  );
  const anchor = location.hash.split("#")[2];
  if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" }), 100);
  return stopSpeaking;
}
