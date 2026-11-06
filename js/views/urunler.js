// Tüm ürünler — konum sormadan bütün ürünleri gösterir (en yeniden eskiye).
// Belirli bir yere bakmak için yandaki panelden İl → İlçe seçilir ya da "Mevcut konumumu kullan" denir
// (cihaz konumundan il/ilçe bulunur; konumun kendisi saklanmaz). Kategori ve arama da süzer.
// Seçimler adres çubuğuna yazılır (#/urunler?il=…&ilce=…&konum=mevcut&kategori=…&q=…), paylaşılabilir.
import { h, loading, emptyState, micButton, toast, icon, withIcon } from "../ui.js";
import { getCategories, listProducts, logSearchRequest, track, photoUrl } from "../api.js";
import { productGrid, breadcrumb, setBrowsePlace, useCurrentPlace } from "../components.js";
import { iconSVG, categoryIconName } from "../icons.js";
import { loadProvinces } from "../tr-locations.js";

const PAGE = 48;

export default async function render(root, { query }) {
  const f = {
    city: query.il || null,
    district: query.ilce || null,
    current: query.konum === "mevcut", // il/ilçe cihaz konumundan bulundu
    category: query.kategori || null,
    q: query.q || "",
  };
  let rows = [];
  let hasMore = false;
  let showMap = false;
  let map = null;
  let loadSeq = 0;

  const headerSearch = document.getElementById("q");
  if (headerSearch) headerSearch.value = f.q;

  const titleEl = h("h1", {});
  const countEl = h("span", { class: "result-count" });
  const crumbs = h("div");
  const filtersEl = h("div", { class: "filters" });
  // Telefonda filtreler katlanır ("Filtrele"), masaüstünde yanda hep açık
  const isDesktop = window.matchMedia("(min-width: 900px)").matches;
  const filterSummary = h("summary", { class: "btn btn-secondary filters-summary" });
  const filtersBox = h("details", { class: "filters-box", open: isDesktop }, filterSummary, filtersEl);
  const filtersAside = h("aside", { "aria-label": "Filtreler" }, filtersBox);
  const resultsEl = h("div");
  const moreEl = h("div", { class: "center section" });
  const mapEl = h("div", { class: "map", hidden: true });
  const viewToggle = h("button", { class: "btn btn-secondary btn-inline", "data-highlight": "haritada-gor", onclick: toggleMap });

  root.append(
    crumbs,
    h("div", { class: "catalog-head" }, h("div", {}, titleEl, countEl), viewToggle),
    h("div", { class: "catalog" }, filtersAside, h("section", { "aria-label": "Ürünler" }, mapEl, resultsEl, moreEl)),
  );

  const [categories, provinces] = await Promise.all([getCategories(), loadProvinces().catch(() => [])]);

  // ---------- Adres çubuğu ----------
  function syncUrl() {
    const params = new URLSearchParams();
    if (f.city) params.set("il", f.city);
    if (f.district) params.set("ilce", f.district);
    if (f.current && f.city) params.set("konum", "mevcut");
    if (f.category) params.set("kategori", f.category);
    if (f.q) params.set("q", f.q);
    const qs = params.toString();
    history.replaceState(null, "", `#/urunler${qs ? "?" + qs : ""}`);
    setBrowsePlace(f.city ? { city: f.city, district: f.district, current: f.current } : {});
  }

  // ---------- Başlık ----------
  function renderHead() {
    const cat = categories.find((c) => c.slug === f.category);
    const place = [f.district, f.city].filter(Boolean).join(", ") + (f.current && f.city ? " (mevcut konum)" : "");
    titleEl.textContent = f.q ? `"${f.q}" için sonuçlar` : cat ? cat.name : "Tüm ürünler";
    crumbs.replaceChildren(breadcrumb(
      ["Ana sayfa", "#/"],
      ["Ürünler", cat || f.q || place ? "#/urunler" : null],
      ...(cat ? [[cat.name]] : []),
      ...(place ? [[place]] : []),
    ));
    viewToggle.replaceChildren(...withIcon(showMap ? "list" : "map", showMap ? "Liste" : "Haritada gör"));
    const active = [f.current && f.city ? "Mevcut konum" : f.district || f.city, cat?.name].filter(Boolean).join(" · ");
    filterSummary.replaceChildren(icon("settings"), h("span", {}, active ? `Filtrele: ${active}` : "Filtrele (konum, kategori)"));
  }

  // ---------- Filtre paneli ----------
  function select(id, label, options, value, onChange, { disabled = false, all = "Tümü" } = {}) {
    const el = h("select", { class: "input", id, disabled, onchange: (e) => onChange(e.target.value || null) },
      h("option", { value: "" }, all),
      ...options.map((o) => h("option", { value: o, selected: o === value }, o)),
    );
    return h("div", {}, h("label", { for: id, class: "small" }, label), el);
  }

  async function renderFilters() {
    const province = provinces.find((p) => p.n === f.city) || null;
    const btn = (pressed, onclick, ...children) => h("button", { type: "button", "aria-pressed": String(pressed), onclick }, ...children);
    const useCurrent = async () => {
      const place = await useCurrentPlace();
      if (!place) return;
      Object.assign(f, { city: place.city, district: place.district, current: !!place.current });
      update();
    };

    filtersEl.replaceChildren(
      f.q ? h("div", { class: "card row", style: { padding: "8px 8px 8px 14px" } },
        h("span", { class: "row", style: { gap: "8px", flex: "1" } }, icon("search", 18), h("span", {}, f.q)),
        h("button", { class: "btn btn-ghost btn-inline", onclick: () => { f.q = ""; if (headerSearch) headerSearch.value = ""; update(); } }, "Temizle"),
      ) : null,

      h("div", { class: "filter-group card stack", style: { padding: "12px 14px" } },
        h("h3", {}, "Konum"),
        select("f-il", "İl", provinces.map((p) => p.n), f.city,
          (v) => { f.city = v; f.district = null; f.current = false; update(); }, { all: "Tüm Türkiye" }),
        select("f-ilce", "İlçe", province ? province.d : [], f.district,
          (v) => { f.district = v; f.current = false; update(); }, { disabled: !province, all: "Tüm ilçeler" }),
        f.current && f.city
          ? h("div", { class: "current-place", role: "status" }, icon("map-pin", 18), h("span", {}, "Mevcut konum kullanılıyor"))
          : h("button", { class: "btn btn-secondary", onclick: useCurrent }, ...withIcon("map-pin", "Mevcut konumumu kullan")),
        f.city ? h("button", { class: "btn btn-ghost btn-inline", style: { alignSelf: "flex-start" },
          onclick: () => { f.city = f.district = null; f.current = false; update(); } }, ...withIcon("x", "Konumu temizle")) : null,
      ),

      h("div", { class: "filter-group" },
        h("h3", {}, "Kategori"),
        h("div", { class: "filter-list" },
          btn(!f.category, () => { f.category = null; update(); }, icon("bag"), "Tümü"),
          ...categories.map((c) => btn(f.category === c.slug, () => { f.category = c.slug; update(); }, icon(categoryIconName(c.slug)), c.name)),
        ),
      ),
    );
  }

  function update() {
    syncUrl();
    renderHead();
    renderFilters();
    load();
  }

  // ---------- Ürünler ----------
  async function load({ append = false } = {}) {
    const seq = ++loadSeq;
    if (!append) { resultsEl.replaceChildren(loading()); moreEl.replaceChildren(); }
    let res;
    try {
      res = await listProducts({ city: f.city, district: f.district, category: f.category, q: f.q, limit: PAGE, offset: append ? rows.length : 0 });
    } catch {
      if (seq !== loadSeq) return;
      resultsEl.replaceChildren(h("div", { class: "card" }, emptyState("alert", "Ürünler yüklenemedi", "İnternet bağlantınızı kontrol edip tekrar deneyin.",
        h("button", { class: "btn btn-primary", onclick: () => load() }, "Tekrar dene"))));
      return;
    }
    if (seq !== loadSeq) return; // bu arada filtre değişti
    rows = append ? [...rows, ...res.rows] : res.rows;
    hasMore = res.hasMore;

    countEl.textContent = rows.length ? `${rows.length}${hasMore ? "+" : ""} ürün · en yeniler önce` : "";
    if (!rows.length) {
      track("search_no_result", { category: f.category, city: f.city, district: f.district, q: f.q || null });
      resultsEl.replaceChildren(notFound());
    } else {
      resultsEl.replaceChildren(productGrid(rows, { cols4: false }));
    }
    moreEl.replaceChildren(hasMore
      ? h("button", { class: "btn btn-secondary btn-inline", onclick: (e) => { e.currentTarget.disabled = true; load({ append: true }); } }, "Daha fazla göster")
      : "");
    if (showMap) drawMap();
  }

  // Bulunamayan aramalar kaydedilir (hangi ürünlerin arandığını görmek için)
  function notFound() {
    const anyFilter = f.city || f.category || f.q;
    const input = h("input", { class: "input", placeholder: "Ne arıyordunuz?", value: f.q, "aria-label": "Ne arıyordunuz?" });
    return h("div", { class: "card stack" },
      emptyState("search", "Bu seçimde ürün yok",
        anyFilter ? "Filtreleri değiştirebilir ya da ne aradığınızı bize yazabilirsiniz." : "Henüz satışta ürün yok. İlk ürünü siz koyun!"),
      anyFilter ? h("button", { class: "btn btn-secondary", onclick: () => { f.city = f.district = f.category = null; f.current = false; f.q = ""; if (headerSearch) headerSearch.value = ""; update(); } }, "Tüm ürünleri göster") : null,
      h("div", { class: "input-row" }, input, micButton({ size: "sm", onText: (t) => (input.value = t) })),
      h("button", { class: "btn btn-primary", onclick: async () => {
        const q = input.value.trim();
        if (!q) return;
        await logSearchRequest(q, f.category, { city: f.city, district: f.district });
        toast("Not aldık, teşekkürler. Hangi ürünlerin arandığını görmemize yardımcı oluyor.");
      } }, "Gönder"),
    );
  }

  // ---------- Harita (isteğe bağlı) ----------
  function toggleMap() {
    showMap = !showMap;
    mapEl.hidden = !showMap;
    resultsEl.hidden = showMap;
    moreEl.hidden = showMap;
    renderHead();
    if (showMap) drawMap();
  }

  async function drawMap() {
    const L = await loadLeaflet();
    if (!map) {
      map = L.map(mapEl, { zoomControl: true }).setView([39.0, 35.2], 6); // Türkiye
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "© OpenStreetMap" }).addTo(map);
    }
    map.eachLayer((layer) => layer instanceof L.Circle && map.removeLayer(layer));
    const pts = [];
    // Gizlilik: tam nokta yok — mahalle büyüklüğünde (~500 m) yumuşak daire.
    for (const r of rows) {
      if (r.approx_lat == null) continue;
      pts.push([r.approx_lat, r.approx_lng]);
      const c = L.circle([r.approx_lat, r.approx_lng], { radius: 500, color: "#A8401C", weight: 1, fillColor: "#A8401C", fillOpacity: 0.15 }).addTo(map);
      const img = photoUrl(r.photos?.[0]);
      c.bindPopup(`<a href="#/urun/${r.id}" style="display:block;text-align:center;font:inherit">
        ${img ? `<img src="${img}" alt="" style="width:120px;height:90px;object-fit:cover;border-radius:8px">` : iconSVG(categoryIconName(r.category), 32)}
        <strong>${r.title.replace(/</g, "&lt;")}</strong><br>${Number(r.price).toLocaleString("tr-TR")} TL</a>`);
    }
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
    setTimeout(() => map.invalidateSize(), 50);
  }

  update();
  return () => map?.remove();
}

let leafletPromise;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  leafletPromise ??= new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
    document.head.append(css);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.head.append(s);
  });
  return leafletPromise;
}
