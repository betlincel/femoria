// Ürünler — konum sormadan bütün ürünleri gösterir. Yandaki panel açılır kapanır bölümlerden oluşur:
//   Kategori (ana + alt kategori, çoklu seçim) · Konum (il / ilçe / mevcut konum) · Fiyat · Teslimat · Satıcı.
// Sağ üstte sıralama (önerilen, en düşük / yüksek fiyat, en yeniler, en çok satan, en favoriler, en çok değerlendirilen).
// Seçilen filtreler etiket olarak listenin üstünde görünür; hepsi adres çubuğuna yazılır, paylaşılabilir:
//   #/urunler?kategori=recel,orgu&il=…&min=…&max=…&teslim=kargo&guvenli=1&puan=4&sirala=ucuz&q=…
import { h, loading, emptyState, micButton, toast, icon, withIcon } from "../ui.js";
import { getCategories, categoryTree, categoryOf, categoryPath, listProducts, hasListing, logSearchRequest, track } from "../api.js";
import { productGrid, breadcrumb, setBrowsePlace, useCurrentPlace } from "../components.js";
import { loadProvinces } from "../tr-locations.js";

const PAGE = 48;

const SORT_LABELS = {
  onerilen: "Önerilen sıralama", ucuz: "En düşük fiyat", pahali: "En yüksek fiyat", yeni: "En yeniler",
  satan: "En çok satan", favori: "En favoriler", degerlendirilen: "En çok değerlendirilen",
};
const PRICE_PRESETS = [["", "100", "100 TL'ye kadar"], ["100", "250", "100 – 250 TL"], ["250", "500", "250 – 500 TL"], ["500", "", "500 TL ve üzeri"]];

