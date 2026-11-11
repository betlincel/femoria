// Sepetim — ürünler satıcıya göre gruplanır; adet, teslim şekli, toplam.
// "Siparişi gönder": her ürün için satıcıyla sohbet açılır ve sipariş kartı oluşur
// (ödeme teslimde; satıcı "Anlaştık" deyince kesinleşir).
import { h, loading, emptyState, toast, icon, withIcon, formatPrice, ask, iconCircle } from "../ui.js";
import { categoryIconName } from "../icons.js";
import { state } from "../store.js";
import { getProductsByIds, sellerInfo, acceptedOffers, photoUrl, startConversation, proposeOrder, track } from "../api.js";
import { isConfigured } from "../supabase.js";
import { breadcrumb } from "../components.js";
import { cartItems, setQty, setDeliveryChoice, removeFromCart, refreshItem, clearCart, maxQtyOf } from "../cart.js";
import { requireAuth, navigate } from "../router.js";

export default async function render(root) {
  const countEl = h("span", { class: "result-count" });
  const body = h("div", {}, loading());
  root.append(
    breadcrumb(["Ana sayfa", "#/"], ["Sepetim"]),
    h("div", { class: "catalog-head" }, h("div", {}, h("h1", {}, "Sepetim"), countEl)),
    body,
  );

  let fresh = {};        // ürün kimliği → güncel ürün (null: artık yok)
  let info = {};         // satıcı kimliği → { full_name, payout_ready }
  let offers = {};       // ürün kimliği → kabul edilmiş teklif (alıcının)
  const priceChanged = new Set();
  let busy = false;

  // Sunucudaki güncel hali: satılan/kaldırılan ürünler ve fiyat değişiklikleri
  async function refresh() {
    const items = cartItems();
    if (isConfigured && items.length) {
      try {
        const ids = items.map((i) => i.id);
        const rows = await getProductsByIds(ids);
        fresh = Object.fromEntries(ids.map((id) => [id, rows.find((r) => r.id === id) || null]));
        for (const it of items) {
          const f = fresh[it.id];
          if (f && Number(f.price) !== Number(it.price)) priceChanged.add(it.id);
          if (f) refreshItem(f);
        }
        [info, offers] = await Promise.all([
          sellerInfo([...new Set(items.map((i) => i.seller_id).filter(Boolean))]).catch(() => ({})),
          acceptedOffers(ids),
        ]);
        for (const it of items) if (offers[it.id] && it.qty > 1) setQty(it.id, 1); // teklif fiyatı tek adet için
      } catch (e) {
        console.warn("[Sepet] güncel bilgiler alınamadı:", e);
      }
    }
    draw();
  }

  // Ürün sipariş edilebilir mi? (satıldı / kaldırıldı / kendi ürünü değilse)
  function problemOf(it) {
    const f = fresh[it.id];
    if (f === null) return "Bu ürün artık satışta değil";
    if (f && f.status !== "satista") return "Satıldı";
    if (state.user?.id && state.user.id === it.seller_id) return "Kendi ürününüz";
    return null;
  }
  const deliveryOf = (it) => (it.delivery === "ikisi" ? it.choice || "elden" : it.delivery || "elden");
  const unitOf = (it) => (offers[it.id] ? Number(offers[it.id].amount) : Number(it.price));
  // Online ödenebilir mi? (satıcı iyzico hesabını bağladıysa)
  const payable = (it) => !problemOf(it) && !!info[it.seller_id]?.payout_ready;

  function itemRow(it) {
    const problem = problemOf(it);
    const img = it.photo ? h("img", { src: photoUrl(it.photo), alt: "" }) : h("div", { class: "ph", "aria-hidden": "true" }, icon(categoryIconName(it.category), 28));
    const qtyCtl = h("div", { class: "qty", role: "group", "aria-label": "Adet" },
      h("button", { type: "button", "aria-label": "Bir azalt", disabled: !!problem || it.qty <= 1, onclick: () => setQty(it.id, it.qty - 1) }, icon("minus", 16)),
      h("output", { "aria-live": "polite" }, it.qty),
      h("button", { type: "button", "aria-label": "Bir artır", disabled: !!problem || it.qty >= maxQtyOf(it) || !!offers[it.id], title: it.stock != null && it.qty >= it.stock ? `Stokta ${it.stock} adet var` : null, onclick: () => setQty(it.id, it.qty + 1) }, icon("plus", 16)),
    );
    const delivery = it.delivery === "ikisi" && !problem
      ? h("div", { class: "cart-del", role: "radiogroup", "aria-label": "Teslim şekli" },
          [["elden", "Elden"], ["kargo", "Kargo"]].map(([v, l]) => h("button", {
            type: "button", role: "radio", "aria-checked": String(deliveryOf(it) === v), onclick: () => setDeliveryChoice(it.id, v),
          }, l)))
      : h("span", { class: "small muted" }, it.delivery === "kargo" ? "Kargo ile" : it.delivery === "ikisi" ? "Elden veya kargo" : "Elden teslim");

    return h("div", { class: `cart-item ${problem ? "is-off" : ""}`, role: "listitem" },
      h("a", { class: "cart-img", href: `#/urun/${it.id}`, tabindex: "-1", "aria-hidden": "true" }, img),
      h("div", { class: "cart-info" },
        h("a", { class: "cart-title", href: `#/urun/${it.id}` }, it.title),
        h("div", { class: "small muted" }, offers[it.id]
          ? h("span", {}, h("s", {}, formatPrice(it.price)), " ", h("strong", { style: { color: "var(--primary)" } }, `Teklif fiyatı: ${formatPrice(unitOf(it))}`))
          : `Birim fiyat: ${formatPrice(it.price)}`),
        !problem && !payable(it) && Object.keys(info).length
          ? h("span", { class: "small muted" }, "Bu satıcı henüz online ödeme almıyor; sipariş kartıyla elden ödenir.") : null,
        problem ? h("span", { class: "chip" }, icon("alert"), problem)
          : priceChanged.has(it.id) ? h("span", { class: "chip chip-brand" }, "Fiyat güncellendi") : null,
        delivery,
      ),
      h("div", { class: "cart-side" },
        h("div", { class: "price" }, problem ? "—" : formatPrice(unitOf(it) * it.qty)),
        problem ? null : qtyCtl,
        h("button", { type: "button", class: "link-btn cart-remove", onclick: () => { removeFromCart(it.id); toast("Sepetten çıkarıldı."); } }, ...withIcon("trash", "Kaldır")),
      ),
    );
  }

  function draw() {
    const items = cartItems();
    const ok = items.filter((i) => !problemOf(i));
    const online = ok.filter(payable);
    const offline = ok.filter((i) => !payable(i));
    const qty = ok.reduce((n, i) => n + i.qty, 0);
    const total = ok.reduce((n, i) => n + unitOf(i) * i.qty, 0);
    countEl.textContent = items.length ? `${items.reduce((n, i) => n + i.qty, 0)} ürün` : "";

    if (!items.length) {
      body.replaceChildren(h("div", { class: "card" }, emptyState("cart", "Sepetiniz boş",
        "Beğendiğiniz ürünlerde \"Sepete ekle\"ye ya da kartlardaki + düğmesine dokunun.",
        h("a", { class: "btn btn-primary", href: "#/urunler" }, "Ürünlere bak"))));
      return;
    }

    // Satıcıya göre grupla (her satıcıya ayrı sipariş kartı gider)
    const groups = new Map();
    for (const it of items) {
      const k = it.seller_id || "?";
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(it);
    }

    body.replaceChildren(h("div", { class: "cart-layout" },
      h("div", { class: "stack" },
        [...groups].map(([sellerId, list]) => h("section", { class: "card cart-group" },
          h("div", { class: "cart-seller" }, icon("user", 18), h("span", {}, "Satıcı: ", h("strong", {}, info[sellerId]?.full_name || "Komşu"))),
          h("div", { role: "list" }, list.map(itemRow)),
        )),
      ),
      h("aside", { class: "card cart-summary", "aria-label": "Sipariş özeti" },
        h("h2", {}, "Sipariş özeti"),
        h("div", { class: "sum-row" }, h("span", {}, `Ürünler (${qty} adet)`), h("strong", {}, formatPrice(total))),
        h("div", { class: "sum-row muted" }, h("span", {}, "Teslim"), h("span", {}, "Satıcıyla anlaşılır")),
        h("div", { class: "sum-row sum-total" }, h("span", {}, "Toplam"), h("strong", {}, formatPrice(total))),
        online.length ? h("button", { type: "button", class: "btn btn-primary btn-xl", disabled: busy, "data-highlight": "odemeye-gec",
          onclick: () => requireAuth("/odeme") && navigate("/odeme") },
          ...withIcon("lock", `Ödemeye geç${offline.length ? ` (${online.reduce((n, i) => n + i.qty, 0)} ürün)` : ""}`)) : null,
        online.length ? h("p", { class: "small muted", style: { margin: 0 } },
          "Ödeme iyzico güvencesiyle yapılır. Paranız, ürünü teslim aldığınızı onaylayana kadar satıcıya geçmez.") : null,
        offline.length ? h("button", { type: "button", class: `btn ${online.length ? "btn-secondary" : "btn-primary btn-xl"}`, disabled: busy, onclick: checkout },
          ...withIcon("message", busy ? "Gönderiliyor…" : online.length ? "Diğerlerini satıcıya sor (elden ödeme)" : "Siparişi satıcıya gönder")) : null,
        offline.length ? h("p", { class: "small muted", style: { margin: 0 } },
          "Online ödeme almayan satıcılara sipariş kartı gider; satıcı \"Anlaştık\" deyince kesinleşir, ödeme teslimde yapılır.") : null,
        h("div", { class: "small row", style: { gap: "8px" } }, icon("shield-check", 18),
          h("span", { style: { flex: "1" } }, "Önceden kapora istenirse göndermeyin.")),
        h("button", { type: "button", class: "link-btn", onclick: async () => {
          if (await ask("Sepet boşaltılsın mı?", "Sepetteki tüm ürünler çıkarılır.", "Evet, boşalt", "Vazgeç")) clearCart();
        } }, "Sepeti boşalt"),
      ),
    ));
  }

  async function checkout() {
    if (!requireAuth("/sepet")) return;
    const list = cartItems().filter((i) => !problemOf(i) && !payable(i));
    if (!list.length) return;
    busy = true; draw();
    const sent = [], failed = [];
    for (const it of list) {
      try {
        const convId = await startConversation(it.id);
        await proposeOrder(convId, { quantity: it.qty, unitPrice: unitOf(it), delivery: deliveryOf(it) });
        removeFromCart(it.id);
        sent.push({ it, convId });
      } catch (e) {
        console.error("[Sepet] sipariş gönderilemedi:", it.id, e);
        failed.push({ it, msg: e?.message || "Gönderilemedi" });
      }
    }
    busy = false;
    track("cart_checkout", { items: list.length, sent: sent.length, failed: failed.length });
    if (!sent.length) { toast(`Sipariş gönderilemedi: ${failed[0]?.msg || "bilinmeyen hata"}`, 6000); draw(); return; }

    countEl.textContent = "";
    body.replaceChildren(h("div", { class: "card stack cart-done" },
      h("div", { class: "celebrate" },
        iconCircle("check", "ok"),
        h("h2", {}, sent.length > 1 ? "Siparişleriniz satıcılara gönderildi" : "Siparişiniz satıcıya gönderildi"),
        h("p", { class: "muted" }, "Satıcı \"Anlaştık\" deyince sipariş kesinleşir. Teslim ve ödemeyi sohbetten konuşabilirsiniz."),
      ),
      h("div", { class: "stack" }, sent.map(({ it, convId }) => h("a", { class: "card card-link row", href: `#/sohbet/${convId}` },
        h("span", { style: { flex: "1" } }, h("strong", {}, it.title), h("span", { class: "small muted" }, ` · ${it.qty} adet · ${formatPrice(it.price * it.qty)}`)),
        h("span", { class: "small", style: { flex: "0 0 auto", color: "var(--primary)", fontWeight: 700 } }, "Sohbete git →")))),
      failed.length ? h("div", { class: "notice" }, icon("alert", 20),
        h("span", {}, `${failed.map((f) => f.it.title).join(", ")} gönderilemedi (${failed[0].msg}). Sepette bıraktık.`)) : null,
      failed.length
        ? h("button", { type: "button", class: "btn btn-secondary", onclick: () => { body.replaceChildren(loading()); refresh(); } }, "Sepete dön")
        : h("a", { class: "btn btn-secondary", href: "#/mesajlar" }, "Mesajlarıma git"),
    ));
  }

  const onCart = () => { if (!busy) draw(); };
  window.addEventListener("femoria:cart", onCart);
  await refresh();
  return () => window.removeEventListener("femoria:cart", onCart);
}
