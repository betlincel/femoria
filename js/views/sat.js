// Sat — tek sayfalık "Ürün bilgileri" formu: fotoğraf, ad, açıklama, tür, fiyat, teslim ve konum
// aynı ekranda girilir. Ayşe Abla'ya sesle anlatılırsa ad / açıklama / tür kendiliğinden dolar.
// Üyelik ürün yüklemenin önüne konmaz: giriş/üyelik yalnızca "Satışa çıkar" anında istenir.
// Yarım iş her değişiklikte otomatik saklanır (localStorage).
import { h, toast, micButton, prepareImage, formatPrice, canListen, ask, sheet, icon, withIcon, iconCircle, statusScreen, speak } from "../ui.js";
import { state, LS } from "../store.js";
import { getCategories, priceSuggestion, publishProduct, askAssistant, track } from "../api.js";
import { pageTitle, categoryTiles, askLocation, pickLocation } from "../components.js";
import { navigate, requireAuth } from "../router.js";
import { assistantEvent } from "../assistant.js";

const MAX_PHOTOS = 4;
const TITLE_MAX = 120;
const DESC_MAX = 2000;

const newDraft = () => ({
  photos: [], transcript: "", title: "", description: "", category: null,
  price: null, delivery: null, suggestion: null, location: null, startedAt: Date.now(), updatedAt: Date.now(),
});

const DELIVERY = [["elden", "users", "Elden teslim"], ["kargo", "package", "Kargo"], ["ikisi", "repeat", "İkisi de"]];