export default async function render(root, { query }) {
  let rows = [];
  let hasMore = false;
  let loadSeq = 0;
  const openState = {};            // bölüm adı → açık mı (yeniden çizimde korunur)
  const expanded = new Set();      // açık ana kategoriler (alt türleri görünür)

  const headerSearch = document.getElementById("q");
  if (headerSearch) headerSearch.value = query.q || "";

  const titleEl = h("h1", {});
  const countEl = h("span", { class: "result-count" });
  const crumbs = h("div");
  const chipsEl = h("div", { class: "active-filters", "aria-label": "Seçilen filtreler" });
  const filtersEl = h("div", { class: "filters" });
  // Telefonda filtreler katlanır ("Filtrele"), masaüstünde yanda hep açık
  const isDesktop = window.matchMedia("(min-width: 900px)").matches;
  const filterSummary = h("summary", { class: "btn btn-secondary filters-summary" });
  const filtersBox = h("details", { class: "filters-box", open: isDesktop }, filterSummary, filtersEl);
  const filtersAside = h("aside", { "aria-label": "Filtreler" }, filtersBox);
  const resultsEl = h("div");
  const sortSel = h("select", { class: "input sort-select", "aria-label": "Sırala" });
  const moreEl = h("div", { class: "center section" });

  root.append(
    crumbs,
    h("div", { class: "catalog-head" }, h("div", {}, titleEl, countEl), h("label", { class: "sort-wrap" }, h("span", { class: "small muted" }, "Sırala"), sortSel)),
    h("div", { class: "catalog" }, filtersAside, h("section", { "aria-label": "Ürünler" }, chipsEl, resultsEl, moreEl)),
  );

  const [categories, provinces, listing] = await Promise.all([getCategories(), loadProvinces().catch(() => []), hasListing()]);
  const known = new Set(categories.map((c) => c.slug));
  const sortKeys = listing ? ["onerilen", "ucuz", "pahali", "yeni", "satan", "favori", "degerlendirilen"] : ["yeni", "ucuz", "pahali"];
  const defaultSort = sortKeys[0];

  const legacySort = query.sirala === "begenilen" ? "favori" : query.sirala;
  const f = {
    city: query.il || null,
    district: query.ilce || null,
    current: query.konum === "mevcut", // il/ilçe cihaz konumundan bulundu
    cats: [...new Set(String(query.kategori || "").split(",").filter((s) => known.has(s)))],
    q: query.q || "",
    min: /^\d+$/.test(query.min || "") ? query.min : "",
    max: /^\d+$/.test(query.max || "") ? query.max : "",
    kargo: /(^|,)kargo(,|$)/.test(query.teslim || ""),
    elden: /(^|,)elden(,|$)/.test(query.teslim || ""),
    pay: listing && query.guvenli === "1",
    verified: listing && query.dogrulanmis === "1",
    rating: listing && query.puan === "4" ? 4 : 0,
    sort: sortKeys.includes(legacySort) ? legacySort : defaultSort,
  };
  const delivery = () => (f.kargo && !f.elden ? "kargo" : f.elden && !f.kargo ? "elden" : null);
  sortSel.replaceChildren(...sortKeys.map((k) => h("option", { value: k, selected: f.sort === k }, SORT_LABELS[k])));
  sortSel.addEventListener("change", (e) => { f.sort = e.target.value; update(); });
  // Adresten gelen seçili kategorilerin ana kategorileri açık gelsin
  for (const s of f.cats) expanded.add(categoryOf(s).parent || s);

  // ---------- Adres çubuğu ----------
  function syncUrl() {
    const params = new URLSearchParams();
    if (f.city) params.set("il", f.city);
    if (f.district) params.set("ilce", f.district);
    if (f.current && f.city) params.set("konum", "mevcut");
    if (f.cats.length) params.set("kategori", f.cats.join(","));
    if (f.q) params.set("q", f.q);
    if (f.min) params.set("min", f.min);
    if (f.max) params.set("max", f.max);
    if (delivery()) params.set("teslim", delivery());
    if (f.pay) params.set("guvenli", "1");
    if (f.verified) params.set("dogrulanmis", "1");
    if (f.rating) params.set("puan", String(f.rating));
    if (f.sort !== defaultSort) params.set("sirala", f.sort);
    const qs = params.toString();
    history.replaceState(null, "", `#/urunler${qs ? "?" + qs : ""}`);
    setBrowsePlace(f.city ? { city: f.city, district: f.district, current: f.current } : {});
  }

  // ---------- Başlık, gezinti, seçilen filtre etiketleri ----------
  const placeText = () => [f.district, f.city].filter(Boolean).join(", ") + (f.current && f.city ? " (mevcut konum)" : "");
  const priceText = () => (f.min || f.max ? `${f.min || 0}–${f.max || "∞"} TL` : null);

  function clearAll() {
    Object.assign(f, { city: null, district: null, current: false, cats: [], min: "", max: "", kargo: false, elden: false, pay: false, verified: false, rating: 0 });
  }

  function activeChips() {
    const chips = [];
    for (const s of f.cats) chips.push([categoryOf(s).name, () => { f.cats = f.cats.filter((x) => x !== s); }]);
    if (f.city) chips.push([f.current ? "Mevcut konum" : placeText(), () => { f.city = f.district = null; f.current = false; }]);
    if (priceText()) chips.push([priceText(), () => { f.min = f.max = ""; }]);
    if (f.kargo) chips.push(["Kargo", () => { f.kargo = false; }]);
    if (f.elden) chips.push(["Elden teslim", () => { f.elden = false; }]);
    if (f.pay) chips.push(["Güvenli ödeme", () => { f.pay = false; }]);
    if (f.verified) chips.push(["Doğrulanmış satıcı", () => { f.verified = false; }]);
    if (f.rating) chips.push(["Satıcı puanı 4+", () => { f.rating = 0; }]);
    return chips;
  }

  function renderHead() {
    const single = f.cats.length === 1 ? categoryOf(f.cats[0]) : null;
    titleEl.textContent = f.q ? `"${f.q}" için sonuçlar` : single ? single.name : "Tüm ürünler";
    const path = single ? categoryPath(single.slug) : [];
    crumbs.replaceChildren(breadcrumb(
      ["Ana sayfa", "#/"],
      ["Ürünler", path.length || f.q || f.city ? "#/urunler" : null],
      ...path.map((c, i) => [c.name, i < path.length - 1 ? `#/urunler?kategori=${c.slug}` : null]),
      ...(f.city ? [[placeText()]] : []),
    ));

    const chips = activeChips();
    chipsEl.hidden = !chips.length;
    chipsEl.replaceChildren(...chips.map(([label, remove]) => h("button", { type: "button", class: "fchip", "aria-label": `${label} filtresini kaldır`,
      onclick: () => { remove(); update(); } }, h("span", {}, label), icon("x", 14))),
      chips.length > 1 ? h("button", { type: "button", class: "link-btn", onclick: () => { clearAll(); update(); } }, "Tümünü temizle") : null);

    const labels = chips.map(([l]) => l);
    filterSummary.replaceChildren(icon("settings"), h("span", {}, labels.length ? `Filtrele: ${labels.slice(0, 3).join(" · ")}${labels.length > 3 ? ` +${labels.length - 3}` : ""}` : "Filtrele (kategori, konum, fiyat)"));
    sortSel.value = f.sort;
  }

  // ---------- Filtre paneli ----------
  // Açılır kapanır bölüm (görsellerdeki gibi: başlık + ok, ince çizgiyle ayrılır)
  function section(id, title, body, { open = true, active = false } = {}) {
    if (openState[id] === undefined) openState[id] = open || active;     // seçim varsa bölüm açık gelir
    return h("details", { class: "fsec", open: openState[id], ontoggle: (e) => { openState[id] = e.currentTarget.open; } },
      h("summary", {}, h("span", { class: "fsec-title" }, title, active ? h("span", { class: "fsec-dot", "aria-label": "seçili" }) : null), icon("chevron-down", 18)),
      h("div", { class: "fsec-body" }, body));
  }

  const check = (label, checked, onChange, { indeterminate = false, cls = "" } = {}) => {
    const input = h("input", { type: "checkbox", checked, onchange: (e) => onChange(e.target.checked) });
    input.indeterminate = indeterminate;
    return h("label", { class: `fchk ${cls}` }, input, h("span", {}, label));
  };
  const toggle = (label, hint, checked, onChange) => h("label", { class: "fswitch" },
    h("span", { class: "fswitch-text" }, h("strong", {}, label), hint ? h("small", {}, hint) : null),
    h("span", { class: "switch" }, h("input", { type: "checkbox", checked, role: "switch", "aria-label": label, onchange: (e) => onChange(e.target.checked) }), h("span")));

  // Kategori ağacı: ana kategori seçilirse alt türlerinin hepsi dahil; tek tek alt tür de seçilebilir
  function categoryBody() {
    const tree = categoryTree(categories);
    const toggleGroup = (g, on) => {
      const kids = g.children.map((k) => k.slug);
      f.cats = f.cats.filter((s) => s !== g.slug && !kids.includes(s));
      if (on) { f.cats.push(g.slug); expanded.add(g.slug); }
      update();
    };
    const toggleKid = (g, k, on) => {
      const kids = g.children.map((x) => x.slug);
      let sel = f.cats.includes(g.slug) ? kids : f.cats.filter((s) => kids.includes(s));     // ana kategori seçiliyse hepsi seçili sayılır
      sel = on ? [...new Set([...sel, k.slug])] : sel.filter((s) => s !== k.slug);
      f.cats = f.cats.filter((s) => s !== g.slug && !kids.includes(s));
      f.cats.push(...(sel.length === kids.length ? [g.slug] : sel));                         // hepsi seçildiyse ana kategoriye topla
      update();
    };
    return h("ul", { class: "cat-tree" }, tree.map((g) => {
      const gSel = f.cats.includes(g.slug);
      const kidsSel = g.children.filter((k) => f.cats.includes(k.slug));
      const open = g.children.length > 0 && (expanded.has(g.slug) || gSel || kidsSel.length > 0);
      return h("li", {},
        h("div", { class: "cat-row" },
          check(g.name, gSel, (on) => toggleGroup(g, on), { indeterminate: !gSel && kidsSel.length > 0, cls: "cat-group" }),
          g.children.length ? h("button", { type: "button", class: `cat-caret ${open ? "open" : ""}`, "aria-expanded": String(open), "aria-label": `${g.name} alt kategorileri`,
            onclick: () => { open ? expanded.delete(g.slug) : expanded.add(g.slug); renderFilters(); } }, icon("chevron-down", 16)) : null),
        open ? h("ul", { class: "cat-kids" }, g.children.map((k) => h("li", {}, check(k.name, gSel || f.cats.includes(k.slug), (on) => toggleKid(g, k, on)))) ) : null);
    }));
  }

  function select(id, label, options, value, onChange, { disabled = false, all } = {}) {
    return h("select", { class: "input place-select", id, disabled, "aria-label": label, onchange: (e) => onChange(e.target.value || null) },
      h("option", { value: "" }, all),
      ...options.map((o) => h("option", { value: o, selected: o === value }, o)),
    );
  }

  // Konum: İl / İlçe → mevcut konum
  function locationBody() {
    const usingCurrent = f.current && f.city;
    // Mevcut konum kullanılırken kutular boş görünür; yer, alttaki kutuda yazar
    const city = usingCurrent ? null : f.city;
    const province = provinces.find((p) => p.n === city) || null;
    const clear = () => { f.city = f.district = null; f.current = false; update(); };
    const useCurrent = async () => {
      const place = await useCurrentPlace();
      if (!place) return;
      Object.assign(f, { city: place.city, district: place.district, current: !!place.current });
      update();
    };
    return h("div", { class: "loc-body" },
      select("f-il", "İl", provinces.map((p) => p.n), city,
        (v) => { f.city = v; f.district = null; f.current = false; update(); }, { all: "İl seçin" }),
      select("f-ilce", "İlçe", province ? province.d : [], usingCurrent ? null : f.district,
        (v) => { f.district = v; f.current = false; update(); }, { disabled: !province, all: "İlçe seçin" }),
      h("hr", { class: "loc-sep" }),
      usingCurrent
        ? h("div", { class: "current-place", role: "status" },
            h("span", { class: "cp-icon" }, icon("shield-check", 20)),
            h("span", { class: "cp-text" },
              h("b", {}, "Mevcut konum kullanılıyor"),
              h("span", { class: "cp-place" },
                h("span", {}, [f.district, f.city].filter(Boolean).join(", ")),
                h("button", { type: "button", class: "cp-clear", "aria-label": "Mevcut konumu kaldır", title: "Kaldır", onclick: clear }, icon("x", 16)))))
        : h("button", { type: "button", class: "use-current", onclick: useCurrent }, icon("map-pin", 18), h("span", {}, "Mevcut konumumu kullan")),
      !usingCurrent && f.city
        ? h("button", { type: "button", class: "loc-clear", onclick: clear }, "Konumu temizle")
        : null,
    );
  }

  // Fiyat: hazır aralıklar + en az – en çok (TL)
  function priceBody() {
    let min = f.min, max = f.max;
    const num = (label, val, set) => h("input", { class: "input", inputmode: "numeric", placeholder: label, "aria-label": `${label} fiyat (TL)`, value: val,
      oninput: (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 7); set(e.target.value); },
      onkeydown: (e) => e.key === "Enter" && apply() });
    const apply = () => {
      if (min && max && Number(min) > Number(max)) [min, max] = [max, min];
      f.min = min; f.max = max; update();
    };
    return h("div", { class: "stack", style: { gap: "10px" } },
      h("div", { class: "price-presets" }, PRICE_PRESETS.map(([lo, hi, label]) =>
        check(label, f.min === lo && f.max === hi, (on) => { f.min = on ? lo : ""; f.max = on ? hi : ""; update(); }))),
      h("div", { class: "price-range" }, num("En az", min, (v) => (min = v)), h("span", { "aria-hidden": "true" }, "–"), num("En çok", max, (v) => (max = v)),
        h("button", { type: "button", class: "btn btn-secondary", onclick: apply }, "Uygula")));
  }

  function renderFilters() {
    const scroll = filtersEl.querySelector(".cat-tree")?.scrollTop || 0;
    const kids = [
      f.q ? h("div", { class: "card row", style: { padding: "8px 8px 8px 14px" } },
        h("span", { class: "row", style: { gap: "8px", flex: "1" } }, icon("search", 18), h("span", {}, f.q)),
        h("button", { class: "btn btn-ghost btn-inline", onclick: () => { f.q = ""; if (headerSearch) headerSearch.value = ""; update(); } }, "Temizle"),
      ) : null,
      section("kategori", "Kategori", categoryBody(), { active: f.cats.length > 0 }),
      section("konum", "Konum", locationBody(), { active: !!f.city }),
      section("fiyat", "Fiyat (TL)", priceBody(), { open: false, active: !!(f.min || f.max) }),
      section("teslimat", "Teslimat", h("div", { class: "stack", style: { gap: "4px" } },
        check("Kargo ile gönderilenler", f.kargo, (on) => { f.kargo = on; update(); }),
        check("Elden teslim edilenler", f.elden, (on) => { f.elden = on; update(); })), { open: false, active: f.kargo || f.elden }),
      listing ? section("satici", "Satıcı", h("div", { class: "stack", style: { gap: "2px" } },
        toggle("Güvenli ödeme", "Kartla, iyzico güvencesiyle ödenebilen satıcılar", f.pay, (on) => { f.pay = on; update(); }),
        toggle("Doğrulanmış satıcı", "E-postası ya da telefonu doğrulanmış", f.verified, (on) => { f.verified = on; update(); }),
        toggle("Satıcı puanı 4 ve üzeri", "Alıcıların verdiği ortalama puan", f.rating === 4, (on) => { f.rating = on ? 4 : 0; update(); })),
        { open: false, active: f.pay || f.verified || !!f.rating }) : null,
      activeChips().length ? h("button", { type: "button", class: "btn btn-ghost", onclick: () => { clearAll(); update(); } }, ...withIcon("x", "Tüm filtreleri temizle")) : null,
    ];
    filtersEl.replaceChildren(...kids);
    const tree = filtersEl.querySelector(".cat-tree");
    if (tree) tree.scrollTop = scroll;
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
      res = await listProducts({
        city: f.city, district: f.district, category: f.cats, q: f.q, priceMin: f.min, priceMax: f.max, delivery: delivery(),
        sellerPay: f.pay, sellerVerified: f.verified, minRating: f.rating, sort: f.sort, limit: PAGE, offset: append ? rows.length : 0,
      });
    } catch (e) {
      console.error("[Ürünler]", e);
      if (seq !== loadSeq) return;
      resultsEl.replaceChildren(h("div", { class: "card" }, emptyState("alert", "Ürünler yüklenemedi", "İnternet bağlantınızı kontrol edip tekrar deneyin.",
        h("button", { class: "btn btn-primary", onclick: () => load() }, "Tekrar dene"))));
      return;
    }
    if (seq !== loadSeq) return; // bu arada filtre değişti
    rows = append ? [...rows, ...res.rows] : res.rows;
    hasMore = res.hasMore;

    countEl.textContent = rows.length ? `${rows.length}${hasMore ? "+" : ""} ürün · ${SORT_LABELS[f.sort].toLocaleLowerCase("tr-TR")}` : "";
    if (!rows.length) {
      track("search_no_result", { category: f.cats.join(",") || null, city: f.city, district: f.district, q: f.q || null });
      resultsEl.replaceChildren(notFound());
    } else {
      resultsEl.replaceChildren(productGrid(rows, { cols4: false }));
    }
    moreEl.replaceChildren(hasMore
      ? h("button", { class: "btn btn-secondary btn-inline", onclick: (e) => { e.currentTarget.disabled = true; load({ append: true }); } }, "Daha fazla göster")
      : "");
  }

  // Bulunamayan aramalar kaydedilir (hangi ürünlerin arandığını görmek için)
  function notFound() {
    const anyFilter = activeChips().length || f.q;
    const input = h("input", { class: "input", placeholder: "Ne arıyordunuz?", value: f.q, "aria-label": "Ne arıyordunuz?" });
    return h("div", { class: "card stack" },
      emptyState("search", "Bu seçimde ürün yok",
        anyFilter ? "Filtreleri değiştirebilir ya da ne aradığınızı bize yazabilirsiniz." : "Henüz satışta ürün yok. İlk ürünü siz koyun!"),
      anyFilter ? h("button", { class: "btn btn-secondary", onclick: () => { clearAll(); f.q = ""; f.sort = defaultSort; if (headerSearch) headerSearch.value = ""; update(); } }, "Tüm ürünleri göster") : null,
      h("div", { class: "input-row" }, input, micButton({ size: "sm", onText: (t) => (input.value = t) })),
      h("button", { class: "btn btn-primary", onclick: async () => {
        const q = input.value.trim();
        if (!q) return;
        await logSearchRequest(q, f.cats[0] || null, { city: f.city, district: f.district });
        toast("Not aldık, teşekkürler. Hangi ürünlerin arandığını görmemize yardımcı oluyor.");
      } }, "Gönder"),
    );
  }

  update();
}
