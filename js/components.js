// Ekranlar arasında paylaşılan bileşenler.
import { h, formatPrice, formatDistance, toast, sheet, icon, withIcon } from "./ui.js";
import { categoryIconName } from "./icons.js";
import { photoUrl, getLocations } from "./api.js";
import { state, hasLocationConsent, recordLocationConsent } from "./store.js";
import { LOCATION_SUMMARY } from "./kvkk.js";
import { isFavorite, toggleFavorite } from "./favorites.js";
import { requireAuth } from "./router.js";
import { loadProvinces, loadNeighbourhoods, normalizeTr, locateSelection, nearestProvince } from "./tr-locations.js";

export function pageTitle(text, { back } = {}) {
  return h("div", { class: "page-title" },
    back ? h("button", { class: "back-btn", "aria-label": "Geri", onclick: () => (typeof back === "function" ? back() : history.back()) }, icon("chevron-left")) : null,
    h("h1", {}, text),
  );
}

export function productPhoto(product, cls = "ph") {
  const url = photoUrl(product.photos?.[0]);
  return url
    ? h("img", { class: cls, src: url, alt: product.title, loading: "lazy" })
    : h("div", { class: cls, "aria-hidden": "true" }, icon(categoryIconName(product.category)));
}

// ---------- Favori (kalp) düğmesi ----------
function paintFav(btn) {
  const on = isFavorite(btn.dataset.fav);
  btn.classList.toggle("is-fav", on);
  btn.setAttribute("aria-pressed", String(on));
  const label = on ? "Favorilerden çıkar" : "Favorilere ekle";
  btn.setAttribute("aria-label", label);
  btn.title = label;
  const text = btn.querySelector(".fav-text");
  if (text) text.textContent = on ? "Favorilerde" : "Favorilere ekle";
}
window.addEventListener("femoria:fav", () => document.querySelectorAll(".fav-btn").forEach(paintFav));

/** Kalp düğmesi. withText: yanında "Favorilere ekle / Favorilerde" yazar (ürün sayfası). */
export function favButton(productId, { cls = "", withText = false } = {}) {
  const btn = h("button", {
    type: "button", class: `fav-btn ${cls}`, "data-fav": productId,
    onclick: async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!state.user) { toast("Favorilere eklemek için giriş yapın."); requireAuth(location.hash.slice(1) || "/"); return; }
      try {
        const on = await toggleFavorite(productId);
        toast(on ? "Favorilere eklendi." : "Favorilerden çıkarıldı.");
      } catch (err) {
        console.error("[Favoriler]", err);
        toast("Favori kaydedilemedi. Biraz sonra tekrar deneyin.");
      }
    },
  }, icon("heart", withText ? 20 : 18), withText ? h("span", { class: "fav-text" }) : null);
  paintFav(btn);
  return btn;
}

export function productCard(p) {
  const url = photoUrl(p.photos?.[0]);
  const own = state.user?.id && state.user.id === p.seller_id;
  return h("div", { class: "pcard" },
    h("a", { class: "pcard-link", href: `#/urun/${p.id}` },
    h("div", { class: "pcard-img" },
      url ? h("img", { src: url, alt: p.title, loading: "lazy" }) : icon(categoryIconName(p.category)),
      p.status === "satildi" ? h("span", { class: "chip pcard-badge" }, "Satıldı") : null,
    ),
    h("div", { class: "pcard-body" },
      h("div", { class: "pcard-title" }, p.title),
      h("div", { class: "pcard-row" },
        h("div", { class: "price" }, formatPrice(p.price)),
        h("span", { class: "pcard-go", "aria-hidden": "true" }, icon("arrow-right", 16))),
      h("div", { class: "meta" }), // ürün listelerinde mahalle gösterilmez (Profil'de durum rozeti buraya eklenir)
    )),
    own ? null : favButton(p.id, { cls: "pcard-fav" }),
  );
}

/** Ürün ızgarası: telefonda 2, tablette 3, masaüstünde 4 sütun */
export const productGrid = (items, { cols4 = true } = {}) =>
  h("div", { class: `pgrid ${cols4 ? "pgrid-4" : ""}` }, items.map(productCard));

export function breadcrumb(...parts) {
  const out = [];
  parts.forEach(([label, href], i) => {
    if (i) out.push(icon("chevron-right"));
    out.push(href ? h("a", { href }, label) : h("span", { "aria-current": "page" }, label));
  });
  return h("nav", { class: "breadcrumb", "aria-label": "Konumunuz" }, out);
}

