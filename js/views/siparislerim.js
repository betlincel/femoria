// Siparişlerim — online ödenen siparişler (Alışlarım / Satışlarım) ve Teklifler.
// Alıcı: kargoyu takip eder, "Teslim aldım" der (para satıcıya geçer), puan verir; kargodan önce iptal edebilir.
// Satıcı: kargo firması + takip numarasını girer (ya da elden teslime hazır der); teslimden önce iptal edebilir.
import { h, loading, emptyState, toast, icon, withIcon, formatPrice, ask, sheet } from "../ui.js";
import { categoryIconName } from "../icons.js";
import { state, LS } from "../store.js";
import {
  myPaidOrders, confirmOrder, cancelPaidOrder, setShipment, writeReview, openDispute, myOffers, respondOffer, makeOffer, photoUrl, track,
} from "../api.js";
import { breadcrumb, addProductToCart } from "../components.js";
import { removeFromCart } from "../cart.js";
import { requireAuth, navigate } from "../router.js";

const CARGO = ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo", "Sürat Kargo", "Hepsijet", "UPS", "Kolay Gelsin", "Diğer"];
// Sunucudaki zamanlayıcıyla aynı süreler (SHIP_DAYS, CONFIRM_DAYS)
const SHIP_DAYS = 5, CONFIRM_DAYS = 7;
const DISPUTE_REASONS = ["Ürün gelmedi", "Ürün hasarlı geldi", "Ürün tarifinden farklı", "Eksik ürün geldi", "Diğer"];
const daysLeft = (from, days) => Math.max(0, Math.ceil((new Date(from).getTime() + days * 864e5 - Date.now()) / 864e5));
const dateTr = (d) => (d ? new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "");

