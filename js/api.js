// Veri katmanı: tüm Supabase çağrıları buradan geçer.
import { supabase, isConfigured, NOT_CONFIGURED } from "./supabase.js";
import { state } from "./store.js";
import { dataUrlToBlob } from "./ui.js";

const need = () => { if (!isConfigured) throw new Error(NOT_CONFIGURED); };
const ok = ({ data, error }) => { if (error) throw error; return data; };

export const FALLBACK_CATEGORIES = [
  { slug: "yemek", name: "Yemek" },
  { slug: "orgu", name: "Örgü" },
  { slug: "taki", name: "Takı" },
  { slug: "ev-susu", name: "Ev süsü" },
  { slug: "kurutmalik", name: "Kurutmalık" },
  { slug: "diger", name: "Diğer" },
];

// Kategori adları sade gösterilir: veritabanında emoji kalmışsa ayıklanır
const cleanName = (s) => String(s ?? "").replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim();

export const DELIVERY_LABEL = { elden: "Elden teslim", kargo: "Kargo", ikisi: "Elden veya kargo" };

// ---------- Ölçüm (formdaki başarı ölçütleri) ----------
export function track(name, props = {}) {
  if (!isConfigured) return;
  supabase.from("events")
    .insert({ name, props, session_id: state.sessionId, user_id: state.user?.id ?? null })
    .then(() => {}, () => {});
}

// ---------- Sözlükler ----------
export async function getCategories() {
  if (state.categories.length) return state.categories;
  if (!isConfigured) return (state.categories = FALLBACK_CATEGORIES);
  const data = await supabase.from("categories").select("*").order("sort").then(ok).catch(() => null);
  state.categories = data?.length ? data.map((c) => ({ ...c, name: cleanName(c.name) || c.slug })) : FALLBACK_CATEGORIES;
  return state.categories;
}

export const categoryOf = (slug) =>
  (state.categories.length ? state.categories : FALLBACK_CATEGORIES).find((c) => c.slug === slug) ||
  FALLBACK_CATEGORIES.at(-1);

export async function getLocations() {
  if (!isConfigured) return [];
  return supabase.from("locations").select("*").order("city").order("district").order("neighborhood").then(ok);
}

// ---------- Ürünler ----------
const PRODUCT_COLS = "id,title,description,price,category,delivery,photos,status,seller_id,neighborhood,district,city,approx_lat,approx_lng,published_at,created_at";

export function photoUrl(path) {
  if (!path) return null;
  if (/^https?:|^data:/.test(path)) return path;
  return supabase?.storage.from("product-photos").getPublicUrl(path).data.publicUrl ?? null;
}

/** LIKE/ILIKE kalıbında özel karakterleri kaçır ("%", "_", "\\") */
const likeEscape = (v) => String(v).replace(/[\\%_]/g, (c) => "\\" + c);

/**
 * Ürün listesi (en yeniden eskiye). Konum, kategori ve arama isteğe bağlıdır.
 * Konum adları büyük/küçük harf duyarsız eşleşir (il, ilçe, mahalle).
 * Döner: { rows, hasMore }
 */
// Sıralama seçenekleri: yeni (varsayılan), ucuz, pahali, begenilen
const SORTS = {
  yeni: [["published_at", false]],
  ucuz: [["price", true], ["published_at", false]],
  pahali: [["price", false], ["published_at", false]],
  begenilen: [["favorite_count", false], ["published_at", false]],
};

export async function listProducts({ city = null, district = null, neighborhood = null, category = null, q = "", priceMin = null, priceMax = null, delivery = null, sort = "yeni", limit = 48, offset = 0 } = {}) {
  if (!isConfigured) return { rows: [], hasMore: false };
  let query = supabase.from("products").select(PRODUCT_COLS).eq("status", "satista");
  if (category) query = query.eq("category", category);
  if (city) query = query.ilike("city", likeEscape(city));
  if (district) query = query.ilike("district", likeEscape(district));
  if (neighborhood) query = query.ilike("neighborhood", likeEscape(neighborhood));
  const words = String(q || "").trim().split(/\s+/).filter((w) => w.length > 1).slice(0, 4);
  for (const w of words) query = query.ilike("title", `%${likeEscape(w)}%`);
  if (priceMin != null && priceMin !== "") query = query.gte("price", Number(priceMin));
  if (priceMax != null && priceMax !== "") query = query.lte("price", Number(priceMax));
  if (delivery === "kargo") query = query.in("delivery", ["kargo", "ikisi"]);
  if (delivery === "elden") query = query.in("delivery", ["elden", "ikisi"]);
  for (const [col, asc] of SORTS[sort] || SORTS.yeni) query = query.order(col, { ascending: asc });
  const rows = await query
    .range(offset, offset + limit) // bir fazlasını iste: devamı var mı?
    .then(ok);
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
}

