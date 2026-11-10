// Favorilerim — kullanıcının kalple işaretlediği ürünler (en son eklenen önce).
import { h, loading, emptyState } from "../ui.js";
import { productGrid, breadcrumb } from "../components.js";
import { listFavoriteProducts, isFavorite, loadFavorites } from "../favorites.js";
import { requireAuth } from "../router.js";
import { myFollowedSellers } from "../api.js";

export default async function render(root) {
  if (!requireAuth("/favoriler")) return;
  const countEl = h("span", { class: "result-count" });
  const list = h("div", {}, loading());
  const followsEl = h("section", { class: "section" });
  root.append(
    breadcrumb(["Ana sayfa", "#/"], ["Favorilerim"]),
    h("div", { class: "catalog-head" }, h("div", {}, h("h1", {}, "Favorilerim"), countEl)),
    list,
    followsEl,
  );

  let items = [];
  const draw = () => {
    // Bu sayfada kalbi kaldırılan ürün listeden düşer
    const shown = items.filter((p) => isFavorite(p.id));
    countEl.textContent = shown.length ? `${shown.length} ürün · en son eklenen önce` : "";
    list.replaceChildren(shown.length
      ? productGrid(shown)
      : h("div", { class: "card" }, emptyState("heart", "Henüz favoriniz yok",
          "Beğendiğiniz ürünlerdeki kalbe dokunun; burada toplansın.",
          h("a", { class: "btn btn-primary", href: "#/urunler" }, "Ürünlere bak"))));
  };

  try {
    await loadFavorites();
    items = await listFavoriteProducts();
    draw();
  } catch (e) {
    console.error("[Favoriler]", e);
    list.replaceChildren(h("div", { class: "card" }, emptyState("alert", "Favoriler yüklenemedi", "İnternet bağlantınızı kontrol edip sayfayı yenileyin.")));
    return;
  }
  // Takip ettiğim satıcılar
  myFollowedSellers().then((sellers) => {
    if (!sellers.length) return;
    followsEl.replaceChildren(
      h("div", { class: "section-title" }, h("h2", {}, "Takip ettiğim satıcılar")),
      h("div", { class: "seller-list" }, sellers.map((s) => h("a", { class: "card card-link seller-chip", href: `#/magaza/${s.id}` },
        h("span", { class: "avatar avatar-sm" }, s.avatar_url ? h("img", { src: s.avatar_url, alt: "" }) : (s.full_name || "?")[0].toLocaleUpperCase("tr-TR")),
        h("span", { class: "seller-chip-text" }, h("strong", {}, s.full_name || "Komşu"), s.bio ? h("span", { class: "small muted" }, s.bio) : null)))));
  }).catch(() => {});

  const onFav = () => draw();
  window.addEventListener("femoria:fav", onFav);
  return () => window.removeEventListener("femoria:fav", onFav);
}
