// Yakınımda — katalog düzeni: solda filtreler (konum, kategori, mesafe), sağda ürün ızgarası.
// Varsayılan görünüm liste ("en yakından uzağa"); harita isteğe bağlı.
import { h, loading, loadingGrid, emptyState, micButton, toast, icon, withIcon } from "../ui.js";
import { state } from "../store.js";
import { getCategories, nearbyProducts, RADIUS, logSearchRequest, track, photoUrl } from "../api.js";
import { productGrid, askLocation, pickLocation, breadcrumb } from "../components.js";
import { navigate } from "../router.js";
import { iconSVG, categoryIconName } from "../icons.js";

const RADIUS_LABELS = [["mahallem", "Mahallem", "2 km"], ["ilcem", "İlçem", "10 km"], ["sehrim", "Şehrim", "40 km"]];

export default async function render(root, { query }) {
  let category = query.kategori || null;
  let radiusKey = query.mesafe || "ilcem";
  let search = query.q || "";
  let showMap = false;
  let map = null;
  let rows = [];

  const headerSearch = document.getElementById("q");
  if (headerSearch) headerSearch.value = search;

  const titleEl = h("h1", {});
  const countEl = h("span", { class: "result-count" });
  const crumbs = h("div");
  const filtersEl = h("aside", { class: "filters", "aria-label": "Filtreler" });
  const resultsEl = h("div");
  const mapEl = h("div", { class: "map", hidden: true });
  const viewToggle = h("button", { class: "btn btn-secondary btn-inline", "data-highlight": "haritada-gor", onclick: toggleMap });

  root.append(
    crumbs,
    h("div", { class: "catalog-head" },
      h("div", {}, titleEl, countEl),
      viewToggle,
    ),
    h("div", { class: "catalog" },
      filtersEl,
      h("section", { "aria-label": "Ürünler" }, mapEl, resultsEl),
    ),
  );

  if (!state.location?.lat) {
    const loc = await askLocation();
    if (!loc) {
      titleEl.textContent = "Yakınımdaki ürünler";
      resultsEl.replaceChildren(h("div", { class: "card" }, emptyState("map-pin", "Konum seçilmedi", "Size en yakın ürünleri göstermemiz için mahallenizi seçin.",
        h("button", { class: "btn btn-primary", onclick: () => navigate("/yakinimda", { replace: true }) }, "Konum seç"))));
      return;
    }
  }

  const categories = await getCategories();

  function renderHead() {
    const cat = categories.find((c) => c.slug === category);
    titleEl.textContent = search ? `"${search}" için sonuçlar` : cat ? cat.name : "Yakınımdaki ürünler";
    crumbs.replaceChildren(breadcrumb(["Ana sayfa", "#/"], ["Yakınımda", cat || search ? "#/yakinimda" : null], ...(cat ? [[cat.name]] : search ? [[search]] : [])));
    viewToggle.replaceChildren(...withIcon(showMap ? "list" : "map", showMap ? "Liste" : "Haritada gör"));
  }

  function renderFilters() {
    const l = state.location;
    const filterBtn = (pressed, onclick, ...children) =>
      h("button", { type: "button", "aria-pressed": String(pressed), onclick }, ...children);

    filtersEl.replaceChildren(...[
      h("div", { class: "card", style: { padding: "12px 14px" } },
        h("div", { class: "eyebrow" }, "Konumunuz"),
        h("div", { class: "row", style: { gap: "8px" } },
          h("span", { class: "row", style: { gap: "6px", flex: "1" } }, icon("map-pin", 18), h("strong", {}, [l.neighborhood, l.district].filter(Boolean).join(", ") || "Konumunuz")),
          h("button", { class: "btn btn-ghost btn-inline", onclick: async () => { if (await askLocation()) { renderFilters(); load(); } } }, "Yenile"),
        ),
        h("button", { class: "btn btn-ghost btn-inline small", style: { padding: "0", minHeight: "40px" }, onclick: async () => { if (await pickLocation()) { renderFilters(); load(); } } }, "Mahalleyi listeden seç"),
      ),
      search ? h("div", { class: "card row", style: { padding: "8px 8px 8px 14px" } },
        h("span", { class: "row", style: { gap: "8px", flex: "1" } }, icon("search", 18), h("span", {}, search)),
        h("button", { class: "btn btn-ghost btn-inline", onclick: () => { search = ""; if (headerSearch) headerSearch.value = ""; renderHead(); renderFilters(); load(); } }, "Temizle"),
      ) : null,
      h("div", { class: "filter-group" },
        h("h3", {}, "Kategori"),
        h("div", { class: "filter-list" },
          filterBtn(!category, () => { category = null; update(); }, icon("bag"), "Tümü"),
          ...categories.map((c) => filterBtn(category === c.slug, () => { category = c.slug; update(); }, icon(categoryIconName(c.slug)), c.name)),
        ),
      ),
      h("div", { class: "filter-group" },
        h("h3", {}, "Ne kadar uzağa?"),
        h("div", { class: "filter-list filter-list-3" },
          ...RADIUS_LABELS.map(([key, label, km]) => filterBtn(radiusKey === key, () => { radiusKey = key; update(); },
            h("span", { style: { flex: "1" } }, label), h("span", { class: "small muted" }, km))),
        ),
      ),
    ].filter(Boolean));
  }

  function update() { renderHead(); renderFilters(); load(); }

  async function load() {
    resultsEl.replaceChildren(loadingGrid(9));
    const { lat, lng } = state.location;
    rows = await nearbyProducts({ lat, lng, radiusKm: RADIUS[radiusKey], category, limit: 100 }).catch(() => []);
    if (search) {
      const words = search.toLocaleLowerCase("tr-TR").split(/\s+/).filter((w) => w.length > 2);
      rows = rows.filter((r) => words.some((w) => r.title.toLocaleLowerCase("tr-TR").includes(w.slice(0, Math.max(3, w.length - 2)))));
    }
    countEl.textContent = rows.length ? `${rows.length} ürün · en yakından uzağa` : "";
    if (!rows.length) {
      track("search_no_result", { category, radius: radiusKey, q: search || null });
      resultsEl.replaceChildren(notFound());
    } else {
      resultsEl.replaceChildren(productGrid(rows, { cols4: false }));
    }
    if (showMap) drawMap();
  }

  // Bulunamayan aramalar "Mahallende Aranıyor" panosuna gider.
  function notFound() {
    const input = h("input", { class: "input", placeholder: "Ne arıyordunuz?", value: search, "aria-label": "Ne arıyordunuz?" });
    const submit = async () => {
      const q = input.value.trim();
      if (!q) return;
      await logSearchRequest(q, category);
      toast("Not aldık. Mahallenizdeki üreticilere haber vereceğiz.");
    };
    return h("div", { class: "card stack" },
      emptyState("search", "Yakınınızda bulamadık", "Ne aradığınızı söyleyin; mahallenizdeki üreticilere haber verelim."),
      h("div", { class: "input-row" }, input, micButton({ size: "sm", onText: (t) => (input.value = t) })),
      h("button", { class: "btn btn-primary", onclick: submit }, "Haber ver"),
      radiusKey !== "sehrim" ? h("button", { class: "btn btn-secondary", onclick: () => { radiusKey = "sehrim"; update(); } }, "Daha uzağa bak") : null,
    );
  }

  function toggleMap() {
    showMap = !showMap;
    mapEl.hidden = !showMap;
    resultsEl.hidden = showMap;
    renderHead();
    if (showMap) drawMap();
  }

  async function drawMap() {
    const L = await loadLeaflet();
    const { lat, lng } = state.location;
    if (!map) {
      map = L.map(mapEl, { zoomControl: true }).setView([lat, lng], radiusKey === "mahallem" ? 14 : radiusKey === "ilcem" ? 12 : 10);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "© OpenStreetMap" }).addTo(map);
    }
    map.eachLayer((layer) => layer instanceof L.Circle && map.removeLayer(layer));
    // Gizlilik: tam nokta yok — mahalle büyüklüğünde (~500 m) yumuşak daire.
    for (const r of rows) {
      const c = L.circle([r.approx_lat, r.approx_lng], { radius: 500, color: "#B9455A", weight: 1, fillColor: "#B9455A", fillOpacity: 0.15 }).addTo(map);
      const img = photoUrl(r.photos?.[0]);
      c.bindPopup(`<a href="#/urun/${r.id}" style="display:block;text-align:center;font:inherit">
        ${img ? `<img src="${img}" alt="" style="width:120px;height:90px;object-fit:cover;border-radius:8px">` : iconSVG(categoryIconName(r.category), 32)}
        <strong>${r.title.replace(/</g, "&lt;")}</strong><br>${Number(r.price).toLocaleString("tr-TR")} TL</a>`);
    }
    setTimeout(() => map.invalidateSize(), 50);
  }

  renderHead();
  renderFilters();
  await load();
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