export function categoryTiles(categories, { selected = null, onSelect, hrefFor } = {}) {
  return h("div", { class: "tiles", role: "list" },
    categories.map((c) => {
      const props = {
        class: "tile", role: "listitem", "aria-pressed": String(selected === c.slug),
        "aria-label": c.name,
      };
      if (hrefFor) props.href = hrefFor(c);
      else props.onclick = () => onSelect?.(c);
      return h(hrefFor ? "a" : "button", { ...props, type: hrefFor ? null : "button" },
        h("span", {}, c.name));
    }),
  );
}

export function badgeChips(badges) {
  if (!badges?.length) return null;
  return h("div", { class: "badges" }, badges.map((b) => h("span", { class: "chip chip-ok", title: b.description }, icon("award"), b.name)));
}

// ---------- Konum: cihazdan, izinle ----------
// Akış: (ilk kez) kısa aydınlatma + açık rıza onayı → tarayıcının konum izni → konum alınır →
// mahalle adı bulunur → kaydedilir. İzin verilmezse nasıl açılacağı anlatılır; listeden seçim yedektir.

function nearest(locations, lat, lng) {
  let best = null, bestD = Infinity;
  for (const l of locations) {
    const d = (l.lat - lat) ** 2 + ((l.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestD) { bestD = d; best = l; }
  }
  // ~3 km'den uzaksa bu mahalle listesi kullanıcının bölgesini kapsamıyor demektir
  return best && Math.sqrt(bestD) * 111 < 3 ? best : null;
}

const round3 = (x) => Math.round(x * 1000) / 1000; // ≈ 100 m

/** Yuvarlanmış konumdan mahalle / ilçe / il adı (OpenStreetMap Nominatim). Olmazsa null. */
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&addressdetails=1&accept-language=tr&lat=${round3(lat)}&lon=${round3(lng)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const a = (await res.json()).address || {};
    const clean = (v) => (v ? String(v).replace(/\s+(Mahallesi|Mah\.?)$/i, "").trim() : null);
    const out = {
      city: a.province || a.state || a.city || null,
      district: a.town || a.county || a.city_district || a.district || a.municipality || null,
      neighborhood: clean(a.suburb || a.quarter || a.neighbourhood || a.village || a.hamlet),
    };
    return out.city || out.district || out.neighborhood ? out : null;
  } catch {
    return null;
  }
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject({ code: "unsupported" });
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  });
}

/**
 * Konumu cihazdan alır (gerekirse önce aydınlatma + rıza ekranı). Promise<location|null>
 * Kullanım: ürün yayınlama ("Ürün nerede?"). Alınan konum hiçbir yerde saklanmaz; yalnız ürüne yazılır.
 */
/**
 *   Ürün konumu seçilirken false verilir; konum yalnızca o ürüne yazılır.
 * opts.title: liste ekranının başlığı.
 */
export async function askLocation(opts = {}) {
  if (!hasLocationConsent()) {
    const choice = await consentSheet(opts);
    if (!choice) return null;          // vazgeçti
    if (choice !== "gps") return choice; // listeden mahalle seçti (konum nesnesi)
  }
  return captureLocation(opts);
}

/** Kısa aydınlatma + açık rıza onayı. Promise<"gps" | location (listeden) | null> */
function consentSheet(opts = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const check = h("input", { type: "checkbox", id: "loc-consent", style: { width: "22px", height: "22px", flex: "0 0 auto", marginTop: "2px" } });
    const go = h("button", { class: "btn btn-primary btn-xl", disabled: true }, ...withIcon("map-pin", "Konumumu paylaş"));
    check.addEventListener("change", () => (go.disabled = !check.checked));
    const close = sheet("Konumunuzu paylaşır mısınız?", (closeSheet) => {
      go.addEventListener("click", async () => {
        await recordLocationConsent();
        closeSheet(); finish("gps");
      });
      return h("div", { class: "stack" },
        h("p", { class: "muted", style: { margin: 0 } }, "Size en yakın ürünleri gösterebilmemiz için konumunuza ihtiyacımız var. Paylaşmadan önce lütfen okuyun:"),
        h("dl", { class: "consent-list" },
          ...LOCATION_SUMMARY.flatMap(([q, a]) => [h("dt", {}, q), h("dd", {}, a)])),
        h("a", { href: "#/aydinlatma#konum", target: "_blank", rel: "noopener" }, "Aydınlatma metninin tamamını okuyun"),
        h("label", { for: "loc-consent", class: "row consent-check" },
          check,
          h("span", { style: { flex: "1" } }, "Aydınlatma metnini okudum. Konumumun yukarıdaki amaçlarla işlenmesine açık rıza veriyorum."),
        ),
        go,
        h("p", { class: "small muted center", style: { margin: 0 } }, "Düğmeye bastıktan sonra tarayıcınız da izin isteyecek; \"İzin ver\"i seçin."),
        h("button", { class: "btn btn-ghost", onclick: () => {
          done = true; // sayfa kapanınca "vazgeçti" sayılmasın
          closeSheet();
          pickLocation(opts).then((l) => resolve(l || null));
        } },
          "Konum paylaşmadan, mahallemi listeden seçeceğim"),
      );
    });
    // Arka plana dokunup kapatırsa
    const obs = new MutationObserver(() => { if (!document.querySelector(".sheet")) { obs.disconnect(); finish(null); } });
    obs.observe(document.getElementById("sheet-root"), { childList: true });
    void close;
  });
}