export default async function render(root) {
  let draft = { ...newDraft(), ...(LS.get("draft") || {}) };
  delete draft.step; // eski 3 adımlı taslaklardan kalan alan
  const categories = await getCategories();
  const form = h("form", { class: "sell-form", novalidate: true, onsubmit: (e) => { e.preventDefault(); publish(); } });

  if (!LS.get("draft")) track("listing_started");

  const save = () => {
    draft.updatedAt = Date.now();
    try { LS.set("draft", draft); } catch { toast("Telefonun hafızası doldu; taslak saklanamadı."); }
  };

  root.append(pageTitle("Satışa çıkar"), form);

  // ---------- Yardımcılar ----------
  // Yüzen etiketli alan (etiket kutunun içinde; yazınca yukarı kayar)
  function floatField({ id, label, required, control, help, counter }) {
    const err = h("div", { class: "field-error", id: `${id}-err`, hidden: true });
    return h("div", { class: "field", "data-field": id },
      h("div", { class: "ffield" }, control, h("label", { for: id }, label, required ? h("span", { class: "req" }, " *") : null)),
      h("div", { class: "field-help" }, h("span", {}, help || ""), counter || null),
      err,
    );
  }
  const counterFor = (el, max) => {
    const c = h("span", { class: "counter" }, `${el.value.length}/${max}`);
    el.addEventListener("input", () => (c.textContent = `${el.value.length}/${max}`));
    return c;
  };
  function setError(id, msg) {
    const box = form.querySelector(`[data-field="${id}"]`);
    if (!box) return;
    box.classList.toggle("has-error", !!msg);
    const err = box.querySelector(".field-error");
    err.hidden = !msg;
    err.textContent = msg || "";
  }

  // ---------- Fotoğraflar ----------
  const photoGrid = h("div", { class: "photo-grid" });
  const photoCount = h("span", { class: "muted" });
  const fileInput = h("input", { type: "file", accept: "image/*", multiple: true, hidden: true, onchange: async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    const room = MAX_PHOTOS - draft.photos.length;
    if (files.length > room) toast(`En çok ${MAX_PHOTOS} fotoğraf ekleyebilirsiniz.`);
    for (const f of files.slice(0, room)) {
      try { draft.photos = [...draft.photos, await prepareImage(f)]; } catch { toast("Bu fotoğraf açılamadı."); }
    }
    save();
    setError("photos", null);
    drawPhotos();
  } });

  function drawPhotos() {
    photoCount.textContent = ` (${draft.photos.length}/${MAX_PHOTOS})`;
    const full = draft.photos.length >= MAX_PHOTOS;
    const uploader = h("div", { class: "photo-upload" + (full ? " is-full" : "") },
      h("button", { type: "button", class: "btn btn-primary btn-inline", disabled: full, "data-highlight": "fotograf-yukle", onclick: () => fileInput.click() },
        ...withIcon("camera", "Fotoğraf yükle")),
      h("p", { class: "small muted" }, full ? "Fotoğraf sınırına ulaştınız." : h("span", {}, h("b", {}, "İpucu: "), "Gün ışığında, pencere kenarında çekin.")),
    );
    const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => {
      const src = draft.photos[i];
      if (!src) return h("button", { type: "button", class: "photo-slot", "aria-label": "Fotoğraf ekle", disabled: full, onclick: () => fileInput.click() }, icon("plus", 20));
      return h("div", { class: "photo-slot filled" },
        h("img", { src, alt: `Fotoğraf ${i + 1}` }),
        i === 0 ? h("span", { class: "cover" }, "Vitrin") : null,
        h("button", { type: "button", class: "photo-del", "aria-label": `${i + 1}. fotoğrafı kaldır`, onclick: () => {
          draft.photos = draft.photos.filter((_, j) => j !== i); save(); drawPhotos();
        } }, icon("x", 16)),
      );
    });
    photoGrid.replaceChildren(uploader, ...slots);
  }

  function photoTips() {
    sheet("Güzel fotoğraf için", h("div", { class: "stack" },
      h("ul", { class: "tips-list" },
        h("li", {}, "Pencere kenarında, gün ışığında çekin; flaş kullanmayın."),
        h("li", {}, "Ürünü sade bir zemine (beyaz örtü, tahta masa) koyun."),
        h("li", {}, "Ürün kareyi doldursun; bir de yakından çekin."),
        h("li", {}, "İlk fotoğraf vitrinde görünür; en güzelini ilk ekleyin."),
      ),
      h("p", { class: "small muted" }, "Işığı ve rengi biz biraz düzeltiyoruz."),
    ));
  }

  // ---------- Form ----------
  function draw() {
    const title = h("input", { class: "input", id: "f-title", placeholder: " ", maxlength: TITLE_MAX, value: draft.title,
      oninput: (e) => { draft.title = e.target.value; save(); setError("f-title", null); },
      onchange: () => refreshSuggestion() });
    const desc = h("textarea", { class: "input", id: "f-desc", placeholder: " ", maxlength: DESC_MAX, rows: 4,
      oninput: (e) => { draft.description = e.target.value; save(); } }, draft.description || "");
    const price = h("input", { class: "input", id: "f-price", placeholder: " ", inputmode: "decimal", autocomplete: "off",
      value: draft.price ?? "",
      oninput: (e) => {
        const v = e.target.value.replace(/[^\d,.]/g, "");
        if (v !== e.target.value) e.target.value = v;
        draft.price = v === "" ? null : Math.round(Number(v.replace(",", ".")) || 0);
        save(); setError("f-price", null);
      } });

    const priceHelp = h("span", { id: "price-help" }, "Doğru fiyat daha hızlı satmanıza yardımcı olur.");
    const priceField = floatField({ id: "f-price", label: "Fiyat (TL)", required: true, control: price });
    priceField.querySelector(".field-help").replaceChildren(priceHelp);

    // Tür
    const tilesWrap = h("div");
    const drawTiles = () => tilesWrap.replaceChildren(categoryTiles(categories, { selected: draft.category, onSelect: (c) => {
      draft.category = c.slug; draft.suggestion = null; save(); setError("category", null); drawTiles(); refreshSuggestion();
    } }));
    drawTiles();

    // Teslim
    const delivery = h("div", { class: "seg", role: "radiogroup", "aria-label": "Teslim şekli" });
    const drawDelivery = () => delivery.replaceChildren(...DELIVERY.map(([v, ico, label]) => h("button", {
      type: "button", role: "radio", "aria-checked": String(draft.delivery === v),
      onclick: () => { draft.delivery = v; save(); setError("delivery", null); drawDelivery(); },
    }, icon(ico, 20), h("span", {}, label))));
    drawDelivery();

    // Konum
    const locBox = h("div");
    const setLoc = (loc) => { if (loc) { draft.location = { ...loc, suggested: false }; save(); setError("location", null); drawLoc(); } };
    const drawLoc = () => {
      const l = draft.location;
      const label = l ? [l.neighborhood, l.district, l.city].filter(Boolean).join(", ") || "Konum alındı" : "";
      locBox.replaceChildren(
        h("button", { type: "button", class: "loc-field" + (l ? " has-value" : ""), onclick: async () => setLoc(await pickLocation({ title: "Ürün nerede?" })) },
          h("span", { class: "loc-field-text" },
            h("span", { class: "loc-field-label" }, "Konum", h("span", { class: "req" }, " *")),
            l ? h("b", {}, label) : null),
          icon("chevron-down", 20)),
        h("div", { class: "field-help" },
          h("span", {}, l?.precision === "il" ? `Mahalle bulunamadı; ${l.city} merkezi kullanılacak.` : "Alıcılar yalnız mahalle adını görür; tam adresiniz paylaşılmaz."),
          h("button", { type: "button", class: "link-btn", onclick: async () => setLoc(await askLocation()) }, ...withIcon("map-pin", "Şu anki konumum"))),
      );
    };
    drawLoc();

    const voice = h("div", { class: "ai-banner", "aria-live": "polite" },
      icon("sparkles", 20),
      h("p", {}, canListen
        ? h("span", {}, h("b", {}, "Ayşe Abla yazsın: "), "mikrofona basılı tutup ürününüzü anlatın; adını, açıklamasını ve türünü ben doldurayım.")
        : h("span", {}, h("b", {}, "Ayşe Abla yazsın: "), "ürününüzü birkaç cümleyle açıklamaya yazın, \"Doldur\"a basın.")),
      canListen
        ? micButton({ size: "sm", label: "Ürününüzü anlatmak için basılı tutun", onEnd: (t) => t && understand(t) })
        : h("button", { type: "button", class: "btn btn-secondary btn-inline", onclick: () => desc.value.trim() ? understand(desc.value.trim()) : toast("Önce açıklamaya birkaç cümle yazın.") }, "Doldur"),
    );

    const section = (t, ...kids) => h("section", { class: "sell-section" }, h("h2", {}, t), ...kids);

    form.replaceChildren(
      h("div", { class: "card sell-card" },
        h("div", { class: "sell-photo-head" },
          h("h3", {}, "Fotoğraf", h("span", { class: "req" }, " *"), photoCount),
          h("button", { type: "button", class: "chip chip-brand", onclick: photoTips }, "Fotoğraf ipuçları")),
        h("p", { class: "small muted", style: { margin: "0 0 12px" } }, `En az 1, en çok ${MAX_PHOTOS} fotoğraf. İlk fotoğraf vitrinde görünür.`),
        h("div", { class: "field", "data-field": "photos" }, photoGrid, h("div", { class: "field-error", hidden: true })),
        fileInput,
        voice,

        section("Ürün bilgileri",
          floatField({ id: "f-title", label: "Ürünün adı", required: true, control: title,
            help: "Ne olduğunu ve miktarını yazın (ör. Ev yapımı vişne reçeli – 400 g)", counter: counterFor(title, TITLE_MAX) }),
          floatField({ id: "f-desc", label: "Açıklama", control: desc,
            help: "Malzemesi, ölçüsü, nasıl yapıldığı gibi bilgileri ekleyin", counter: counterFor(desc, DESC_MAX) }),
          h("div", { class: "field", "data-field": "category" },
            h("div", { class: "field-label" }, "Ne satıyorsunuz?", h("span", { class: "req" }, " *")),
            tilesWrap, h("div", { class: "field-error", hidden: true })),
          priceField,
          h("div", { class: "field", "data-field": "delivery" },
            h("div", { class: "field-label" }, "Teslim şekli", h("span", { class: "req" }, " *")),
            delivery, h("div", { class: "field-error", hidden: true })),
          h("div", { class: "field", "data-field": "location", id: "urun-konum" }, locBox, h("div", { class: "field-error", hidden: true })),
        ),
      ),
      h("div", { class: "sell-actions" },
        h("button", { type: "submit", class: "btn btn-success btn-xl" }, ...withIcon("arrow-right", "Satışa çıkar")),
        h("button", { type: "button", class: "btn btn-ghost", onclick: () => { save(); toast("Sakladım. Kaldığınız yerden devam edersiniz."); navigate("/"); } }, "Sonra devam ederim"),
        h("button", { type: "button", class: "btn btn-ghost btn-inline small", onclick: async () => {
          if (!(await ask("Formu temizleyelim mi?", "Fotoğraflar ve yazdıklarınız silinir.", "Evet, temizle", "Vazgeç"))) return;
          draft = newDraft(); save(); drawPhotos(); draw();
        } }, "Formu temizle"),
      ),
    );
    drawPhotos();
    refreshSuggestion();
  }

  // Fiyat önerisi (benzer ürünlerin aralığı) — fiyatın altında yazar
  let sugSeq = 0;
  async function refreshSuggestion() {
    const help = form.querySelector("#price-help");
    if (!help || !draft.category) return;
    const seq = ++sugSeq;
    const s = draft.suggestion || (await priceSuggestion(draft.category, draft.title).catch(() => null));
    if (seq !== sugSeq || !help.isConnected) return;
    if (!s) { help.textContent = "Mahallenizde benzer ürün henüz yok. Emeğinize uygun bir fiyat yazın."; return; }
    draft.suggestion = s; save();
    const mid = Math.round((Number(s.low) + Number(s.high)) / 2 / 10) * 10;
    help.replaceChildren(
      h("span", {}, `Benzer ürünler ${formatPrice(s.low)} – ${formatPrice(s.high)} arası satılıyor. `),
      h("button", { type: "button", class: "link-btn", onclick: () => {
        const el = form.querySelector("#f-price"); el.value = mid; el.dispatchEvent(new Event("input"));
      } }, `${formatPrice(mid)} yaz`),
    );
  }

  // Sesle anlatılanı Ayşe Abla yazıya döker → ad, açıklama, tür dolar
  async function understand(transcript) {
    draft.transcript = transcript;
    const banner = form.querySelector(".ai-banner p");
    if (banner) banner.textContent = "Yazıyorum…";
    const ai = await askAssistant({ mode: "describe", transcript });
    const out = ai?.title ? ai : localDescribe(transcript);
    Object.assign(draft, { title: out.title.slice(0, TITLE_MAX), description: (out.description || "").slice(0, DESC_MAX), category: out.category, suggestion: null });
    save();
    draw();
    toast("Doldurdum. Kontrol edip düzeltebilirsiniz.");
    speak(`Şöyle yazdım: ${draft.title}.`);
  }

  // ---------- Yayınla ----------
  function validate() {
    const errors = [
      ["photos", !draft.photos.length && "En az 1 fotoğraf ekleyin."],
      ["f-title", (draft.title || "").trim().length < 2 && "Ürününüze bir ad verin."],
      ["category", !draft.category && "Ne sattığınızı seçin."],
      ["f-price", draft.price == null && "Fiyat yazın (ücretsizse 0)."],
      ["delivery", !draft.delivery && "Teslim şeklini seçin."],
      ["location", !draft.location?.lat && "Ürünün nerede olduğunu seçin."],
    ];
    let first = null;
    for (const [id, msg] of errors) {
      setError(id, msg || null);
      if (msg && !first) first = id;
    }
    if (first) {
      form.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast("Eksik bilgileri tamamlayın.");
    }
    return !first;
  }

  async function publish() {
    if (!validate()) return;
    if (!draft.price && !(await ask("Ücretsiz mi vereceksiniz?", "Fiyatı 0 TL yazdınız.", "Evet, ücretsiz", "Fiyat yazayım"))) return;
    draft.publishAfterLogin = Date.now();
    save();
    if (!requireAuth("/sat")) return; // giriş sonrası buraya dönülür ve otomatik yayınlanır

    form.replaceChildren(statusScreen("refresh", "Vitrine koyuyorum…", { spin: true }));
    window.scrollTo(0, 0);
    try {
      const product = await publishProduct({ ...draft, title: draft.title.trim() });
      const seconds = Math.round((Date.now() - draft.startedAt) / 1000);
      track("listing_published", { seconds, photos: draft.photos.length, used_voice: !!draft.transcript });
      LS.set("draft", null);
      celebrate(product);
    } catch (e) {
      console.error(e);
      toast("Bir sorun oldu, ürününüz saklandı. Biraz sonra tekrar deneyin.");
      draft.publishAfterLogin = null;
      save();
      draw();
    }
  }

  function celebrate(product) {
    const first = !LS.get("published_before");
    LS.set("published_before", true);
    form.replaceChildren(
      h("div", { class: "celebrate" },
        iconCircle("check", "ok"),
        h("h1", {}, first ? "Tebrikler! İlk ürününüz vitrinde." : "Tebrikler! Ürününüz vitrinde."),
        h("p", { class: "muted" }, "Mahallenizdeki komşularınız artık görebilir."),
      ),
      h("a", { class: "btn btn-primary btn-xl", href: `#/urun/${product.id}` }, "Ürünümü gör"),
      h("button", { type: "button", class: "btn btn-secondary", onclick: () => { draft = newDraft(); save(); track("listing_started"); draw(); window.scrollTo(0, 0); } }, "Bir ürün daha koy"),
    );
    window.scrollTo(0, 0);
    speak(first ? "Tebrikler! İlk ürününüz vitrinde." : "Tebrikler! Ürününüz vitrinde.");
    assistantEvent("product_published", product);
  }

  // Girişten dönüldüyse kaldığı yerden otomatik yayınla.
  // (Yalnızca son 30 dakika içinde "Satışa çıkar"a basıldıysa.)
  draw();
  if (draft.publishAfterLogin && Date.now() - draft.publishAfterLogin < 30 * 60e3 && state.user) publish();
}