export async function latestProducts({ city, district, limit = 6 } = {}) {
  if (!isConfigured) return [];
  let q = supabase.from("products").select(PRODUCT_COLS).eq("status", "satista")
    .order("published_at", { ascending: false }).limit(limit);
  if (district) q = q.eq("district", district);
  if (city) q = q.eq("city", city);
  return q.then(ok);
}

export async function getProduct(id) {
  need();
  const product = await supabase.from("products").select(PRODUCT_COLS).eq("id", id).maybeSingle().then(ok);
  if (!product) return null;
  const [seller, badges] = await Promise.all([
    supabase.from("public_profiles").select("*").eq("id", product.seller_id).maybeSingle().then(ok),
    userBadges(product.seller_id),
  ]);
  return { ...product, seller, sellerBadges: badges };
}

/** Sepetteki ürünlerin güncel hali (satılan/kaldırılan ürünler dönmez ya da durumuyla döner). */
export async function getProductsByIds(ids) {
  need();
  if (!ids.length) return [];
  const rows = await supabase.from("products").select(PRODUCT_COLS).in("id", ids).then(ok);
  return (rows || []).filter((r) => ids.includes(r.id));
}

/** Satıcı adları (sepette satıcıya göre gruplamak için) */
export async function sellerNames(ids) {
  need();
  if (!ids.length) return {};
  const rows = await supabase.from("public_profiles").select("id,full_name").in("id", ids).then(ok);
  return Object.fromEntries((rows || []).map((r) => [r.id, r.full_name]));
}

/** Satıcıların adı ve online ödeme alıp almadığı */
export async function sellerInfo(ids) {
  need();
  if (!ids.length) return {};
  const rows = await supabase.from("public_profiles").select("id,full_name,payout_ready").in("id", ids).then(ok);
  return Object.fromEntries((rows || []).map((r) => [r.id, r]));
}

export async function myProducts() {
  need();
  return supabase.from("products").select(PRODUCT_COLS).eq("seller_id", state.user.id)
    .neq("status", "kaldirildi").order("created_at", { ascending: false }).then(ok);
}

export async function setProductStatus(id, status) {
  need();
  return supabase.from("products").update({ status }).eq("id", id).then(ok);
}

/**
 * Vitrinden kaldır = ürün veritabanından hemen silinir; fotoğrafları depodan silinir.
 * Ürünle ilgili sohbetler ve sipariş kartları kalır (sohbette ürünün adı ve fiyatı görünür).
 * Döner: { deleted: true, photos: [...] }
 */
export async function removeProduct(id) {
  need();
  const res = await supabase.rpc("remove_product", { p_product_id: id }).then(ok);
  if (res?.photos?.length) {
    // Silinemeyen dosya kalırsa gece temizliği "sahipsiz fotoğraf" olarak siler.
    await supabase.storage.from("product-photos").remove(res.photos).catch(() => {});
  }
  return res;
}

export async function priceSuggestion(category, title) {
  if (!isConfigured) return null;
  const rows = await supabase.rpc("price_suggestion", { p_category: category, p_title: title || null })
    .then(ok).catch(() => []);
  return rows?.[0] ?? null;
}

