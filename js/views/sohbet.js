// Sohbet — WhatsApp'a benzer; üstte sabit ürün kartı (taslak 1.4).
// Hazır mesaj baloncukları, sesli mesaj + yazıya çevirme, sipariş kartı ("Anlaştık"),
// telefon/IBAN kalkanı, güvenli buluşma önerisi, tek dokunuşla şikayet/engelle.
import { h, toast, sheet, ask, micButton, clockTime, formatPrice, shieldCheck, emptyState, loading, icon, withIcon } from "../ui.js";
import { state } from "../store.js";
import {
  getConversation, sendMessage, sendVoiceMessage, voiceUrl, transcribeVoice, markRead, subscribeConversation,
  proposeOrder, agreeOrder, cancelOrder, markDelivered, blockUser, reportUser, photoUrl, track, DELIVERY_LABEL,
} from "../api.js";
import { navigate, requireAuth } from "../router.js";
import { assistantEvent } from "../assistant.js";
import { pageTitle } from "../components.js";
import { categoryIconName } from "../icons.js";

const QUICK = {
  buyer: ["Hâlâ satışta mı?", "Kargo ücreti ne kadar?", "Elden alabilir miyim?"],
  seller: ["Evet, hazır", "2 günde hazırlarım", "Kargoya verdim"],
};
const SAFE_SPOTS = "Kalabalık bir yerde buluşun: muhtarlık, market önü ya da cami avlusu gibi. Ev adresi paylaşmayın.";

