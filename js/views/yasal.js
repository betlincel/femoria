// Yasal metinler (kullanım koşulları, mesafeli satış, iade, çerez)
import { h } from "../ui.js";
import { pageTitle } from "../components.js";
import { LEGAL_PAGES, LEGAL_UPDATED } from "../legal.js";

export default async function render(root, { params: [slug] }) {
  const page = LEGAL_PAGES[slug];
  if (!page) { root.append(pageTitle("Sayfa bulunamadı", { back: true })); return; }
  document.title = `${page.title} — Femoria`;
  root.append(
    pageTitle(page.title, { back: true }),
    h("p", { class: "lead" }, `Son güncelleme: ${new Date(LEGAL_UPDATED).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}`),
    h("article", { class: "guide" }, ...page.sections().flatMap(([t, paras]) => [h("h2", {}, t), ...paras.map((x) => h("p", {}, x))])),
    h("nav", { class: "legal-links", "aria-label": "Diğer metinler" },
      Object.entries(LEGAL_PAGES).filter(([k]) => k !== slug).map(([k, p]) => h("a", { href: `#/yasal/${k}` }, p.title)),
      h("a", { href: "#/aydinlatma" }, "Aydınlatma metni (KVKK)")),
  );
}
