// Sat — "İlk ürünü 3 adımda satışa çıkarma" (taslak 1.3)
//   1 Fotoğraf · 2 Anlat · 3 Fiyat
// Üyelik ürün yüklemenin önüne konmaz: giriş/üyelik yalnızca "Satışa çıkar" anında istenir.
// Yarım iş her adımda otomatik saklanır (localStorage).
import { h, toast, micButton, prepareImage, formatPrice, speak, canListen, ask, icon, withIcon, iconCircle, statusScreen } from "../ui.js";
import { categoryIconName } from "../icons.js";
import { state, LS } from "../store.js";
import { getCategories, categoryOf, priceSuggestion, publishProduct, askAssistant, track } from "../api.js";
import { pageTitle, categoryTiles } from "../components.js";
import { navigate, requireAuth } from "../router.js";
import { assistantEvent } from "../assistant.js";

const MAX_PHOTOS = 4;

const newDraft = () => ({
  step: 1, photos: [], transcript: "", title: "", description: "", category: null,
  price: null, delivery: null, suggestion: null, startedAt: Date.now(), updatedAt: Date.now(),
});

export default async function render(root) {
  let draft = LS.get("draft") || newDraft();
  let stream = null;
  const categories = await getCategories();
  const body = h("div", { class: "stack" });
  const stepsEl = h("div", { class: "steps", "aria-label": "Adımlar" });

  if (!LS.get("draft")) track("listing_started");

  const save = () => { draft.updatedAt = Date.now(); LS.set("draft", draft); };
  const stopCamera = () => { stream?.getTracks().forEach((t) => t.stop()); stream = null; };

  root.append(pageTitle("Satışa çıkar"), stepsEl, body);

  function go(step) {
    stopCamera();
    draft.step = step;
    save();
    track("listing_step", { step });
    draw();
    window.scrollTo(0, 0);
  }

  function drawSteps() {
    const labels = ["Fotoğraf", "Anlat", "Fiyat"];
    stepsEl.replaceChildren(...labels.map((l, i) => {
      const n = i + 1;
      const cls = draft.step === n ? "active" : draft.step > n ? "done" : "";
      return h("div", { class: `step ${cls}`, "aria-current": draft.step === n ? "step" : null },
        h("span", { class: "bar" }),
        h("span", { class: "label" }, h("span", { class: "n" }, draft.step > n ? icon("check") : n), l));
    }));
  }

  const laterBtn = () => h("button", { class: "btn btn-ghost", onclick: () => {
    save(); stopCamera(); toast("Sakladım. Kaldığınız yerden devam edersiniz."); navigate("/");
  } }, "Sonra devam ederim");

  const backBtn = (to) => h("button", { class: "btn btn-secondary", onclick: () => go(to) }, withIcon("chevron-left", "Geri"));

  // ---------------- 1. Fotoğraf ----------------
  async function stepPhoto(forceCamera = false) {
    body.replaceChildren();
    if (draft.photos.length && !forceCamera) {
      const last = draft.photos.at(-1);
      body.append(
        h("div", { class: "camera" }, h("img", { src: last, alt: "Çektiğiniz fotoğraf" })),
        h("p", { class: "center" }, "Işığını biraz düzelttim. Beğendiniz mi?"),
        h("button", { class: "btn btn-success btn-xl", onclick: () => go(2) }, withIcon("check", "Güzel olmuş")),
        h("button", { class: "btn btn-secondary", onclick: () => { draft.photos.pop(); save(); stepPhoto(true); } }, withIcon("refresh", "Tekrar çek")),
        draft.photos.length < MAX_PHOTOS
          ? h("button", { class: "btn btn-secondary", onclick: () => stepPhoto(true) }, withIcon("plus", `Bir fotoğraf daha (${draft.photos.length}/${MAX_PHOTOS})`))
          : null,
        draft.photos.length > 1 ? h("div", { class: "thumbs" }, draft.photos.map((p, i) => h("img", { src: p, alt: `Fotoğraf ${i + 1}` }))) : null,
        laterBtn(),
      );
      return;
    }

    const fileInput = h("input", { type: "file", accept: "image/*", capture: "environment", hidden: true, onchange: async (e) => {
      const f = e.target.files?.[0];
      if (f) addPhoto(await prepareImage(f));
    } });
    const galleryInput = h("input", { type: "file", accept: "image/*", hidden: true, onchange: async (e) => {
      const f = e.target.files?.[0];
      if (f) addPhoto(await prepareImage(f));
    } });

    const cam = h("div", { class: "camera" });
    body.append(cam, fileInput, galleryInput);

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1600 } }, audio: false });
      const video = h("video", { autoplay: true, playsinline: true, muted: true });
      video.srcObject = stream;
      cam.append(video, h("div", { class: "frame" }), h("div", { class: "hint" }, "Ürünü bu kutunun içine koyun, pencere kenarında çekin"));
      body.append(
        h("button", { class: "shutter", "aria-label": "Fotoğraf çek", onclick: async () => {
          const c = Object.assign(document.createElement("canvas"), { width: video.videoWidth, height: video.videoHeight });
          // Kesik çizgili karenin içini kırp (kare, %76)
          const side = Math.min(c.width, c.height) * 0.76;
          const sx = (c.width - side) / 2, sy = (c.height - side) / 2;
          const out = Object.assign(document.createElement("canvas"), { width: side, height: side });
          out.getContext("2d").drawImage(video, sx, sy, side, side, 0, 0, side, side);
          stopCamera();
          addPhoto(await prepareImage(out.toDataURL("image/jpeg", 0.92)));
        } }),
        h("button", { class: "btn btn-secondary", onclick: () => galleryInput.click() }, withIcon("image", "Galeriden seç")),
      );
    } catch {
      // Kamera izni yoksa telefonun kendi kamerası açılır.
      cam.append(h("div", { class: "placeholder" }, icon("camera")), h("div", { class: "frame" }), h("div", { class: "hint" }, "Ürününüzü pencere kenarında, gün ışığında çekin"));
      body.append(
        h("button", { class: "btn btn-primary btn-xl", onclick: () => fileInput.click() }, withIcon("camera", "Fotoğraf çek")),
        h("button", { class: "btn btn-secondary", onclick: () => galleryInput.click() }, withIcon("image", "Galeriden seç")),
      );
    }
    if (draft.photos.length) body.append(h("button", { class: "btn btn-ghost", onclick: () => stepPhoto(false) }, "Vazgeç"));
    body.append(laterBtn());
  }

  function addPhoto(dataUrl) {
    draft.photos = [...draft.photos, dataUrl].slice(0, MAX_PHOTOS);
    try { save(); } catch { toast("Telefonun hafızası doldu; fotoğraf saklanamadı."); }
    stepPhoto(false);
  }

  // ---------------- 2. Anlat ----------------
  function stepDescribe(editing = false) {
    body.replaceChildren();
    if (draft.title && !editing) {
      // "Şöyle yazdım: ... Doğru mu?"
      body.append(
        h("div", { class: "card" },
          h("div", { class: "eyebrow" }, "Şöyle yazdım"),
          h("h2", {}, draft.title),
          draft.description ? h("p", { class: "muted" }, draft.description) : null,
          h("span", { class: "chip chip-brand" }, icon(categoryIconName(draft.category)), categoryOf(draft.category).name),
        ),
        h("p", { class: "center muted" }, "Doğru mu?"),
        h("button", { class: "btn btn-success btn-xl", onclick: () => go(3) }, withIcon("check", "Tamam")),
        h("button", { class: "btn btn-secondary", onclick: () => stepDescribe(true) }, withIcon("pencil", "Düzelteyim")),
        backBtn(1), laterBtn(),
      );
      speak(`Şöyle yazdım: ${draft.title}. Doğru mu?`);
      return;
    }

    if (editing) {
      const title = h("input", { class: "input", id: "f-title", value: draft.title, maxlength: 120 });
      const desc = h("textarea", { class: "input", id: "f-desc", maxlength: 2000 }, draft.description || "");
      let cat = draft.category;
      const tilesWrap = h("div");
      const drawTiles = () => tilesWrap.replaceChildren(categoryTiles(categories, { selected: cat, onSelect: (c) => { cat = c.slug; drawTiles(); } }));
      drawTiles();
      body.append(
        h("div", {}, h("label", { for: "f-title" }, "Ürünün adı"), h("div", { class: "input-row" }, title, micButton({ size: "sm", onText: (t) => (title.value = t) }))),
        h("div", {}, h("label", { for: "f-desc" }, "Anlatım"), desc, h("div", { class: "row", style: { marginTop: "8px" } }, micButton({ size: "sm", onText: (t) => (desc.value = t) }))),
        h("div", {}, h("label", {}, "Ne sattığınız"), tilesWrap),
        h("button", { class: "btn btn-success btn-xl", onclick: () => {
          if (title.value.trim().length < 2) return toast("Ürününüze bir ad verelim.");
          if (!cat) return toast("Ne sattığınızı seçin.");
          Object.assign(draft, { title: title.value.trim(), description: desc.value.trim(), category: cat });
          go(3);
        } }, "Tamam"),
        backBtn(1), laterBtn(),
      );
      return;
    }

    const live = h("p", { class: "card muted", style: { minHeight: "80px" }, "aria-live": "polite" }, draft.transcript || "Söyledikleriniz burada yazılacak.");
    const status = h("p", { class: "center muted" }, canListen ? "Basılı tutun ve konuşun. Bitince bırakın." : "Bu telefonda sesle yazma yok; klavyeyle yazabilirsiniz.");
    body.append(
      h("h2", { class: "center" }, "Ürününüzü anlatın, ben yazayım"),
      h("p", { class: "center muted" }, "Bir komşunuza anlatır gibi: \"Bu ev yapımı vişne reçeli, şekeri az, kavanozu 400 gram.\""),
      canListen ? micButton({
        label: "Ürününüzü anlatmak için basılı tutun",
        onText: (t) => { live.textContent = t; },
        onEnd: (t) => { if (t) understand(t); },
      }) : null,
      status, live,
      h("button", { class: "btn btn-secondary", onclick: () => typeInstead() }, withIcon("keyboard", "Klavyeyle yazacağım")),
      backBtn(1), laterBtn(),
    );
    speak("Ürününüzü bana anlatın, ben yazayım.");
  }

  function typeInstead() {
    const ta = h("textarea", { class: "input", placeholder: "Ürününüzü birkaç cümleyle anlatın", "aria-label": "Ürününüzü anlatın" }, draft.transcript || "");
    body.replaceChildren(
      h("h2", {}, "Ürününüzü anlatın"),
      ta,
      h("button", { class: "btn btn-primary btn-xl", onclick: () => ta.value.trim() && understand(ta.value.trim()) }, "Devam"),
      h("button", { class: "btn btn-ghost", onclick: () => stepDescribe() }, withIcon("mic", "Sesle anlatayım")),
    );
    ta.focus();
  }

  async function understand(transcript) {
    draft.transcript = transcript;
    save();
    body.replaceChildren(statusScreen("sparkles", "Yazıyorum…"));
    const ai = await askAssistant({ mode: "describe", transcript });
    const out = ai?.title ? ai : localDescribe(transcript);
    Object.assign(draft, { title: out.title, description: out.description, category: out.category });
    save();
    stepDescribe();
  }

  // ---------------- 3. Fiyat ve teslim ----------------
  async function stepPrice() {
    body.replaceChildren();
    const sugText = h("p", {}, "Benzer ürünlere bakıyorum…");
    const sugBox = h("div", { class: "tip", "aria-live": "polite" }, icon("sparkles"), sugText);
    const out = h("output", { "aria-live": "polite" });
    const stepOf = (p) => (p >= 100 ? 10 : 5);
    const setPrice = (p) => { draft.price = Math.max(0, Math.round(p)); out.textContent = formatPrice(draft.price); save(); };

    body.append(
      sugBox,
      h("label", { class: "center" }, "Kaç lira istersiniz?"),
      h("div", { class: "price-picker" },
        h("button", { "aria-label": "Fiyatı azalt", onclick: () => setPrice((draft.price || 0) - stepOf(draft.price || 0)) }, icon("minus")),
        out,
        h("button", { "aria-label": "Fiyatı artır", onclick: () => setPrice((draft.price || 0) + stepOf(draft.price || 0)) }, icon("plus")),
      ),
      h("button", { class: "btn btn-ghost", onclick: async () => {
        const v = prompt("Fiyatı yazın (TL):", draft.price ?? "");
        if (v != null && !Number.isNaN(Number(v.replace(",", ".")))) setPrice(Number(v.replace(",", ".")));
      } }, "Fiyatı kendim yazayım"),
      h("h3", { class: "center" }, "Alıcıya nasıl ulaştıracaksınız?"),
      deliveryButtons(),
      h("button", { class: "btn btn-success btn-xl", onclick: publish }, withIcon("arrow-right", "Satışa çıkar")),
      backBtn(2), laterBtn(),
    );

    const s = draft.suggestion || (await priceSuggestion(draft.category, draft.title));
    if (s) {
      draft.suggestion = s;
      sugText.textContent = `Benzer ürünler ${formatPrice(s.low)} ile ${formatPrice(s.high)} arası satılıyor. Karar sizin.`;
      if (draft.price == null) setPrice(Math.round((Number(s.low) + Number(s.high)) / 2 / 10) * 10);
    } else {
      sugText.textContent = "Mahallenizde benzer ürün henüz yok. Emeğinize uygun bir fiyat seçin.";
    }
    if (draft.price == null) setPrice(100);
    else out.textContent = formatPrice(draft.price);
    speak(sugText.textContent);
  }

  function deliveryButtons() {
    const opts = [["elden", "users", "Elden teslim"], ["kargo", "package", "Kargo"], ["ikisi", "repeat", "İkisi de"]];
    const wrap = h("div", { class: "stack", role: "radiogroup", "aria-label": "Teslim şekli" });
    const draw = () => wrap.replaceChildren(...opts.map(([v, ico, label]) => h("button", {
      class: "btn btn-secondary btn-choice", role: "radio", "aria-checked": String(draft.delivery === v), "aria-pressed": String(draft.delivery === v),
      onclick: () => { draft.delivery = v; save(); draw(); },
    }, withIcon(ico, label))));
    draw();
    return wrap;
  }

  async function publish() {
    if (!draft.photos.length) return go(1);
    if (!draft.title || !draft.category) return go(2);
    if (!draft.delivery) return toast("Teslim şeklini seçin.");
    if (!draft.price && !(await ask("Ücretsiz mi vereceksiniz?", "Fiyatı 0 TL seçtiniz.", "Evet, ücretsiz", "Fiyat seçeyim"))) return;
    draft.publishAfterLogin = Date.now();
    save();
    if (!requireAuth("/sat")) return; // giriş sonrası buraya dönülür ve otomatik yayınlanır
    if (!state.location?.neighborhood && !state.profile?.neighborhood) {
      toast("Önce mahallenizi seçelim.");
      const { pickLocation } = await import("../components.js");
      if (!(await pickLocation())) return;
    }

    body.replaceChildren(statusScreen("refresh", "Vitrine koyuyorum…", { spin: true }));
    try {
      const product = await publishProduct(draft);
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
    stepsEl.replaceChildren();
    const first = !LS.get("published_before");
    LS.set("published_before", true);
    body.replaceChildren(
      h("div", { class: "celebrate" },
        iconCircle("check", "ok"),
        h("h1", {}, first ? "Tebrikler! İlk ürününüz vitrinde." : "Tebrikler! Ürününüz vitrinde."),
        h("p", { class: "muted" }, "Mahallenizdeki komşularınız artık görebilir."),
      ),
      h("a", { class: "btn btn-primary btn-xl", href: `#/urun/${product.id}` }, "Ürünümü gör"),
      h("button", { class: "btn btn-secondary", onclick: () => { draft = newDraft(); save(); track("listing_started"); draw(); } }, "Bir ürün daha koy"),
    );
    speak(first ? "Tebrikler! İlk ürününüz vitrinde." : "Tebrikler! Ürününüz vitrinde.");
    assistantEvent("product_published", product);
  }

  function draw() {
    drawSteps();
    if (draft.step === 1) stepPhoto();
    else if (draft.step === 2) stepDescribe();
    else stepPrice();
  }

  // Girişten dönüldüyse kaldığı yerden otomatik yayınla.
  // (Yalnızca son 30 dakika içinde "Satışa çıkar"a basıldıysa.)
  if (draft.publishAfterLogin && Date.now() - draft.publishAfterLogin < 30 * 60e3 && state.user) {
    drawSteps();
    publish();
  } else {
    draw();
  }

  return stopCamera;
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
