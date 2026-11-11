// Yönetim paneli — yalnız yöneticiler (public.admins tablosundakiler). Veri güvenliği sunucudadır:
// bu sayfayı açabilmek yetki vermez, her işlev yönetici olup olmadığını SQL'de yeniden denetler.
import { h, loading, emptyState, formatPrice, toast, ask, icon } from "../ui.js";
import { pageTitle } from "../components.js";
import { requireAuth } from "../router.js";
import { LS } from "../store.js";
import { isAdmin, adminOverview, adminDisputes, adminCloseDispute, adminReports, adminDismissReport, adminProducts, adminRemoveProduct, adminOrders, photoUrl } from "../api.js";

const TABS = [["ozet", "Özet"], ["sorunlar", "Sorunlar"], ["sikayetler", "Şikayetler"], ["urunler", "Ürünler"], ["siparisler", "Siparişler"]];
const date = (d) => new Date(d).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const errMsg = (e) => e?.message || "İşlem yapılamadı.";

export default async function render(root, { query }) {
  if (!requireAuth("/yonetim")) return;
  if (!(await isAdmin())) {
    root.append(pageTitle("Yönetim", { back: true }), h("div", { class: "card" }, emptyState("shield-check", "Bu sayfa yalnız yöneticiler içindir", "Yönetici yetkisi veritabanında verilir.")));
    return;
  }
  let tab = TABS.some(([k]) => k === query.sekme) ? query.sekme : (LS.get("admin_tab") || "ozet");
  const body = h("div", { class: "stack" });
  const tabs = h("div", { class: "tabs admin-tabs", role: "tablist" });
  root.append(pageTitle("Yönetim", { back: true }), tabs, body);

  const drawTabs = () => tabs.replaceChildren(...TABS.map(([k, l]) => h("button", {
    type: "button", role: "tab", "aria-selected": String(tab === k),
    onclick: () => { tab = k; LS.set("admin_tab", k); drawTabs(); load(); },
  }, l)));

  async function load() {
    body.replaceChildren(loading());
    try { body.replaceChildren(...(await VIEWS[tab](load))); }
    catch (e) { body.replaceChildren(h("div", { class: "card" }, emptyState("alert", "Yüklenemedi", errMsg(e)))); }
  }
  drawTabs(); load();
}