/** Taslağı yayınlar: fotoğrafları yükler, ürünü "satışta" olarak ekler. */
export async function publishProduct(draft) {
  need();
  const uid = state.user.id;
  const paths = [];
  for (const [i, dataUrl] of draft.photos.entries()) {
    const blob = await dataUrlToBlob(dataUrl);
    const path = `${uid}/${Date.now()}-${i}.jpg`;
    await supabase.storage.from("product-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false }).then(ok);
    paths.push(path);
  }
  return supabase.from("products").insert({
    title: draft.title.trim(),
    description: draft.description?.trim() || null,
    category: draft.category,
    price: draft.price,
    delivery: draft.delivery,
    photos: paths,
    voice_transcript: draft.transcript || null,
    status: "satista",
    // Ürünün konumu (satıcı bu ürün için girdi). Sunucu kaydederken ~500 m kaydırır.
    approx_lat: draft.location.lat,
    approx_lng: draft.location.lng,
    city: draft.location.city || null,
    district: draft.location.district || null,
    neighborhood: draft.location.neighborhood || null,
  }).select().single().then(ok);
}

// ---------- Profil / rozet / kazanç ----------
export async function userBadges(userId) {
  if (!isConfigured) return [];
  const rows = await supabase.from("user_badges").select("badge_slug, awarded_at, badges(name, icon, description)")
    .eq("user_id", userId).then(ok).catch(() => []);
  return rows.map((r) => ({ slug: r.badge_slug, ...r.badges }));
}

export async function myEarnings() {
  need();
  return supabase.rpc("my_earnings").then(ok);
}

export async function myPurchases() {
  need();
  return supabase.from("orders")
    .select("id,quantity,unit_price,status,delivery,promised_date,created_at,conversation_id,products(id,title,photos,category),conversations(product_title,product_category)")
    .eq("buyer_id", state.user.id).neq("status", "iptal").order("created_at", { ascending: false }).then(ok);
}

export async function uploadAvatar(dataUrl) {
  need();
  const path = `${state.user.id}/avatar-${Date.now()}.jpg`;
  await supabase.storage.from("avatars").upload(path, await dataUrlToBlob(dataUrl), { contentType: "image/jpeg" }).then(ok);
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

/** Bir klasördeki dosyaları (sayfa sayfa) siler; filter verilirse yalnız eşleşenleri. */
async function removeFolder(bucket, folder, filter = () => true) {
  for (let round = 0; round < 50; round++) {
    const files = await supabase.storage.from(bucket).list(folder, { limit: 100 }).then(ok).catch(() => []);
    const names = files.filter((f) => f.id && filter(f.name)).map((f) => `${folder}/${f.name}`);
    if (!names.length) return;
    const { error } = await supabase.storage.from(bucket).remove(names);
    if (error || files.length < 100) return;
  }
}

export async function deleteMyAccount() {
  need();
  const uid = state.user.id;
  // Önce kendi dosyalarımızı temizle (Storage kuralları sadece kendi dosyalarına izin verir).
  for (const bucket of ["product-photos", "avatars"]) {
    await removeFolder(bucket, uid);
  }
  // Gönderdiğim sesli mesajlar sohbet klasörlerinde durur: <sohbet>/<uid>-<zaman>.webm
  const convs = await supabase.from("conversations").select("id").then(ok).catch(() => []);
  for (const c of convs) {
    await removeFolder("voice-messages", c.id, (name) => name.startsWith(`${uid}-`));
  }
  // Kalan her şeyi (karşı tarafın bu sohbetlerdeki kayıtları dahil) gece temizliği siler.
  await supabase.rpc("delete_my_account").then(ok);
  await supabase.auth.signOut();
}

// ---------- Arama talepleri ----------
export async function logSearchRequest(query, category = null, loc = {}) {
  if (!isConfigured || !query?.trim()) return;
  await supabase.from("search_requests").insert({
    query: query.trim().slice(0, 200), category, user_id: state.user?.id ?? null,
    city: loc.city ?? null, district: loc.district ?? null, neighborhood: loc.neighborhood ?? null,
  }).then(() => {}, () => {});
}

export async function saveFeedback(questionKey, answer) {
  if (!isConfigured) return;
  await supabase.from("assistant_feedback").insert({
    question_key: questionKey, answer, session_id: state.sessionId, user_id: state.user?.id ?? null,
  }).then(() => {}, () => {});
}

// ---------- Sohbet ----------
export async function startConversation(productId) {
  need();
  return supabase.rpc("start_conversation", { p_product_id: productId }).then(ok);
}

export async function myConversations() {
  need();
  const uid = state.user.id;
  const convs = await supabase.from("conversations")
    .select("*, products(id,title,photos,price,category)")
    .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
    .order("last_message_at", { ascending: false }).then(ok);
  const otherIds = [...new Set(convs.map((c) => (c.buyer_id === uid ? c.seller_id : c.buyer_id)))];
  const people = otherIds.length
    ? await supabase.from("public_profiles").select("id,full_name,avatar_url").in("id", otherIds).then(ok)
    : [];
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  return convs.map((c) => {
    const iAmBuyer = c.buyer_id === uid;
    const lastRead = iAmBuyer ? c.buyer_last_read_at : c.seller_last_read_at;
    return {
      ...c, iAmBuyer,
      other: byId[iAmBuyer ? c.seller_id : c.buyer_id] || { full_name: "Komşu" },
      unread: !lastRead || new Date(c.last_message_at) > new Date(lastRead),
    };
  });
}

export async function getConversation(id) {
  need();
  const conv = await supabase.from("conversations").select("*, products(id,title,photos,price,delivery,category)")
    .eq("id", id).maybeSingle().then(ok);
  if (!conv) return null;
  const iAmBuyer = conv.buyer_id === state.user.id;
  const otherId = iAmBuyer ? conv.seller_id : conv.buyer_id;
  const [other, messages, orders] = await Promise.all([
    supabase.from("public_profiles").select("*").eq("id", otherId).maybeSingle().then(ok),
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at").then(ok),
    supabase.from("orders").select("*").eq("conversation_id", id).then(ok),
  ]);
  return { ...conv, iAmBuyer, otherId, other: other || { full_name: "Komşu" }, messages, orders };
}

export async function sendMessage(conversationId, { body, kind = "metin", audio_path = null }) {
  need();
  return supabase.from("messages").insert({ conversation_id: conversationId, body, kind, audio_path })
    .select().single().then(ok);
}

export async function sendVoiceMessage(conversationId, blob) {
  need();
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  const path = `${conversationId}/${state.user.id}-${Date.now()}.${ext}`;
  await supabase.storage.from("voice-messages").upload(path, blob, { contentType: blob.type || "audio/webm" }).then(ok);
  return sendMessage(conversationId, { kind: "ses", body: "Sesli mesaj", audio_path: path });
}

export async function voiceUrl(path) {
  const { data } = await supabase.storage.from("voice-messages").createSignedUrl(path, 3600);
  return data?.signedUrl;
}

export async function transcribeVoice(message) {
  need();
  const { data, error } = await supabase.functions.invoke("ayse-abla", { body: { mode: "transcribe", path: message.audio_path } });
  if (error || !data?.text) throw new Error("Yazıya çeviremedim");
  await supabase.from("messages").update({ transcript: data.text }).eq("id", message.id);
  return data.text;
}

export async function markRead(conversationId) {
  if (!isConfigured) return;
  await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId }).then(() => {}, () => {});
}