/** Tarayıcıdan konumu alır; başarısızsa nedenini anlatır. */
async function captureLocation(opts = {}) {
  const wait = sheet(null, h("div", { class: "status-screen" },
    h("div", { class: "icon-circle", "aria-hidden": "true" }, icon("map-pin")),
    h("p", {}, "Konumunuz alınıyor…"),
    h("p", { class: "small muted" }, "Tarayıcınız izin isterse \"İzin ver\"i seçin."),
  ));
  let pos;
  try {
    pos = await getPosition();
  } catch (err) {
    wait();
    return locationError(err, opts);
  }
  const lat = round3(pos.coords.latitude);
  const lng = round3(pos.coords.longitude);
  const names = (await reverseGeocode(lat, lng))
    || nearest(await getLocations().catch(() => []), lat, lng)
    || await nearestProvince(lat, lng).then((p) => (p ? { city: p.n } : null))
    || {};
  wait();
  const loc = { lat, lng, city: names.city ?? null, district: names.district ?? null, neighborhood: names.neighborhood ?? null, source: "gps" };
  const label = [loc.neighborhood, loc.district].filter(Boolean).join(", ");
  toast(label ? `Konumunuz alındı: ${label}` : "Konumunuz alındı.");
  return loc;
}

/** Konum alınamadığında: izin reddi / kapalı konum / zaman aşımı için yol gösterir. */
function locationError(err, opts = {}) {
  const denied = err?.code === 1;
  const unsupported = err?.code === "unsupported" || !window.isSecureContext;
  return new Promise((resolve) => {
    sheet(denied ? "Konum izni verilmedi" : "Konumunuz alınamadı", (close) => h("div", { class: "stack" },
      denied
        ? h("div", { class: "stack", style: { gap: "6px" } },
            h("p", { style: { margin: 0 } }, "Tarayıcınız konum iznini engellemiş. Açmak için:"),
            h("ol", { style: { margin: 0, paddingLeft: "1.2rem" } },
              h("li", {}, "Adres çubuğunun solundaki kilit (veya ayar) simgesine dokunun."),
              h("li", {}, "\"Konum\" iznini \"İzin ver\" yapın."),
              h("li", {}, "Sayfayı yenileyip tekrar deneyin."),
            ),
            h("p", { class: "small muted", style: { margin: 0 } }, "Telefonda cihazın konum (GPS) özelliğinin de açık olması gerekir."))
        : unsupported
          ? h("p", {}, "Bu tarayıcı konum paylaşmayı desteklemiyor ya da site güvenli bağlantıyla (https) açılmamış.")
          : h("p", {}, "Cihazınızın konum özelliği kapalı olabilir ya da sinyal zayıf. Konumu açıp tekrar deneyin."),
      h("button", { class: "btn btn-primary", onclick: () => { close(); captureLocation(opts).then(resolve); } }, ...withIcon("refresh", "Tekrar dene")),
      h("button", { class: "btn btn-secondary", onclick: () => { close(); pickLocation(opts).then(resolve); } }, ...withIcon("list", "Mahallemi listeden seçeceğim")),
    ));
  });
}

/**
 * İl → ilçe → mahalle listesinden seçim (konum izni vermeyenler için).
 * Türkiye'nin 81 ili, 973 ilçesi ve tüm mahalle/köyleri; her adımda arama kutusu.
 */