// ---------- Yapay zeka yokken: basit anlama ----------
const KEYWORDS = {
  yemek: ["reçel", "salça", "mantı", "erişte", "tarhana", "turşu", "börek", "pekmez", "bal", "yufka", "kek", "kurabiye", "sos", "yemek", "baklava", "sarma", "yaprak"],
  orgu: ["örgü", "patik", "atkı", "bere", "yelek", "kazak", "yün", "şal", "hırka", "bebek"],
  taki: ["kolye", "bileklik", "küpe", "yüzük", "takı", "boncuk", "tesbih"],
  "ev-susu": ["dantel", "vazo", "örtü", "süs", "yastık", "seramik", "mum", "tablo", "sepet", "çeyiz"],
  kurutmalik: ["kuru", "kurutulmuş", "kurutmalık", "biber", "patlıcan", "nane", "kekik", "pestil", "kuşburnu"],
};

export function localDescribe(text) {
  const t = text.toLocaleLowerCase("tr-TR");
  let category = "diger";
  for (const [slug, words] of Object.entries(KEYWORDS)) if (words.some((w) => t.includes(w))) { category = slug; break; }
  const clean = text.replace(/^(bu|bunlar|şu)\s+/i, "").replace(/\s+/g, " ").trim();
  const first = clean.split(/[.,;!?]/)[0];
  const qty = clean.match(/(\d+[.,]?\d*)\s*(gram|gr|g|kilo|kg|litre|lt|adet|tane)/i);
  const words = first.split(" ").filter((w) => !/^(bir|çok|da|de)$/i.test(w)).slice(0, 5);
  let title = words.map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1)).join(" ");
  if (qty && !title.includes(qty[1])) title += ` – ${qty[1]} ${qty[2].toLowerCase().startsWith("g") ? "g" : qty[2].toLowerCase()}`;
  return { title: title.slice(0, 120) || "El Emeği Ürün", description: clean.charAt(0).toLocaleUpperCase("tr-TR") + clean.slice(1), category };
}