export async function proposeOrder(conversationId, { quantity, unitPrice, delivery, promisedDate }) {
  need();
  return supabase.rpc("propose_order", {
    p_conversation_id: conversationId, p_quantity: quantity, p_unit_price: unitPrice,
    p_delivery: delivery, p_promised_date: promisedDate || null,
  }).then(ok);
}

export const agreeOrder = (id) => supabase.rpc("agree_order", { p_order_id: id }).then(ok);
export const cancelOrder = (id) => supabase.rpc("cancel_order", { p_order_id: id }).then(ok);
export const markDelivered = (id) => supabase.rpc("mark_order_delivered", { p_order_id: id }).then(ok);

export async function blockUser(userId) {
  need();
  return supabase.from("blocks").insert({ blocker_id: state.user.id, blocked_id: userId }).then(ok);
}

export async function reportUser({ reportedId, conversationId = null, productId = null, reason = "Rahatsız oldum", note = null }) {
  need();
  return supabase.from("reports").insert({
    reporter_id: state.user.id, reported_id: reportedId, conversation_id: conversationId,
    product_id: productId, reason, note,
  }).then(ok);
}

/** Kullanıcıya gelen yeni mesajları dinler (RLS sayesinde yalnız kendi sohbetleri). */
export function subscribeIncoming(onMessage) {
  if (!isConfigured || !state.user) return () => {};
  const ch = supabase.channel(`inbox-${state.user.id}-${Math.random().toString(36).slice(2, 8)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
      if (p.new.sender_id !== state.user?.id) onMessage(p.new);
    })
    .subscribe();
  return () => supabase.removeChannel(ch);
}

export function subscribeConversation(id, { onMessage, onOrder }) {
  if (!isConfigured) return () => {};
  const ch = supabase.channel(`conv-${id}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (p) => onMessage(p.new))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (p) => onMessage(p.new))
    .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `conversation_id=eq.${id}` }, (p) => onOrder(p.new))
    .subscribe();
  return () => supabase.removeChannel(ch);
}