export function pickLocation(opts = {}) {
  return new Promise((resolve) => {
    let province = null, district = null, settled = false;
    const body = h("div", { class: "stack pick" });
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    const closeFn = sheet(opts.title || "Konumunuzu seçin", body);
    // Kapatılırsa (dışarı dokunma / Esc) vazgeçti say
    const obs = new MutationObserver(() => { if (!body.isConnected) { obs.disconnect(); done(null); } });
    obs.observe(document.getElementById("sheet-root"), { childList: true });

    const crumbs = () => h("div", { class: "pick-crumbs" },
      h("button", { class: `chip ${!province ? "chip-brand" : ""}`, onclick: () => { province = null; district = null; draw(); } }, province ? province.n : "İl"),
      icon("chevron-right"),
      h("button", { class: `chip ${province && !district ? "chip-brand" : ""}`, disabled: !province, onclick: () => { district = null; draw(); } }, district || "İlçe"),
      icon("chevron-right"),
      h("span", { class: `chip ${district ? "chip-brand" : ""}` }, "Mahalle"),
    );

    /** Arama kutusu + filtrelenen düğme listesi */
    function searchList({ label, placeholder, items, onPick, extra = null, limit = 120 }) {
      const input = h("input", { class: "input", type: "search", placeholder, "aria-label": label, autocomplete: "off", enterkeyhint: "search" });
      const list = h("div", { class: "pick-list", role: "list" });
      const note = h("p", { class: "small muted center", style: { margin: 0 } });
      const render = () => {
        const q = normalizeTr(input.value);
        const found = q ? items.filter((it) => normalizeTr(it).includes(q)) : items;
        list.replaceChildren(...found.slice(0, limit).map((it) => h("button", { class: "btn btn-secondary", role: "listitem", onclick: () => onPick(it) }, it)));
        note.textContent = !found.length ? "Sonuç yok. Yazdığınızı kontrol edin."
          : found.length > limit ? `${found.length} sonuçtan ilk ${limit} tanesi gösteriliyor; daraltmak için yazın.` : "";
      };
      input.addEventListener("input", render);
      render();
      body.replaceChildren(crumbs(), h("label", { class: "sr-only" }, label), input, extra, list, note);
      setTimeout(() => input.focus({ preventScroll: true }), 50);
    }

    async function draw() {
      body.replaceChildren(crumbs(), statusScreenEl("Yükleniyor…"));
      let provinces;
      try { provinces = await loadProvinces(); }
      catch { body.replaceChildren(h("p", { class: "notice" }, icon("alert", 20), "Liste yüklenemedi. İnternet bağlantınızı kontrol edin.")); return; }

      if (!province) {
        return searchList({
          label: "İlinizi arayın", placeholder: "İlinizi yazın (ör. Trabzon)",
          items: provinces.map((p) => p.n),
          onPick: (n) => { province = provinces.find((p) => p.n === n); draw(); },
        });
      }
      if (!district) {
        return searchList({
          label: "İlçenizi arayın", placeholder: "İlçenizi yazın",
          items: province.d,
          onPick: (d) => { district = d; draw(); },
        });
      }
      let hoods = [];
      try { hoods = (await loadNeighbourhoods(province.k))[district] || []; } catch { /* ilçe merkeziyle devam edilebilir */ }
      searchList({
        label: "Mahallenizi arayın", placeholder: "Mahallenizi ya da köyünüzü yazın",
        items: hoods,
        onPick: (n) => finish(n),
        extra: h("button", { class: "btn btn-ghost", onclick: () => finish(null) }, ...withIcon("map-pin", `Mahallemi bulamadım, ${district} merkezini kullan`)),
      });
    }

    async function finish(neighborhood) {
      body.replaceChildren(statusScreenEl("Konumunuz bulunuyor…"));
      const knownLocations = await getLocations().catch(() => []);
      const pos = await locateSelection({ province, district, neighborhood, knownLocations });
      const loc = {
        lat: round3(pos.lat), lng: round3(pos.lng), city: province.n, district,
        neighborhood: neighborhood ? neighborhood.replace(/\s*\(.*\)$/, "") : null,
        precision: pos.precision, source: "liste",
      };
      settled = true;
      obs.disconnect();
      closeFn();
      const label = [loc.neighborhood, district, province.n].filter(Boolean).join(", ");
      toast(pos.precision === "il" ? `Kaydedildi: ${label}. Uzaklıklar ${province.n} merkezine göre yaklaşık hesaplanacak.` : `Kaydedildi: ${label}`, 5000);
      resolve(loc);
    }

    draw();
  });
}

