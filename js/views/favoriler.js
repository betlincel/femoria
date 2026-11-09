// Favorilerim — kullanıcının kalple işaretlediği ürünler (en son eklenen önce).
import { h, loading, emptyState } from "../ui.js";
import { productGrid, breadcrumb } from "../components.js";
import { listFavoriteProducts, isFavorite, loadFavorites } from "../favorites.js";
import { requireAuth } from "../router.js";

export default async function render(root) {
  if (!requireAuth("/favoriler")) return;
  const countEl = h("span", { class: "result-count" });
  const list = h("div", {}, loading());
  root.append(
    breadcrumb(["Ana sayfa", "#/"], ["Favorilerim"]),
    h("div", { class: "catalog-head" }, h("div", {}, h("h1", {}, "Favorilerim"), countEl)),
    list,
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
  const onFav = () => draw();
  window.addEventListener("femoria:fav", onFav);
  return () => window.removeEventListener("femoria:fav", onFav);
}
