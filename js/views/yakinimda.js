// Yakınımda — varsayılan liste ("En yakından uzağa"); harita isteğe bağlı.
import { h, loading, emptyState, micButton, toast, icon, withIcon } from "../ui.js";
import { state } from "../store.js";
import { getCategories, nearbyProducts, RADIUS, logSearchRequest, track, photoUrl } from "../api.js";
import { productCard, categoryTiles, askLocation, pickLocation } from "../components.js";
import { navigate } from "../router.js";
import { iconSVG, categoryIconName } from "../icons.js";

const RADIUS_LABELS = [["mahallem", "Mahallem"], ["ilcem", "İlçem"], ["sehrim", "Şehrim"]];

export default async function render(root, { query }) {
  let category = query.kategori || null;
  let radiusKey = query.mesafe || "ilcem";
  let search = query.q || "";
  let showMap = false;
  let map = null;

  const listEl = h("div", { class: "stack" });
  const filtersEl = h("div", { class: "stack" });
  const locLine = h("div", { class: "loc-line" });
  const mapEl = h("div", { class: "map", hidden: true });
  const mapBtn = h("button", { class: "btn btn-secondary", style: { margin: "12px 0" }, "data-highlight": "haritada-gor", onclick: toggleMap });

  root.append(
    h("h1", {}, "Yakınımda"),
    locLine,
    filtersEl,
    mapBtn,
    mapEl,
    listEl,
  );

  if (!state.location?.lat) {
    const loc = await askLocation();
    if (!loc) {
      listEl.replaceChildren(emptyState("map-pin", "Konum seçilmedi", "Size en yakın ürünleri göstermem için mahallenizi seçin.",
        h("button", { class: "btn btn-primary", onclick: () => navigate("/yakinimda", { replace: true }) }, "Konum seç")));
      return;
    }
  }

  const categories = await getCategories();

  function renderFilters() {
    filtersEl.replaceChildren(...[
      categoryTiles(categories, {
        selected: category,
        onSelect: (c) => { category = category === c.slug ? null : c.slug; renderFilters(); load(); },
      }),
      h("div", { class: "btn-group", role: "group", "aria-label": "Ne kadar uzağa bakılsın?" },
        RADIUS_LABELS.map(([key, label]) => h("button", {
          class: "btn btn-secondary btn-choice", "aria-pressed": String(radiusKey === key),
          onclick: () => { radiusKey = key; renderFilters(); load(); },
        }, label)),
      ),
      search ? h("div", { class: "card row", style: { padding: "8px 8px 8px 16px" } },
        h("span", { class: "row", style: { gap: "8px" } }, icon("search", 20), h("span", {}, `"${search}" için sonuçlar`)),
        h("button", { class: "btn btn-ghost btn-inline", style: { flex: "0 0 auto" }, onclick: () => { search = ""; renderFilters(); load(); } }, "Temizle"),
      ) : null,
    ].filter(Boolean));
    const l = state.location;
    locLine.replaceChildren(
      icon("map-pin", 18),
      h("span", {}, [l.neighborhood, l.district].filter(Boolean).join(", ") || "Konumunuz"),
      h("button", { class: "btn btn-ghost btn-inline", onclick: async () => { if (await pickLocation()) { renderFilters(); load(); } } }, "Değiştir"),
    );
    mapBtn.replaceChildren(...withIcon(showMap ? "list" : "map", showMap ? "Liste olarak gör" : "Haritada gör"));
  }

  let rows = [];
  async function load() {
    listEl.replaceChildren(loading());
    const { lat, lng } = state.location;
    rows = await nearbyProducts({ lat, lng, radiusKm: RADIUS[radiusKey], category, limit: 100 }).catch(() => []);
    if (search) {
      const words = search.toLocaleLowerCase("tr-TR").split(/\s+/).filter((w) => w.length > 2);
      rows = rows.filter((r) => words.some((w) => r.title.toLocaleLowerCase("tr-TR").includes(w.slice(0, Math.max(3, w.length - 2)))));
    }
    if (!rows.length) {
      track("search_no_result", { category, radius: radiusKey, q: search || null });
      listEl.replaceChildren(notFound());
    } else {
      listEl.replaceChildren(...rows.map(productCard));
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
      toast("Not aldım. Mahallenizdeki üreticilere haber vereceğiz.");
    };
    return h("div", { class: "card stack" },
      emptyState("search", "Yakında bulamadım", "Ne aradığınızı söyleyin; mahallenizdeki üreticilere haber verelim."),
      h("div", { class: "input-row" }, input, micButton({ size: "sm", onText: (t) => (input.value = t) })),
      h("button", { class: "btn btn-primary", onclick: submit }, "Haber ver"),
      radiusKey !== "sehrim" ? h("button", { class: "btn btn-secondary", onclick: () => { radiusKey = "sehrim"; renderFilters(); load(); } }, "Daha uzağa bak") : null,
    );
  }

  async function toggleMap() {
    showMap = !showMap;
    mapEl.hidden = !showMap;
    listEl.hidden = showMap;
    renderFilters();
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
      const c = L.circle([r.approx_lat, r.approx_lng], { radius: 500, color: "#A8401C", weight: 1, fillColor: "#A8401C", fillOpacity: 0.15 }).addTo(map);
      const img = photoUrl(r.photos?.[0]);
      c.bindPopup(`<a href="#/urun/${r.id}" style="display:block;text-align:center;font:inherit">
        ${img ? `<img src="${img}" alt="" style="width:120px;height:90px;object-fit:cover;border-radius:8px">` : iconSVG(categoryIconName(r.category), 32)}
        <strong>${r.title.replace(/</g, "&lt;")}</strong><br>${Number(r.price).toLocaleString("tr-TR")} TL</a>`);
    }
    setTimeout(() => map.invalidateSize(), 50);
  }

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
