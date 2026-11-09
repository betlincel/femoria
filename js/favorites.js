// Favoriler — kullanıcının beğendiği ürünler (yalnız kendisi görür).
// Kimlikler bellekte bir kümede tutulur; değişince "femoria:fav" olayı yayılır
// (kartlardaki kalpler ve başlıktaki sayı buna göre güncellenir).
import { supabase, isConfigured } from "./supabase.js";
import { state } from "./store.js";

let ids = new Set();
let loadedFor = null;
let pending = null;

const emit = () => window.dispatchEvent(new CustomEvent("femoria:fav", { detail: { count: ids.size } }));

export const isFavorite = (productId) => ids.has(productId);
export const favoriteCount = () => ids.size;

/** Giriş yapan kullanıcının favori kimliklerini yükler (kullanıcı değişince yeniden). */
export async function loadFavorites({ force = false } = {}) {
  const uid = state.user?.id;
  if (!uid || !isConfigured) {
    if (ids.size || loadedFor) { ids = new Set(); loadedFor = null; emit(); }
    return ids;
  }
  if (!force && loadedFor === uid) return ids;
  pending ??= supabase.from("favorites").select("product_id")
    .then(({ data, error }) => {
      if (error) throw error;
      ids = new Set((data || []).map((r) => r.product_id));
      loadedFor = uid;
      emit();
      return ids;
    })
    .catch((e) => { console.warn("[Favoriler] yüklenemedi:", e); return ids; })
    .finally(() => { pending = null; });
  return pending;
}

/** Favoriye ekler ya da çıkarır. Yeni durumu döndürür (true = favoride). */
export async function toggleFavorite(productId) {
  const uid = state.user?.id;
  if (!uid) throw Object.assign(new Error("Giriş gerekli"), { code: "auth" });
  const was = ids.has(productId);
  // Hemen göster, sunucu reddederse geri al
  was ? ids.delete(productId) : ids.add(productId);
  emit();
  const { error } = was
    ? await supabase.from("favorites").delete().eq("user_id", uid).eq("product_id", productId)
    : await supabase.from("favorites").insert({ product_id: productId });
  if (error && !(error.code === "23505")) { // 23505: zaten favoride
    was ? ids.add(productId) : ids.delete(productId);
    emit();
    throw error;
  }
  return !was;
}

/** Favori ürünler (en son eklenen önce). Satıştan kalkmış/silinmiş ürünler listelenmez. */
export async function listFavoriteProducts() {
  if (!state.user || !isConfigured) return [];
  const { data, error } = await supabase.from("favorites")
    .select("created_at, product:products(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => r.product).filter(Boolean);
}