function statusScreenEl(text) {
  return h("div", { class: "status-screen" }, h("div", { class: "icon-circle", "aria-hidden": "true" }, icon("refresh", 34, "spin")), h("p", {}, text));
}

// ---------- Başlıktaki konum düğmesi: "Nerede arıyorsunuz?" ----------
const PLACE_KEY = "femoria:browse_place";
export function getBrowsePlace() {
  try { return JSON.parse(localStorage.getItem(PLACE_KEY)) || {}; } catch { return {}; }
}
export function setBrowsePlace(place) {
  try { localStorage.setItem(PLACE_KEY, JSON.stringify(place || {})); } catch { /* gizli sekme */ }
  window.dispatchEvent(new CustomEvent("femoria:place", { detail: place || {} }));
}
export const placeLabel = (p) => {
  const name = [p?.district, p?.city].filter(Boolean).join(", ");
  if (p?.current) return `Mevcut konum · ${p.district || p.city || ""}`.trim();
  return name || "Tüm Türkiye";
};

/**
 * "Mevcut konumumu kullan": cihaz konumundan il ve ilçe bulunur (konum izni + aydınlatma onayıyla).
 * Konumun kendisi saklanmaz ve sunucuya gönderilmez; yalnızca il / ilçe adı cihazda hatırlanır.
 * Promise<{ city, district, current: true } | { city, district } (listeden seçildiyse) | null>
 */
export async function useCurrentPlace() {
  const loc = await askLocation();
  if (!loc) return null;
  if (!loc.city) {
    toast("Konumunuzdan il bulunamadı. İl ve ilçeyi listeden seçebilirsiniz.");
    return null;
  }
  const place = { city: loc.city, district: loc.district || null, current: loc.source === "gps" };
  setBrowsePlace(place);
  return place;
}

/** İl / ilçe seçtirir. Promise<{ city, district } | {} (Tüm Türkiye) | null (vazgeçti)> */
export function pickBrowsePlace() {
  return new Promise(async (resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    const provinces = await loadProvinces().catch(() => []);
    const cur = getBrowsePlace();
    const ilSel = h("select", { class: "input", id: "pp-il" }, h("option", { value: "" }, "Tüm Türkiye"),
      ...provinces.map((p) => h("option", { value: p.n, selected: p.n === cur.city }, p.n)));
    const ilceSel = h("select", { class: "input", id: "pp-ilce" });
    const fillDistricts = (keep) => {
      const prov = provinces.find((p) => p.n === ilSel.value);
      ilceSel.replaceChildren(h("option", { value: "" }, "Tüm ilçeler"),
        ...(prov ? prov.d.map((d) => h("option", { value: d, selected: d === keep }, d)) : []));
      ilceSel.disabled = !prov;
    };
    fillDistricts(cur.district);
    ilSel.addEventListener("change", () => fillDistricts(null));
    const close = sheet("Nerede arıyorsunuz?", (closeSheet) => h("div", { class: "stack" },
      h("button", { class: "btn btn-secondary btn-xl", onclick: () => {
        settled = true; // pencere kapanınca "vazgeçti" sayılmasın
        closeSheet();
        useCurrentPlace().then(resolve);
      } }, ...withIcon("map-pin", "Mevcut konumumu kullan")),
      h("div", { class: "or-line" }, h("span", {}, "ya da il / ilçe seçin")),
      h("div", {}, h("label", { for: "pp-il" }, "İl"), ilSel),
      h("div", {}, h("label", { for: "pp-ilce" }, "İlçe"), ilceSel),
      h("button", { class: "btn btn-primary btn-xl", onclick: () => {
        const place = ilSel.value ? { city: ilSel.value, district: ilceSel.value || null } : {};
        setBrowsePlace(place); closeSheet(); done(place);
      } }, ...withIcon("bag", "Ürünleri göster")),
      h("button", { class: "btn btn-ghost", onclick: () => { setBrowsePlace({}); closeSheet(); done({}); } }, "Tüm Türkiye'yi göster"),
    ));
    const obs = new MutationObserver(() => { if (!document.getElementById("pp-il")) { obs.disconnect(); done(null); } });
    obs.observe(document.getElementById("sheet-root"), { childList: true });
    void close;
  });
}