export default async function render(root, { params: [id] }) {
  if (!requireAuth(`/sohbet/${id}`)) return;
  root.append(loading());
  const conv = await getConversation(id).catch(() => null);
  root.replaceChildren();
  if (!conv) {
    root.append(pageTitle("Sohbet", { back: () => navigate("/mesajlar") }),
      emptyState("message", "Sohbet bulunamadı", null, h("a", { class: "btn btn-primary", href: "#/mesajlar" }, "Mesajlarıma dön")));
    return;
  }

  const me = state.user.id;
  const role = conv.iAmBuyer ? "buyer" : "seller";
  const messages = conv.messages;
  const orders = new Map(conv.orders.map((o) => [o.id, o]));
  const listEl = h("div", { class: "chat-list", "aria-live": "polite" });
  // Ürün satıcı tarafından silindiyse sohbete kaydedilmiş adı ve fiyatı kullanılır
  const product = conv.products || {
    id: null, title: conv.product_title || "Kaldırılan ürün", price: conv.product_price,
    category: conv.product_category, photos: [], deleted: true,
  };

  // ---------- Başlık + kalkan ----------
  const title = pageTitle(conv.other.full_name || "Komşu", { back: () => navigate("/mesajlar") });
  title.append(h("button", { class: "icon-btn", "aria-label": "Güvenlik: şikayet, engelle", title: "Güvenlik", onclick: shieldMenu }, icon("shield")));

  const productCard = product.deleted
    ? h("div", { class: "card conv-item chat-product" },
        h("div", { class: "ph", "aria-hidden": "true" }, icon(categoryIconName(product.category))),
        h("div", {},
          h("strong", {}, product.title),
          product.price != null ? h("div", { class: "price" }, formatPrice(product.price)) : null,
          h("div", { class: "meta small" }, "Bu ürün satıcı tarafından kaldırıldı."),
        ),
        h("span"),
      )
    : h("a", { class: "card card-link conv-item chat-product", href: `#/urun/${product.id}` },
        product.photos?.[0] ? h("img", { src: photoUrl(product.photos[0]), alt: "" }) : h("div", { class: "ph" }, icon(categoryIconName(product.category))),
        h("div", {}, h("strong", {}, product.title), h("div", { class: "price" }, formatPrice(product.price))),
        h("span", { style: { color: "var(--text-faint)" } }, icon("chevron-right")),
      );

  // ---------- Yazma alanı ----------
  const textarea = h("textarea", { class: "input", rows: 1, placeholder: "Mesaj yazın…", "aria-label": "Mesaj" });
  const sendBtn = h("button", { class: "send-btn", "aria-label": "Gönder", onclick: () => send(textarea.value) }, icon("send"));
  const recordBtn = h("button", { class: "mic-sm", "aria-label": "Sesli mesaj kaydet", title: "Sesli mesaj", onclick: toggleRecord }, icon("file-audio"));
  textarea.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(textarea.value); } });

  const quick = h("div", { class: "quick-replies", role: "group", "aria-label": "Hazır mesajlar" },
    QUICK[role].map((q) => h("button", { onclick: () => send(q, "hazir") }, q)),
    product.deleted ? null : h("button", { class: "accent", onclick: orderSheet }, withIcon("receipt", "Sipariş kartı")),
  );

  root.append(
    title,
    h("div", { class: "chat" },
      productCard,
      listEl,
      quick,
      h("div", { class: "composer" },
        micButton({ size: "sm", label: "Konuşarak yazın", onText: (t) => (textarea.value = t) }),
        recordBtn, textarea, sendBtn,
      ),
    ),
  );

  // ---------- Mesajları çiz ----------
  function bubble(m) {
    if (m.kind === "sistem") return h("div", { class: "bubble system" }, m.body);
    if (m.kind === "siparis") return orderCard(orders.get(m.order_id), m);
    const mine = m.sender_id === me;
    const el = h("div", { class: `bubble ${mine ? "me" : "them"} ${mine && m.flags?.length ? "flagged" : ""}` });
    if (m.kind === "ses") el.append(voiceBlock(m));
    else el.append(m.body || "");
    el.append(h("div", { class: "time" }, clockTime(m.created_at)));
    return el;
  }

  function voiceBlock(m) {
    const wrap = h("div", { class: "stack", style: { gap: "6px" } });
    const audio = h("audio", { controls: true, preload: "none", style: { maxWidth: "220px" } });
    voiceUrl(m.audio_path).then((u) => u && (audio.src = u));
    wrap.append(audio);
    if (m.transcript) wrap.append(h("em", {}, m.transcript));
    else wrap.append(h("button", { class: "btn btn-ghost", style: { minHeight: "44px" }, onclick: async (e) => {
      e.target.disabled = true;
      try { m.transcript = await transcribeVoice(m); draw(); } catch { toast("Şu an yazıya çeviremedim."); e.target.disabled = false; }
    } }, withIcon("file", "Yazısını oku")));
    return wrap;
  }

  function orderCard(o, m) {
    if (!o) return h("div", { class: "bubble system" }, "Sipariş kartı");
    const iAgreed = role === "buyer" ? o.buyer_agreed : o.seller_agreed;
    const statusText = { teklif: "Onay bekliyor", anlasildi: "Anlaşıldı", teslim_edildi: "Teslim edildi", iptal: "İptal edildi" }[o.status];
    const actions = h("div", { class: "stack" });
    if (o.payment_status === "odendi" || o.payment_status === "iade") {
      // Online ödenmiş sipariş: kargo, teslim onayı ve iade "Siparişlerim"den yönetilir
      actions.append(
        h("p", { class: "small", style: { margin: 0 } }, icon("lock", 16), o.payment_status === "iade" ? " Ödeme iade edildi." : " Online ödendi (iyzico güvencesinde)."),
        h("a", { class: "btn btn-secondary", href: `#/siparislerim${role === "seller" ? "?sekme=satislarim" : ""}` }, "Siparişlerim'de takip et"));
    } else if (o.status === "teklif") {
      if (!iAgreed) actions.append(h("button", { class: "btn btn-success", onclick: () => act(agreeOrder, o.id, "order_agreed") }, withIcon("check", "Anlaştık")));
      else actions.append(h("p", { class: "muted small center" }, "Karşı tarafın \"Anlaştık\" demesi bekleniyor."));
      actions.append(h("button", { class: "btn btn-ghost", onclick: async () => (await ask("Siparişi iptal edelim mi?", null, "Evet, iptal")) && act(cancelOrder, o.id) }, "İptal et"));
    } else if (o.status === "anlasildi") {
      if (o.delivery !== "kargo") actions.append(h("div", { class: "tip small" }, icon("shield-check"), h("p", {}, SAFE_SPOTS)));
      actions.append(h("button", { class: "btn btn-success", onclick: () => act(markDelivered, o.id, "order_delivered") },
        withIcon("package", role === "buyer" ? "Teslim aldım" : "Teslim ettim")));
    }
    return h("div", { class: "card order-card", style: { alignSelf: "stretch" } },
      h("div", { class: "order-head" }, icon("receipt"), "Sipariş kartı"),
      h("dl", {},
        h("dt", {}, "Ürün"), h("dd", {}, product.title),
        h("dt", {}, "Adet"), h("dd", {}, o.quantity),
        h("dt", {}, "Fiyat"), h("dd", {}, `${formatPrice(o.unit_price)} × ${o.quantity} = ${formatPrice(o.unit_price * o.quantity)}`),
        h("dt", {}, "Teslim"), h("dd", {}, DELIVERY_LABEL[o.delivery]),
        o.promised_date ? [h("dt", {}, "Tarih"), h("dd", {}, new Date(o.promised_date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" }))] : null,
        h("dt", {}, "Durum"), h("dd", {}, statusText),
      ),
      actions,
    );
  }

  async function act(fn, orderId, event) {
    try {
      const o = await fn(orderId);
      if (o) orders.set(o.id, o);
      if (event) track(event, { order_id: orderId });
      if (event === "order_delivered" && role === "seller") assistantEvent("first_sale", o);
      draw();
    } catch (e) { toast(e.message || "Olmadı, tekrar dener misiniz?"); }
  }

  function draw() {
    const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 80;
    listEl.replaceChildren(...(messages.length
      ? messages.map(bubble)
      : [h("p", { class: "muted center" }, role === "buyer" ? "Ne yazacağınızı düşünmeyin; aşağıdaki hazır cümlelerden birine dokunun." : "Hazır cevaplardan birine dokunabilirsiniz.")]));
    if (atBottom) window.scrollTo(0, document.body.scrollHeight);
  }

  function upsert(m) {
    const i = messages.findIndex((x) => x.id === m.id);
    if (i >= 0) messages[i] = { ...messages[i], ...m };
    else messages.push(m);
    if (m.sender_id !== me) markRead(id);
    draw();
  }

  // ---------- Gönderme ----------
  async function send(text, kind = "metin") {
    const body = String(text || "").trim();
    if (!body) return;
    // Telefon ve IBAN kalkanı: yumuşak uyarı, karar kullanıcının.
    if (shieldCheck(body).length) {
      const goOn = await ask("Bilgilerinizi paylaşmadan önce emin olun",
        "Mesajınızda telefon, IBAN, adres ya da ödeme bilgisi var gibi görünüyor. Ödemeyi Femoria üzerinden yapmak sizi korur.",
        "Yine de gönder", "Vazgeç");
      if (!goOn) return;
    }
    textarea.value = "";
    try { upsert(await sendMessage(id, { body, kind })); }
    catch (e) { textarea.value = body; toast(e.message?.includes("row-level") ? "Bu kişiye mesaj gönderilemiyor." : "Gönderilemedi, tekrar dener misiniz?"); }
  }

  let recorder = null;
  async function toggleRecord() {
    if (recorder) { recorder.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        recordBtn.classList.remove("listening");
        recordBtn.replaceChildren(icon("file-audio"));
        recorder = null;
        const blob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
        if (blob.size < 1500) return toast("Çok kısa oldu. Basıp konuşun, bitince tekrar dokunun.");
        try { upsert(await sendVoiceMessage(id, blob)); } catch { toast("Sesli mesaj gönderilemedi."); }
      };
      recorder.start();
      recordBtn.classList.add("listening");
      recordBtn.replaceChildren(icon("stop"));
      toast("Kaydediyorum… Bitince tekrar dokunun.");
    } catch { toast("Mikrofon izni verilmedi."); }
  }

  // ---------- Sipariş kartı oluştur ----------
  function orderSheet() {
    let qty = 1;
    let price = Number(product.price) || 0;
    let delivery = product.delivery === "kargo" ? "kargo" : "elden";
    const d = new Date(Date.now() + 2 * 864e5);
    const date = h("input", { class: "input", type: "date", value: d.toISOString().slice(0, 10), min: new Date().toISOString().slice(0, 10), id: "o-date" });
    const qtyOut = h("output", {}, qty);
    const priceIn = h("input", { class: "input", type: "number", inputmode: "decimal", min: 0, step: "1", value: price, id: "o-price" });
    const delWrap = h("div", { class: "btn-group" });
    const drawDel = () => delWrap.replaceChildren(...[["elden", "users", "Elden"], ["kargo", "package", "Kargo"]].map(([v, ico, l]) =>
      h("button", { class: "btn btn-secondary btn-choice", "aria-pressed": String(delivery === v), onclick: () => { delivery = v; drawDel(); } }, withIcon(ico, l))));
    drawDel();

    sheet("Sipariş kartı", (close) => h("div", { class: "stack" },
      h("p", { class: "muted" }, "Adet, fiyat, teslim şekli ve tarih tek kartta birleşir. İkiniz de \"Anlaştık\" deyince kaydedilir."),
      h("label", {}, "Adet"),
      h("div", { class: "price-picker" },
        h("button", { "aria-label": "Azalt", onclick: () => { qty = Math.max(1, qty - 1); qtyOut.textContent = qty; } }, icon("minus")),
        qtyOut,
        h("button", { "aria-label": "Artır", onclick: () => { qty += 1; qtyOut.textContent = qty; } }, icon("plus")),
      ),
      h("label", { for: "o-price" }, "Tanesi kaç lira?"), priceIn,
      h("label", {}, "Teslim"), delWrap,
      h("label", { for: "o-date" }, "Ne zaman?"), date,
      h("button", { class: "btn btn-primary btn-xl", onclick: async () => {
        price = Number(String(priceIn.value).replace(",", "."));
        if (Number.isNaN(price) || price < 0) return toast("Fiyatı kontrol edin.");
        try {
          await proposeOrder(id, { quantity: qty, unitPrice: price, delivery, promisedDate: date.value });
          track("order_proposed");
          close();
          await refresh();
        } catch (e) { toast(e.message || "Kart oluşturulamadı."); }
      } }, "Kartı gönder"),
    ));
  }

  // ---------- Kalkan menüsü ----------
  function shieldMenu() {
    sheet("Güvenliğiniz için", (close) => h("div", { class: "stack" },
      h("button", { class: "btn btn-secondary", onclick: async () => {
        close();
        await reportUser({ reportedId: conv.otherId, conversationId: id, productId: product.id });
        toast("İlettiniz. Ekibimiz bakacak. Açıklama yapmak zorunda değilsiniz.");
      } }, withIcon("flag", "Rahatsız oldum")),
      h("button", { class: "btn btn-danger", onclick: async () => {
        close();
        if (!(await ask("Engelleyelim mi?", "Bu kişi size bir daha yazamaz.", "Evet, engelle"))) return;
        try { await blockUser(conv.otherId); } catch { /* zaten engelli */ }
        await reportUser({ reportedId: conv.otherId, conversationId: id, reason: "Engellendi" }).catch(() => {});
        toast("Engellendi.");
        navigate("/mesajlar");
      } }, withIcon("ban", "Engelle")),
      h("div", { class: "tip small" }, icon("shield-check"), h("p", {}, "Ev adresinizi, banka bilgilerinizi ya da şifrelerinizi mesajda yazmayın. ", SAFE_SPOTS)),
    ));
  }


  async function refresh() {
    const fresh = await getConversation(id).catch(() => null);
    if (!fresh) return;
    messages.splice(0, messages.length, ...fresh.messages);
    fresh.orders.forEach((o) => orders.set(o.id, o));
    draw();
  }

  draw();
  window.scrollTo(0, document.body.scrollHeight);
  markRead(id);

  return subscribeConversation(id, {
    onMessage: upsert,
    onOrder: (o) => { orders.set(o.id, o); draw(); },
  });
}