const VIEWS = {
  async ozet() {
    const o = await adminOverview();
    const s = (n, l) => h("div", { class: "stat" }, h("div", { class: "num" }, n), h("div", { class: "lbl" }, l));
    return [h("div", { class: "stats admin-stats" },
      s(o.users, `üye (son 7 günde +${o.users_week})`), s(o.products_live, "satışta ürün"), s(o.orders_paid, "online ödenen sipariş"),
      s(formatPrice(o.gmv), "toplam satış hacmi"), s(formatPrice(o.pending_payout), "emanette bekleyen"),
      s(o.open_disputes, "açık sorun bildirimi"), s(o.reports_week, "şikayet (7 gün)"), s(o.reports_total, "toplam şikayet")),
      h("p", { class: "small muted" }, "İade ve ödeme aktarımı iyzico panelinden yapılır; burada sorun kaydı kapatılır, taraflara bildirim gider.")];
  },

  async sorunlar(reload) {
    const [open, closed] = await Promise.all([adminDisputes("acik"), adminDisputes("kapandi")]);
    const card = (o, isOpen) => h("div", { class: "card stack" },
      h("div", { style: { display: "flex", justifyContent: "space-between", gap: "8px" } }, h("strong", {}, o.product_title || "Ürün"), h("strong", {}, formatPrice(o.amount))),
      h("div", { class: "small muted" }, `Alıcı: ${o.buyer_name || "—"} · Satıcı: ${o.seller_name || "—"} · ${date(o.disputed_at)}`),
      h("div", {}, h("span", { class: "chip chip-warn" }, o.dispute_reason || "Sorun"), " ", h("span", { class: "chip" }, `ödeme: ${o.payment_status}`), " ", h("span", { class: "chip" }, `aktarım: ${o.payout_status}`)),
      o.dispute_note ? h("p", { style: { margin: 0, whiteSpace: "pre-line" } }, o.dispute_note) : null,
      h("div", { class: "btn-row" },
        h("a", { class: "btn btn-secondary", href: `#/sohbet/${o.conversation_id}` }, "Sohbeti aç"),
        isOpen ? h("button", { type: "button", class: "btn btn-primary", onclick: async () => {
          const note = window.prompt("Taraflara gidecek kısa not (isteğe bağlı):", "");
          if (note === null) return;
          try { await adminCloseDispute(o.id, note); toast("Sorun kapatıldı, taraflara bildirim gitti."); reload(); } catch (e) { toast(errMsg(e)); }
        } }, "Sorunu kapat") : null));
    return [
      h("h2", {}, `Açık (${open.length})`),
      ...(open.length ? open.map((o) => card(o, true)) : [h("div", { class: "card" }, emptyState("check", "Açık sorun yok"))]),
      closed.length ? h("h2", {}, "Kapanan") : null, ...closed.slice(0, 20).map((o) => card(o, false)),
    ];
  },

  async sikayetler(reload) {
    const rows = await adminReports();
    if (!rows.length) return [h("div", { class: "card" }, emptyState("check", "Şikayet yok"))];
    return rows.map((r) => h("div", { class: "card stack" },
      h("div", { style: { display: "flex", justifyContent: "space-between", gap: "8px" } },
        h("strong", {}, r.reported_name || "Kullanıcı"),
        h("span", { class: `chip ${r.reported_count >= 3 ? "chip-warn" : ""}` }, `${r.reported_count} şikayet`)),
      h("div", { class: "small muted" }, `Şikayet eden: ${r.reporter_name || "—"} · ${date(r.created_at)}${r.product_title ? ` · ürün: ${r.product_title}` : ""}`),
      h("div", {}, h("span", { class: "chip" }, r.reason)),
      r.note ? h("p", { style: { margin: 0, whiteSpace: "pre-line" } }, r.note) : null,
      h("div", { class: "btn-row" },
        r.product_id ? h("a", { class: "btn btn-secondary", href: `#/urun/${r.product_id}` }, "Ürünü aç") : null,
        h("a", { class: "btn btn-secondary", href: `#/magaza/${r.reported_id}` }, "Mağazayı aç"),
        h("button", { type: "button", class: "btn btn-secondary", onclick: async () => {
          try { await adminDismissReport(r.id); toast("Şikayet kaydı silindi."); reload(); } catch (e) { toast(errMsg(e)); }
        } }, "İşlem gerekmiyor"))));
  },

  async urunler(reload) {
    const list = h("div", { class: "stack" });
    const input = h("input", { class: "input", type: "search", placeholder: "Ürün adı ara…", "aria-label": "Ürün ara" });
    const draw = async () => {
      list.replaceChildren(loading());
      try {
        const rows = await adminProducts(input.value);
        list.replaceChildren(...(rows.length ? rows.map((p) => h("div", { class: "card admin-product" },
          h("span", { class: "cart-img sm", "aria-hidden": "true" }, p.photos?.[0] ? h("img", { src: photoUrl(p.photos[0]), alt: "" }) : icon("bag", 20)),
          h("div", { style: { flex: "1", minWidth: 0 } }, h("a", { href: `#/urun/${p.id}` }, h("strong", {}, p.title)),
            h("div", { class: "small muted" }, `${formatPrice(p.price)} · ${p.seller_name || "—"} · ${p.status} · ${date(p.published_at)}`)),
          h("button", { type: "button", class: "btn btn-danger", onclick: async () => {
            if (!(await ask("Bu ürünü kaldıralım mı?", "Ürün kalıcı olarak silinir ve satıcıya bildirim gider.", "Evet, kaldır"))) return;
            const reason = window.prompt("Satıcıya gösterilecek sebep (isteğe bağlı):", "Topluluk kurallarına aykırı");
            if (reason === null) return;
            try { await adminRemoveProduct(p.id, reason); toast("Ürün kaldırıldı."); draw(); } catch (e) { toast(errMsg(e)); }
          } }, "Kaldır"))) : [h("div", { class: "card" }, emptyState("bag", "Ürün bulunamadı"))]));
      } catch (e) { list.replaceChildren(h("p", { class: "field-error" }, errMsg(e))); }
    };
    let t; input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(draw, 350); });
    draw();
    return [input, list];
  },

  async siparisler() {
    const rows = await adminOrders();
    if (!rows.length) return [h("div", { class: "card" }, emptyState("package", "Sipariş yok"))];
    return [h("div", { class: "list" }, rows.map((o) => h("a", { class: "list-item", href: `#/sohbet/${o.conversation_id}` },
      h("div", { class: "body" }, h("strong", {}, o.product_title || "Ürün"),
        h("div", { class: "small muted" }, `${o.buyer_name || "—"} → ${o.seller_name || "—"} · ${date(o.created_at)}`),
        h("div", {}, h("span", { class: "chip" }, o.status), " ", o.payment_status !== "yok" ? h("span", { class: "chip" }, `ödeme: ${o.payment_status}`) : null, " ",
          o.dispute_status === "acik" ? h("span", { class: "chip chip-warn" }, "sorun") : null)),
      h("strong", {}, formatPrice(o.amount)))))];
  },
};