// ---------- Ayşe Abla (Edge Function) ----------
export async function askAssistant(payload) {
  if (!isConfigured) return null;
  try {
    const { data, error } = await supabase.functions.invoke("ayse-abla", { body: payload });
    if (error || !data || data.error) {
      // Sorun giderme: asıl sebep tarayıcı konsolunda görünür (ekranda yedek cevaplar çalışır)
      let detail = data?.error || error?.message || "boş cevap";
      try { if (error?.context) detail = `${error.context.status} ${await error.context.text()}`; } catch {}
      console.warn("[Ayşe Abla] yapay zekaya ulaşılamadı, kurallı cevaplar kullanılıyor:", detail);
      return null;
    }
    return data;
  } catch (e) {
    console.warn("[Ayşe Abla] yapay zekaya ulaşılamadı:", e);
    return null;
  }
}

// =====================================================================
// E-ticaret: online ödeme (iyzico), siparişler, teklifler, mağaza, takip, yorum
// =====================================================================
/** "odeme" Edge Function'ı; hata olursa sunucunun açıklamasıyla hata fırlatır */
async function payFn(body) {
  need();
  const { data, error } = await supabase.functions.invoke("odeme", { body });
  if (error || data?.error) {
    let msg = data?.error || error?.message || "Ödeme işlemi yapılamadı";
    try { if (error?.context) msg = (await error.context.json()).error || msg; } catch { /* yoksay */ }
    throw new Error(msg);
  }
  return data;
}
export const startCheckout = (items, address) =>
  payFn({ mode: "checkout", items, address, return_url: location.origin + location.pathname });
export const confirmOrder = (orderId) => payFn({ mode: "confirm", order_id: orderId });
export const cancelPaidOrder = (orderId) => payFn({ mode: "cancel", order_id: orderId });
export const setupPayout = (form) => payFn({ mode: "payout_setup", ...form });

export async function myPayoutAccount() {
  need();
  return supabase.from("payout_accounts").select("contact_name,iban_last4,updated_at").eq("user_id", state.user.id).maybeSingle().then(ok);
}

export const setShipment = (orderId, company, tracking) =>
  supabase.rpc("set_shipment", { p_order_id: orderId, p_company: company || "", p_tracking: tracking || "" }).then(ok);

/** Online ödenmiş siparişlerim. role: "buyer" (alışlarım) | "seller" (satışlarım) */
export async function myPaidOrders(role) {
  need();
  const col = role === "seller" ? "seller_id" : "buyer_id";
  const rows = await supabase.from("orders")
    .select("*, products(id,title,photos,category), conversations(product_title,product_category)")
    .eq(col, state.user.id).in("payment_status", ["odendi", "iade"])
    .order("created_at", { ascending: false }).then(ok);
  const other = [...new Set(rows.map((o) => (role === "seller" ? o.buyer_id : o.seller_id)))];
  const [names, reviews] = await Promise.all([
    sellerNames(other).catch(() => ({})),
    role === "buyer" && rows.length
      ? supabase.from("reviews").select("order_id,rating,comment").in("order_id", rows.map((o) => o.id)).then(ok).catch(() => [])
      : [],
  ]);
  const revOf = Object.fromEntries((reviews || []).map((r) => [r.order_id, r]));
  return rows.map((o) => ({ ...o, other_name: names[role === "seller" ? o.buyer_id : o.seller_id] || "Komşu", review: revOf[o.id] || null }));
}

export const writeReview = (orderId, rating, comment) =>
  supabase.from("reviews").insert({ order_id: orderId, rating, comment: comment || null }).then(ok);