export default async function render(root, { query }) {
  if (!requireAuth("/siparislerim")) return;
  let tab = ["satislarim", "teklifler"].includes(query.sekme) ? query.sekme : "alislarim";

  // iyzico'dan dönüş: başarılıysa ödenen ürünler sepetten düşer
  const banner = h("div");
  if (query.odeme) {
    const pending = LS.get("pending_checkout");
    if (query.odeme === "basarili") {
      pending?.products?.forEach(removeFromCart);
      banner.append(h("div", { class: "notice ok", role: "status" }, icon("check", 20),
        h("span", {}, h("strong", {}, "Ödemeniz alındı. "), "Satıcıya bildirildi; kargo ve teslim durumunu buradan takip edebilirsiniz.")));
      track("checkout_paid", {});
    } else {
      banner.append(h("div", { class: "notice", role: "alert" }, icon("alert", 20),
        h("span", {}, h("strong", {}, "Ödeme tamamlanamadı. "), query.not || "Kartınızdan para çekilmedi. Sepetiniz duruyor; tekrar deneyebilirsiniz.")));
    }
    LS.set("pending_checkout", null);
    history.replaceState(null, "", `#/siparislerim${tab !== "alislarim" ? `?sekme=${tab}` : ""}`);
  }

  const tabs = h("div", { class: "tabs", role: "tablist" });
  const list = h("div", { class: "stack" });
  root.append(breadcrumb(["Ana sayfa", "#/"], ["Siparişlerim"]), h("h1", {}, "Siparişlerim"), banner, tabs, list);

  const drawTabs = () => tabs.replaceChildren(...[["alislarim", "Alışlarım"], ["satislarim", "Satışlarım"], ["teklifler", "Teklifler"]].map(([k, l]) =>
    h("button", { role: "tab", "aria-selected": String(tab === k), onclick: () => { tab = k; drawTabs(); load(); } }, l)));
  drawTabs();

  async function load() {
    list.replaceChildren(loading());
    try {
      if (tab === "teklifler") return drawOffers(await myOffers());
      const orders = await myPaidOrders(tab === "satislarim" ? "seller" : "buyer");
      list.replaceChildren(...(orders.length ? orders.map((o) => orderCard(o, tab === "satislarim")) : [h("div", { class: "card" },
        tab === "satislarim"
          ? emptyState("package", "Henüz online satışınız yok", "Online ödeme almak için Ayarlar'dan ödeme hesabınızı bağlayın.", h("a", { class: "btn btn-primary", href: "#/odeme-hesabi" }, "Ödeme hesabımı bağla"))
          : emptyState("bag", "Henüz online siparişiniz yok", "Beğendiğiniz ürünleri sepete ekleyip güvenle ödeyebilirsiniz.", h("a", { class: "btn btn-primary", href: "#/urunler" }, "Ürünlere bak")))]));
    } catch (e) {
      console.error("[Siparişlerim]", e);
      list.replaceChildren(h("div", { class: "card" }, emptyState("alert", "Siparişler yüklenemedi", "İnternet bağlantınızı kontrol edip sayfayı yenileyin.")));
    }
  }

  // ---------- Sipariş kartı ----------
  function stepState(o) {
    if (o.status === "iptal") return { label: o.payment_status === "iade" ? "İptal edildi · ödeme iade edildi" : "İptal edildi", cls: "off", step: -1 };
    if (o.status === "teslim_edildi") return { label: "Teslim alındı", cls: "done", step: 3 };
    if (o.shipping_status === "kargoda") return { label: o.delivery === "kargo" ? "Kargoda" : "Teslime hazır", cls: "go", step: 2 };
    return { label: "Ödendi · hazırlanıyor", cls: "go", step: 1 };
  }

  function orderCard(o, asSeller) {
    const title = o.products?.title || o.conversations?.product_title || "Ürün";
    const photo = o.products?.photos?.[0];
    const st = stepState(o);
    const total = Number(o.unit_price) * o.quantity;
    const steps = ["Ödendi", o.delivery === "kargo" ? "Kargoda" : "Teslime hazır", "Teslim alındı"];
    const actions = h("div", { class: "order-actions" });
    const busy = (btn, fn) => async () => {
      btn.disabled = true;
      try { await fn(); } catch (e) { toast(e.message || "İşlem yapılamadı.", 6000); btn.disabled = false; }
    };

    if (o.status !== "iptal" && o.status !== "teslim_edildi") {
      if (asSeller && o.shipping_status !== "kargoda") {
        if (o.delivery === "kargo") actions.append(shipForm(o));
        else {
          const b = h("button", { type: "button", class: "btn btn-primary" }, ...withIcon("package", "Teslime hazır"));
          b.onclick = busy(b, async () => { await setShipment(o.id, "", ""); toast("Alıcıya bildirildi."); load(); });
          actions.append(b);
        }
      }
      if (!asSeller) {
        const b = h("button", { type: "button", class: "btn btn-primary" }, ...withIcon("check", "Teslim aldım"));
        b.onclick = busy(b, async () => {
          if (!(await ask("Ürünü teslim aldınız mı?", "Onayladığınızda ödeme satıcıya aktarılır. Ürünü almadıysanız onaylamayın.", "Evet, teslim aldım", "Vazgeç"))) { b.disabled = false; return; }
          await confirmOrder(o.id); toast("Teşekkürler! Ödeme satıcıya aktarılıyor."); track("order_confirmed", {}); load();
        });
        actions.append(b);
        if (o.dispute_status !== "acik") actions.append(h("button", { type: "button", class: "btn btn-secondary", onclick: () => disputeSheet(o) }, ...withIcon("alert", "Sorun bildir")));
      }
      const canCancel = asSeller || o.shipping_status !== "kargoda";
      if (canCancel) {
        const c = h("button", { type: "button", class: "btn btn-ghost" }, "Siparişi iptal et");
        c.onclick = busy(c, async () => {
          if (!(await ask("Sipariş iptal edilsin mi?", `${formatPrice(total)} alıcının kartına iade edilir.`, "Evet, iptal et", "Vazgeç"))) { c.disabled = false; return; }
          await cancelPaidOrder(o.id); toast("Sipariş iptal edildi; ödeme iade edildi."); load();
        });
        actions.append(c);
      }
    }
    if (!asSeller && o.status === "teslim_edildi") actions.append(o.review ? reviewView(o.review) : reviewButton(o));

    const addr = asSeller && o.shipping_address && o.delivery === "kargo" && o.status !== "iptal"
      ? h("div", { class: "order-addr small" }, icon("map-pin", 16),
          h("span", {}, h("strong", {}, `${o.shipping_address.name} ${o.shipping_address.surname}`), ` · ${o.shipping_address.phone}`, h("br"),
            `${o.shipping_address.line}, ${o.shipping_address.district}/${o.shipping_address.city}`))
      : null;

    return h("article", { class: `card order-item ${st.cls}` },
      h("div", { class: "order-top" },
        h("a", { class: "cart-img", href: o.product_id ? `#/urun/${o.product_id}` : null, "aria-hidden": "true", tabindex: "-1" },
          photo ? h("img", { src: photoUrl(photo), alt: "" }) : icon(categoryIconName(o.products?.category || o.conversations?.product_category), 26)),
        h("div", { class: "order-main" },
          h("div", { class: "cart-title" }, title),
          h("div", { class: "small muted" }, `${o.quantity} adet · ${formatPrice(total)} · ${o.delivery === "kargo" ? "Kargo" : "Elden teslim"} · ${dateTr(o.paid_at || o.created_at)}`),
          h("div", { class: "small" }, asSeller ? "Alıcı: " : "Satıcı: ", h("strong", {}, o.other_name)),
          h("span", { class: `order-badge ${st.cls}` }, st.label)),
      ),
      st.step > 0 ? h("ol", { class: "order-steps", "aria-label": "Sipariş durumu" }, steps.map((s, i) =>
        h("li", { class: i < st.step ? "done" : "", "aria-current": i === st.step - 1 ? "step" : null }, s))) : null,
      o.tracking_no ? h("div", { class: "order-track small" }, icon("truck", 16), `${o.cargo_company || "Kargo"} · Takip no: `, h("strong", { class: "mono" }, o.tracking_no)) : null,
      addr,
      o.dispute_status === "acik" ? h("div", { class: "notice" }, icon("alert", 20), h("span", {},
        h("strong", {}, asSeller ? "Alıcı sorun bildirdi: " : "Sorun bildirdiniz: "), o.dispute_reason,
        o.dispute_note ? ` — "${o.dispute_note}"` : "",
        asSeller ? ". Ödeme, sorun çözülene kadar size aktarılmaz. Alıcıyla konuşun; gerekirse siparişi iptal edip iade edin."
          : ". Satıcıyla sohbetten konuşun. Sorun çözüldüyse \"Teslim aldım\" diyebilirsiniz; ekibimiz de bilgilendirildi.")) : null,
      timingNote(o, asSeller),
      asSeller && o.status !== "iptal" ? h("p", { class: "small muted", style: { margin: 0 } },
        o.payout_status === "onaylandi" ? "Ödemeniz onaylandı; iyzico hesabınıza aktarır." : "Ödeme iyzico'da güvende; alıcı teslim aldığını onaylayınca size geçer.") : null,
      actions.children.length ? actions : null,
      o.conversation_id ? h("a", { class: "link-btn", href: `#/sohbet/${o.conversation_id}` }, ...withIcon("message", asSeller ? "Alıcıyla konuş" : "Satıcıyla konuş")) : null,
    );
  }

  // Süre bilgisi: satıcıya kargo süresi, alıcıya otomatik onay süresi
  function timingNote(o, asSeller) {
    if (o.status === "iptal" || o.status === "teslim_edildi" || o.payment_status !== "odendi") return null;
    if (o.shipping_status === "hazirlaniyor" && o.paid_at) {
      const d = daysLeft(o.paid_at, SHIP_DAYS);
      return h("p", { class: "small timing", style: { margin: 0 } }, icon("calendar", 16), asSeller
        ? ` ${d ? `${d} gün içinde` : "Bugün"} ${o.delivery === "kargo" ? "kargoya verin" : "teslime hazırlayın"}; süresinde gönderilmezse sipariş iptal edilip iade edilir.`
        : ` Satıcının göndermesi için ${d} gün var; gönderilmezse ödemeniz kendiliğinden iade edilir.`);
    }
    if (o.shipping_status === "kargoda" && o.shipped_at && o.dispute_status !== "acik") {
      const d = daysLeft(o.shipped_at, CONFIRM_DAYS);
      return h("p", { class: "small timing", style: { margin: 0 } }, icon("calendar", 16), asSeller
        ? ` Alıcı onaylamazsa ödemeniz ${d} gün sonra kendiliğinden onaylanır.`
        : ` Sorun bildirmezseniz sipariş ${d} gün sonra kendiliğinden onaylanır ve ödeme satıcıya geçer.`);
    }
    return null;
  }

  function disputeSheet(o) {
    sheet("Sorun bildir", (close) => {
      let reason = "", note = "";
      const list = h("div", { class: "filter-list", role: "radiogroup", "aria-label": "Sorun" });
      const paint = () => list.replaceChildren(...DISPUTE_REASONS.map((r) => h("button", {
        type: "button", role: "radio", "aria-checked": String(reason === r), "aria-pressed": String(reason === r), onclick: () => { reason = r; paint(); } }, r)));
      paint();
      const send = h("button", { type: "button", class: "btn btn-primary", onclick: async () => {
        if (!reason) return toast("Sorunu seçin.");
        send.disabled = true;
        try { await openDispute(o.id, reason, note.trim()); close(); toast("Sorun bildirildi. Ödeme satıcıya aktarılmayacak; satıcı ve ekibimiz bilgilendirildi."); load(); }
        catch (e) { toast(e.message || "Gönderilemedi."); send.disabled = false; }
      } }, "Bildir");
      return h("div", { class: "stack" },
        h("p", { class: "muted", style: { margin: 0 } }, "Sorun çözülene kadar ödeme satıcıya geçmez ve sipariş kendiliğinden onaylanmaz."),
        list,
        h("textarea", { class: "input", rows: 3, maxlength: 1000, placeholder: "Ne oldu? Kısaca yazın (isteğe bağlı)", "aria-label": "Açıklama", oninput: (e) => (note = e.target.value) }),
        send);
    });
  }

  function shipForm(o) {
    let company = CARGO[0], tracking = "";
    const b = h("button", { type: "submit", class: "btn btn-primary" }, ...withIcon("truck", "Kargoya verdim"));
    return h("form", { class: "ship-form", onsubmit: async (e) => {
      e.preventDefault();
      if (tracking.trim().length < 4) return toast("Kargo takip numarasını yazın.");
      b.disabled = true;
      try { await setShipment(o.id, company, tracking.trim()); toast("Alıcıya takip numarası gönderildi."); load(); }
      catch (err) { toast(err.message || "Kaydedilemedi."); b.disabled = false; }
    } },
      h("select", { class: "input", "aria-label": "Kargo firması", onchange: (e) => (company = e.target.value) }, CARGO.map((c) => h("option", { value: c }, c))),
      h("input", { class: "input", placeholder: "Takip numarası", "aria-label": "Takip numarası", maxlength: 40, oninput: (e) => (tracking = e.target.value) }),
      b);
  }

  // ---------- Puan ve yorum ----------
  const stars = (n) => h("span", { class: "stars", "aria-label": `${n} yıldız` }, "★".repeat(n), h("span", { class: "off" }, "★".repeat(5 - n)));
  const reviewView = (r) => h("div", { class: "small" }, "Puanınız: ", stars(r.rating), r.comment ? h("span", { class: "muted" }, ` · "${r.comment}"`) : null);
  function reviewButton(o) {
    return h("button", { type: "button", class: "btn btn-secondary", onclick: () => sheet("Satıcıyı puanlayın", (close) => {
      let rating = 0, comment = "";
      const starRow = h("div", { class: "star-pick", role: "radiogroup", "aria-label": "Puan" });
      const paint = () => starRow.replaceChildren(...[1, 2, 3, 4, 5].map((n) => h("button", {
        type: "button", role: "radio", "aria-checked": String(rating === n), "aria-label": `${n} yıldız`, class: n <= rating ? "on" : "",
        onclick: () => { rating = n; paint(); } }, "★")));
      paint();
      const send = h("button", { type: "button", class: "btn btn-primary", onclick: async () => {
        if (!rating) return toast("Yıldız seçin.");
        send.disabled = true;
        try { await writeReview(o.id, rating, comment.trim()); close(); toast("Teşekkürler, puanınız kaydedildi."); load(); }
        catch (e) { toast(e.message || "Kaydedilemedi."); send.disabled = false; }
      } }, "Gönder");
      return h("div", { class: "stack" },
        h("p", { class: "muted", style: { margin: 0 } }, `${o.other_name} ile alışverişiniz nasıldı?`),
        starRow,
        h("textarea", { class: "input", rows: 3, maxlength: 500, placeholder: "İsterseniz birkaç cümle yazın (isteğe bağlı)", "aria-label": "Yorum", oninput: (e) => (comment = e.target.value) }),
        send);
    }) }, ...withIcon("award", "Satıcıyı puanla"));
  }

  // ---------- Teklifler ----------
  const OFFER = { bekliyor: "Cevap bekleniyor", karsi: "Karşı teklif", kabul: "Kabul edildi", red: "Reddedildi", iptal: "İptal / süresi doldu", kullanildi: "Satın alındı" };
  function drawOffers(offers) {
    if (!offers.length) {
      list.replaceChildren(h("div", { class: "card" }, emptyState("tag", "Henüz teklif yok", "Ürün sayfasında \"Teklif ver\" ile fiyat önerebilirsiniz.", h("a", { class: "btn btn-primary", href: "#/urunler" }, "Ürünlere bak"))));
      return;
    }
    list.replaceChildren(...offers.map((o) => {
      const p = o.products || {};
      const actions = h("div", { class: "order-actions" });
      const run = (btn, fn, msg) => async () => { btn.disabled = true; try { await fn(); toast(msg); load(); } catch (e) { toast(e.message || "Yapılamadı."); btn.disabled = false; } };
      const btn = (cls, label, fn, msg) => { const b = h("button", { type: "button", class: `btn ${cls}` }, label); b.onclick = run(b, fn, msg); return b; };
      if (!o.mine && o.status === "bekliyor") {
        actions.append(
          btn("btn-primary", "Kabul et", () => respondOffer(o.id, "kabul"), "Teklif kabul edildi; alıcıya bildirildi."),
          h("button", { type: "button", class: "btn btn-secondary", onclick: () => counterSheet(o) }, "Karşı teklif ver"),
          btn("btn-ghost", "Reddet", () => respondOffer(o.id, "red"), "Teklif reddedildi."));
      }
      if (o.mine && o.status === "karsi") {
        actions.append(
          btn("btn-primary", `${formatPrice(o.counter_amount)} kabul et`, () => respondOffer(o.id, "kabul"), "Kabul ettiniz; artık bu fiyattan satın alabilirsiniz."),
          btn("btn-ghost", "Reddet", () => respondOffer(o.id, "red"), "Karşı teklifi reddettiniz."));
      }
      if (o.mine && o.status === "kabul" && p.status === "satista") {
        actions.append(h("button", { type: "button", class: "btn btn-primary", onclick: () => { if (addProductToCart(p)) navigate("/sepet"); } }, ...withIcon("cart", "Bu fiyattan satın al")));
      }
      if (o.mine && ["bekliyor", "karsi", "kabul"].includes(o.status)) actions.append(btn("btn-ghost", "Teklifi geri çek", () => respondOffer(o.id, "iptal"), "Teklif geri çekildi."));
      const amount = o.status === "karsi" ? `${formatPrice(o.amount)} → karşı teklif ${formatPrice(o.counter_amount)}` : formatPrice(o.amount);
      return h("article", { class: "card order-item" },
        h("div", { class: "order-top" },
          h("a", { class: "cart-img", href: `#/urun/${o.product_id}`, "aria-hidden": "true", tabindex: "-1" },
            p.photos?.[0] ? h("img", { src: photoUrl(p.photos[0]), alt: "" }) : icon(categoryIconName(p.category), 26)),
          h("div", { class: "order-main" },
            h("a", { class: "cart-title", href: `#/urun/${o.product_id}` }, p.title || "Ürün"),
            h("div", { class: "small muted" }, `Liste fiyatı ${formatPrice(p.price)} · Teklif: `, h("strong", { style: { color: "var(--primary)" } }, amount)),
            h("div", { class: "small" }, o.mine ? "Satıcı: " : "Teklif veren: ", h("strong", {}, o.other_name)),
            h("span", { class: `order-badge ${o.status === "kabul" || o.status === "kullanildi" ? "done" : o.status === "red" || o.status === "iptal" ? "off" : "go"}` },
              o.mine ? OFFER[o.status] : o.status === "bekliyor" ? "Cevabınızı bekliyor" : OFFER[o.status]))),
        o.status === "kabul" && o.expires_at ? h("p", { class: "small muted", style: { margin: 0 } }, `Bu fiyat ${new Date(o.expires_at).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} tarihine kadar geçerli.`) : null,
        actions.children.length ? actions : null,
        o.conversation_id ? h("a", { class: "link-btn", href: `#/sohbet/${o.conversation_id}` }, ...withIcon("message", "Sohbete git")) : null);
    }));
  }

  function counterSheet(o) {
    sheet("Karşı teklif", (close) => {
      let v = "";
      const b = h("button", { type: "button", class: "btn btn-primary", onclick: async () => {
        const n = Number(String(v).replace(",", "."));
        b.disabled = true;
        try { await respondOffer(o.id, "karsi", n); close(); toast("Karşı teklif gönderildi."); load(); }
        catch (e) { toast(e.message || "Gönderilemedi."); b.disabled = false; }
      } }, "Gönder");
      return h("div", { class: "stack" },
        h("p", { class: "muted", style: { margin: 0 } }, `Alıcının teklifi ${formatPrice(o.amount)}, liste fiyatı ${formatPrice(o.products?.price)}. Arada bir fiyat yazın.`),
        h("input", { class: "input", inputmode: "decimal", placeholder: "Tutar (TL)", "aria-label": "Karşı teklif tutarı", oninput: (e) => (v = e.target.value) }),
        b);
    });
  }

  await load();
}

