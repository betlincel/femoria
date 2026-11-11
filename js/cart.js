// Sepet — e-ticaret sitelerindeki gibi: ürünü sepete ekle, adedini seç, siparişi gönder.
// Sepet yalnız bu cihazda tutulur (sunucuya gitmez); giriş yapmadan da kullanılabilir.
// "Siparişi gönder" denince her ürün için satıcıyla sohbet açılır ve sipariş kartı oluşur
// (ödeme teslimde; satıcı "Anlaştık" deyince sipariş kesinleşir).
import { LS } from "./store.js";

const KEY = "cart";
const MAX_ITEMS = 30;
export const MAX_QTY = 99;

const read = () => {
  const items = LS.get(KEY, []);
  return Array.isArray(items) ? items.filter((i) => i && i.id) : [];
};
const write = (items) => {
  LS.set(KEY, items.length ? items : null);
  window.dispatchEvent(new CustomEvent("femoria:cart", { detail: { count: countOf(items) } }));
};
const countOf = (items) => items.reduce((n, i) => n + (Number(i.qty) || 1), 0);

export const cartItems = () => read();
export const cartCount = () => countOf(read());
export const inCart = (productId) => read().find((i) => i.id === productId) || null;

/** Ürünün sepette gösterilecek özetini saklar (fiyat, ad, ilk fotoğraf, satıcı, teslim şekli). */
const snapshot = (p) => ({
  id: p.id, title: p.title, price: Number(p.price) || 0, photo: p.photos?.[0] || null,
  category: p.category, seller_id: p.seller_id, delivery: p.delivery || "elden",
  stock: p.stock == null ? null : Number(p.stock),
});
/** Sepete konabilecek en fazla adet (stok biliniyorsa stok kadar) */
export const maxQtyOf = (it) => Math.min(MAX_QTY, it?.stock == null ? MAX_QTY : Math.max(0, it.stock));

/** Sepete ekler; zaten varsa adedini artırır. Yeni adedi döndürür. */
export function addToCart(product, qty = 1) {
  const items = read();
  const found = items.find((i) => i.id === product.id);
  const max = maxQtyOf(snapshot(product));
  if (max < 1) throw Object.assign(new Error("Stokta yok"), { code: "stock" });
  if (found) {
    if ((Number(found.qty) || 1) >= max) throw Object.assign(new Error("Stok sınırı"), { code: "stock", max });
    found.qty = Math.min(max, (Number(found.qty) || 1) + qty);
    Object.assign(found, snapshot(product), { qty: found.qty, choice: found.choice });
  } else {
    if (items.length >= MAX_ITEMS) throw Object.assign(new Error("Sepet dolu"), { code: "full" });
    items.push({ ...snapshot(product), qty: Math.min(max, Math.max(1, qty)), addedAt: Date.now() });
  }
  write(items);
  return (found || items.at(-1)).qty;
}

export function setQty(productId, qty) {
  const items = read();
  const it = items.find((i) => i.id === productId);
  if (!it) return;
  it.qty = Math.min(Math.max(1, maxQtyOf(it)), Math.max(1, Math.round(qty) || 1));
  write(items);
}

/** Satıcı "elden veya kargo" dediyse alıcının seçimi */
export function setDeliveryChoice(productId, choice) {
  const items = read();
  const it = items.find((i) => i.id === productId);
  if (!it) return;
  it.choice = choice;
  write(items);
}

/** Sunucudan gelen güncel ürün bilgisiyle (fiyat, ad, foto) sepetteki özeti tazeler. */
export function refreshItem(product) {
  const items = read();
  const it = items.find((i) => i.id === product.id);
  if (!it) return;
  Object.assign(it, snapshot(product));
  if (it.stock != null && it.stock > 0 && it.qty > it.stock) it.qty = it.stock;
  write(items);
}

export function removeFromCart(productId) {
  write(read().filter((i) => i.id !== productId));
}

export const clearCart = () => write([]);
