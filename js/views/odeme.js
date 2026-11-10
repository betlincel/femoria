// Ödeme — sepetteki online ödenebilir ürünler için teslimat bilgileri + iyzico güvenli ödeme sayfası.
// Kart bilgileri Femoria'ya gelmez; iyzico'nun sayfasında girilir. Para, alıcı ürünü teslim aldığını
// onaylayana kadar iyzico'da bekler (emanet), sonra satıcıya geçer.
import { h, loading, emptyState, toast, icon, withIcon, formatPrice } from "../ui.js";
import { categoryIconName } from "../icons.js";
import { state, LS } from "../store.js";
import { getProductsByIds, sellerInfo, acceptedOffers, photoUrl, startCheckout, track } from "../api.js";
import { breadcrumb } from "../components.js";
import { cartItems } from "../cart.js";
import { requireAuth } from "../router.js";
import { loadProvinces } from "../tr-locations.js";

export default async function render(root) {
  if (!requireAuth("/odeme")) return;
  root.append(breadcrumb(["Ana sayfa", "#/"], ["Sepetim", "#/sepet"], ["Ödeme"]), h("h1", {}, "Ödeme"));
  const body = h("div", {}, loading());
  root.append(body);

  // Sepetteki ürünlerin güncel hali; yalnız online ödeme alan satıcıların ürünleri
  const cart = cartItems();
  const ids = cart.map((i) => i.id);
  let fresh = [], info = {}, offers = {}, provinces = [];
  try {
    [fresh, provinces] = await Promise.all([getProductsByIds(ids), loadProvinces().catch(() => [])]);
    [info, offers] = await Promise.all([sellerInfo([...new Set(fresh.map((p) => p.seller_id))]), acceptedOffers(ids)]);
  } catch (e) {
    console.error("[Ödeme]", e);
    body.replaceChildren(h("div", { class: "card" }, emptyState("alert", "Bilgiler alınamadı", "İnternet bağlantınızı kontrol edip sayfayı yenileyin.")));
    return;
  }
  const lines = cart.map((it) => {
    const p = fresh.find((x) => x.id === it.id);
    if (!p || p.status !== "satista" || p.seller_id === state.user.id || !info[p.seller_id]?.payout_ready) return null;
    const delivery = p.delivery === "ikisi" ? it.choice || "elden" : p.delivery;
    const unit = offers[p.id] ? Number(offers[p.id].amount) : Number(p.price);
    return { p, qty: offers[p.id] ? 1 : it.qty, delivery, unit };
  }).filter(Boolean);

  if (!lines.length) {
    body.replaceChildren(h("div", { class: "card" }, emptyState("cart", "Online ödenecek ürün yok",
      "Sepetinizdeki ürünlerin satıcıları henüz online ödeme almıyor ya da ürünler satışta değil.",
      h("a", { class: "btn btn-primary", href: "#/sepet" }, "Sepete dön"))));
    return;
  }
  const total = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const hasCargo = lines.some((l) => l.delivery === "kargo");

  // ---------- Teslimat / fatura bilgileri (cihazda hatırlanır) ----------
  const saved = LS.get("address", {});
  const fullName = (state.profile?.full_name || "").trim().split(/\s+/);
  const f = {
    name: saved.name || fullName.slice(0, -1).join(" ") || fullName[0] || "",
    surname: saved.surname || (fullName.length > 1 ? fullName.at(-1) : ""),
    phone: saved.phone || "", city: saved.city || "", district: saved.district || "", line: saved.line || "",
  };
  const input = (id, label, key, attrs = {}) => h("div", { class: "field" },
    h("label", { for: id }, label),
    h("input", { class: "input", id, value: f[key], oninput: (e) => (f[key] = e.target.value), ...attrs }));
  const ilceSel = h("select", { class: "input", id: "ad-ilce", onchange: (e) => (f.district = e.target.value) });
  const drawIlce = () => {
    const prov = provinces.find((p) => p.n === f.city);
    ilceSel.replaceChildren(h("option", { value: "" }, "İlçe seçin"), ...(prov?.d || []).map((d) => h("option", { value: d, selected: d === f.district }, d)));
    ilceSel.disabled = !prov;
  };
  const ilSel = h("select", { class: "input", id: "ad-il", onchange: (e) => { f.city = e.target.value; f.district = ""; drawIlce(); } },
    h("option", { value: "" }, "İl seçin"), ...provinces.map((p) => h("option", { value: p.n, selected: p.n === f.city }, p.n)));
  drawIlce();

  const err = h("p", { class: "field-error", hidden: true, role: "alert" });
  const payBtn = h("button", { type: "submit", class: "btn btn-primary btn-xl" }, ...withIcon("lock", `iyzico ile güvenli öde · ${formatPrice(total)}`));

  const form = h("form", { class: "card stack checkout-form", novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    err.hidden = true;
    const phoneOk = /^(\+?90|0)?5\d{9}$/.test(f.phone.replace(/\D/g, "").replace(/^0090/, "90"));
    const problem = f.name.trim().length < 2 || f.surname.trim().length < 2 ? "Ad ve soyadınızı yazın."
      : !phoneOk ? "Cep telefonunuzu 05xx xxx xx xx biçiminde yazın."
      : !f.city || !f.district ? "İl ve ilçe seçin."
      : f.line.trim().length < 10 ? "Açık adresinizi yazın (mahalle, sokak, kapı no)." : null;
    if (problem) { err.textContent = problem; err.hidden = false; return; }
    LS.set("address", f);
    payBtn.disabled = true;
    payBtn.replaceChildren("Güvenli ödeme sayfası açılıyor…");
    try {
      const res = await startCheckout(lines.map((l) => ({ product_id: l.p.id, qty: l.qty, delivery: l.delivery })), f);
      LS.set("pending_checkout", { id: res.checkout_id, products: lines.map((l) => l.p.id), at: Date.now() });
      track("checkout_started", { items: lines.length, total });
      location.href = res.payment_page_url; // iyzico ödeme sayfası
    } catch (e2) {
      err.textContent = e2.message || "Ödeme başlatılamadı.";
      err.hidden = false;
      payBtn.disabled = false;
      payBtn.replaceChildren(...withIcon("lock", `iyzico ile güvenli öde · ${formatPrice(total)}`));
    }
  } },
    h("h2", {}, hasCargo ? "Teslimat ve fatura adresi" : "Fatura bilgileri"),
    hasCargo ? null : h("p", { class: "small muted", style: { margin: 0 } }, "Ürünler elden teslim edilecek; adresiniz yalnızca fatura için iyzico'ya iletilir."),
    h("div", { class: "grid-2" }, input("ad-name", "Ad", "name", { autocomplete: "given-name" }), input("ad-surname", "Soyad", "surname", { autocomplete: "family-name" })),
    input("ad-phone", "Cep telefonu", "phone", { type: "tel", inputmode: "tel", autocomplete: "tel", placeholder: "05xx xxx xx xx" }),
    h("div", { class: "grid-2" },
      h("div", { class: "field" }, h("label", { for: "ad-il" }, "İl"), ilSel),
      h("div", { class: "field" }, h("label", { for: "ad-ilce" }, "İlçe"), ilceSel)),
    h("div", { class: "field" }, h("label", { for: "ad-line" }, "Açık adres"),
      h("textarea", { class: "input", id: "ad-line", rows: 3, placeholder: "Mahalle, sokak, bina ve kapı numarası", oninput: (e) => (f.line = e.target.value) }, f.line)),
    hasCargo ? h("p", { class: "small muted", style: { margin: 0 } }, "Adresiniz yalnızca kargo ile gönderilecek ürünlerin satıcısına gösterilir.") : null,
    err,
    payBtn,
    h("div", { class: "pay-trust" },
      h("span", {}, icon("shield-check", 18), "Kart bilgileriniz Femoria'ya gelmez; iyzico'nun güvenli sayfasında girilir."),
      h("span", {}, icon("lock", 18), "Paranız, ürünü teslim aldığınızı onaylayana kadar satıcıya geçmez.")),
  );

  const summary = h("aside", { class: "card cart-summary", "aria-label": "Sipariş özeti" },
    h("h2", {}, "Sipariş özeti"),
    h("div", { class: "stack", style: { gap: "10px" } }, lines.map((l) => h("div", { class: "pay-line" },
      h("span", { class: "cart-img sm", "aria-hidden": "true" },
        l.p.photos?.[0] ? h("img", { src: photoUrl(l.p.photos[0]), alt: "" }) : icon(categoryIconName(l.p.category), 20)),
      h("span", { class: "pay-line-text" }, h("strong", {}, l.p.title),
        h("span", { class: "small muted" }, `${l.qty} adet · ${l.delivery === "kargo" ? "Kargo" : "Elden teslim"}${offers[l.p.id] ? " · teklif fiyatı" : ""}`)),
      h("strong", {}, formatPrice(l.unit * l.qty))))),
    h("div", { class: "sum-row muted" }, h("span", {}, "Kargo"), h("span", {}, hasCargo ? "Satıcıdan, fiyata dahil" : "—")),
    h("div", { class: "sum-row sum-total" }, h("span", {}, "Toplam"), h("strong", {}, formatPrice(total))),
    cart.length > lines.length ? h("p", { class: "small muted", style: { margin: 0 } },
      "Sepetinizdeki diğer ürünlerin satıcıları online ödeme almıyor; onlar sepette kalır.") : null,
  );

  body.replaceChildren(h("div", { class: "cart-layout" }, form, summary));
}