// Ürün sayfasındaki "Teklif ver" penceresi
export function offerSheet(product) {
  if (!requireAuth(`/urun/${product.id}`)) return;
  sheet("Teklif ver", (close) => {
    let v = "";
    const min = Math.ceil(Number(product.price) * 0.5);
    const b = h("button", { type: "button", class: "btn btn-primary", onclick: async () => {
      const n = Number(String(v).replace(",", "."));
      if (!n) return toast("Teklif tutarını yazın.");
      b.disabled = true;
      try { await makeOffer(product.id, n); close(); toast("Teklifiniz satıcıya iletildi."); track("offer_made", {}); }
      catch (e) { toast(e.message || "Teklif gönderilemedi."); b.disabled = false; }
    } }, "Teklifi gönder");
    return h("div", { class: "stack" },
      h("p", { class: "muted", style: { margin: 0 } }, `Liste fiyatı ${formatPrice(product.price)}. En az ${formatPrice(min)} teklif verebilirsiniz.`),
      h("div", { class: "chips-row" }, [0.9, 0.85, 0.8].map((r) => {
        const val = Math.round(Number(product.price) * r);
        return h("button", { type: "button", class: "chip chip-brand", onclick: (e) => { v = String(val); e.currentTarget.closest(".stack").querySelector("input").value = val; } }, formatPrice(val));
      })),
      h("input", { class: "input", inputmode: "decimal", placeholder: "Tutar (TL)", "aria-label": "Teklif tutarı", oninput: (e) => (v = e.target.value) }),
      h("p", { class: "small muted", style: { margin: 0 } }, "Satıcı kabul ederse 48 saat içinde bu fiyattan satın alabilirsiniz. Satıcı karşı teklif de verebilir."),
      b);
  });
}