// ---------- Teklifler ----------
export const makeOffer = (productId, amount) => supabase.rpc("make_offer", { p_product_id: productId, p_amount: amount }).then(ok);
export const respondOffer = (offerId, action, counter = null) =>
  supabase.rpc("respond_offer", { p_offer_id: offerId, p_action: action, p_counter: counter }).then(ok);

export async function myOffers() {
  need();
  const uid = state.user.id;
  const rows = await supabase.from("offers").select("*, products(id,title,photos,price,category,seller_id,delivery,status)")
    .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`).order("updated_at", { ascending: false }).then(ok);
  const names = await sellerNames([...new Set(rows.map((o) => (o.buyer_id === uid ? o.seller_id : o.buyer_id)))]).catch(() => ({}));
  return rows.map((o) => ({ ...o, mine: o.buyer_id === uid, other_name: names[o.buyer_id === uid ? o.seller_id : o.buyer_id] || "Komşu" }));
}

/** Alıcının kabul edilmiş, süresi geçmemiş teklifleri: ürün kimliği → teklif */
export async function acceptedOffers(productIds) {
  if (!isConfigured || !state.user || !productIds.length) return {};
  const rows = await supabase.from("offers").select("id,product_id,amount,expires_at")
    .eq("buyer_id", state.user.id).eq("status", "kabul").in("product_id", productIds).then(ok).catch(() => []);
  return Object.fromEntries((rows || []).filter((o) => !o.expires_at || new Date(o.expires_at) > new Date()).map((o) => [o.product_id, o]));
}

// ---------- Mağaza, takip, yorum ----------
export async function sellerStore(sellerId) {
  need();
  const [profile, stats, products] = await Promise.all([
    supabase.from("public_profiles").select("*").eq("id", sellerId).maybeSingle().then(ok),
    supabase.rpc("seller_stats", { p_seller: sellerId }).then(ok).catch(() => null),
    supabase.from("products").select(PRODUCT_COLS).eq("seller_id", sellerId).eq("status", "satista")
      .order("published_at", { ascending: false }).then(ok),
  ]);
  return profile ? { profile, stats: stats || {}, products } : null;
}

export const sellerStats = (sellerId) => supabase.rpc("seller_stats", { p_seller: sellerId }).then(ok);

/** Takip ettiğim satıcıların en yeni ürünleri (ana sayfa) */
export async function followedProducts(limit = 16) {
  if (!isConfigured || !state.user) return [];
  const follows = await supabase.from("follows").select("seller_id").then(ok).catch(() => []);
  const ids = (follows || []).map((f) => f.seller_id);
  if (!ids.length) return [];
  return supabase.from("products").select(PRODUCT_COLS).in("seller_id", ids).eq("status", "satista")
    .order("published_at", { ascending: false }).limit(limit).then(ok);
}

export async function sellerReviews(sellerId) {
  need();
  const rows = await supabase.from("reviews").select("id,rating,comment,product_title,created_at,reviewer_id")
    .eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(50).then(ok);
  const names = await sellerNames([...new Set(rows.map((r) => r.reviewer_id))]).catch(() => ({}));
  return rows.map((r) => ({ ...r, reviewer_name: names[r.reviewer_id] || "Komşu" }));
}

export async function setFollow(sellerId, on) {
  need();
  const q = on
    ? supabase.from("follows").insert({ seller_id: sellerId })
    : supabase.from("follows").delete().eq("follower_id", state.user.id).eq("seller_id", sellerId);
  const { error } = await q;
  if (error && error.code !== "23505") throw error;
}

export async function myFollowedSellers() {
  if (!isConfigured || !state.user) return [];
  const rows = await supabase.from("follows").select("seller_id,created_at").order("created_at", { ascending: false }).then(ok);
  const ids = rows.map((r) => r.seller_id);
  if (!ids.length) return [];
  const profiles = await supabase.from("public_profiles").select("id,full_name,avatar_url,bio").in("id", ids).then(ok);
  return ids.map((id) => profiles.find((p) => p.id === id)).filter(Boolean);
}

export const updateBio = (bio) => supabase.from("profiles").update({ bio: bio || null }).eq("id", state.user.id).then(ok);
