// Sipariş işlemleri — "odeme", "odeme-sonuc" ve "zamanlayici" fonksiyonları ortak kullanır.
// Hepsi service_role istemcisiyle çalışır; yetki kontrolü çağıran fonksiyondadır.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { iyzico, price } from "./iyzico.ts";

type Db = SupabaseClient;
type Order = Record<string, any>;

const note = (db: Db, conversationId: string | null, body: string) =>
  conversationId ? db.rpc("post_system_note", { p_conversation_id: conversationId, p_body: body }) : Promise.resolve();

/** Ödeme olmadıysa / iptal edildiyse bir ödemenin ayırdığı stoğu bir kez geri ekler. */
export async function releaseCheckoutStock(db: Db, checkoutId: string, onlyOrderIds?: string[]) {
  if (!onlyOrderIds) {
    // Bütün ödeme için: yalnız bir kez (yarış durumunda ikinci çağrı bir şey yapmaz)
    const { data: claimed } = await db.from("checkouts").update({ stock_released: true })
      .eq("id", checkoutId).eq("stock_reserved", true).eq("stock_released", false).select("id");
    if (!claimed?.length) return;
  }
  let q = db.from("orders").select("id,product_id,quantity").eq("checkout_id", checkoutId);
  if (onlyOrderIds) q = q.in("id", onlyOrderIds);
  const { data: rows } = await q;
  const items = (rows ?? []).filter((r: Order) => r.product_id).map((r: Order) => ({ product_id: r.product_id, qty: r.quantity }));
  if (items.length) await db.rpc("release_stock", { p_items: items });
}

/** iyzico ödeme sonucunu (kayıtlı token ile) sorgular ve siparişleri işler. Tekrar çağrılması güvenlidir. */
export async function finalizeCheckout(db: Db, co: Record<string, any>): Promise<{ ok: boolean; note?: string }> {
  if (co.status === "odendi") return { ok: true };
  if (!co.iyzico_token) return { ok: false };

  let r: Record<string, any>;
  try {
    r = await iyzico("POST", "/payment/iyzipos/checkoutform/auth/ecom/detail", { conversationId: co.id, token: co.iyzico_token });
  } catch (e) {
    r = (e as any)?.iyzico ?? { paymentStatus: "FAILURE", errorMessage: String(e) };
  }
  const ok = r.paymentStatus === "SUCCESS" && r.basketId === co.id && (r.fraudStatus === undefined || r.fraudStatus === 1)
    && Math.abs(Number(r.paidPrice ?? r.price) - Number(co.total)) < 0.01;

  if (!ok) {
    const { data: marked } = await db.from("checkouts")
      .update({ status: "basarisiz", error: String(r.errorMessage ?? r.paymentStatus ?? "").slice(0, 300) })
      .eq("id", co.id).eq("status", "bekliyor").select("id");
    if (marked?.length) {
      await db.from("orders").update({ status: "iptal", payment_status: "basarisiz" }).eq("checkout_id", co.id).eq("payment_status", "bekliyor");
      await releaseCheckoutStock(db, co.id);
    }
    return { ok: false, note: String(r.errorMessage ?? "") };
  }

  const now = new Date().toISOString();
  const { data: marked } = await db.from("checkouts")
    .update({ status: "odendi", iyzico_payment_id: String(r.paymentId ?? ""), paid_at: now })
    .eq("id", co.id).neq("status", "odendi").select("id");
  if (!marked?.length) return { ok: true }; // başka bir çağrı zaten işledi

  for (const tx of r.itemTransactions ?? []) {
    const { data: o } = await db.from("orders").update({
      payment_status: "odendi", payout_status: "bekliyor", status: "anlasildi", seller_agreed: true, agreed_at: now,
      paid_at: now, shipping_status: "hazirlaniyor", iyzico_tx_id: String(tx.paymentTransactionId),
    }).eq("id", tx.itemId).eq("checkout_id", co.id).eq("payment_status", "bekliyor").select("*").maybeSingle();
    if (!o) continue;
    await db.from("messages").insert({ conversation_id: o.conversation_id, sender_id: o.buyer_id, kind: "siparis", body: "Sipariş kartı", order_id: o.id });
    await note(db, o.conversation_id, o.delivery === "kargo"
      ? "Ödeme alındı. Satıcı ürünü kargoya verip takip numarasını girecek."
      : "Ödeme alındı. Teslimi buradan konuşabilirsiniz; ürünü aldığınızda \"Teslim aldım\" deyin.");
    if (o.offer_id) await db.from("offers").update({ status: "kullanildi", updated_at: now }).eq("id", o.offer_id);
  }
  return { ok: true };
}

/** Teslim onayı: iyzico'da satıcının payını serbest bırakır. */
export async function approveOrder(db: Db, o: Order, { auto = false } = {}) {
  await iyzico("POST", "/payment/iyzipos/item/approve", { conversationId: o.id, paymentTransactionId: o.iyzico_tx_id });
  const now = new Date().toISOString();
  await db.from("orders").update({
    status: "teslim_edildi", shipping_status: "teslim_edildi", payout_status: "onaylandi", delivered_at: now, confirmed_at: now,
    auto_confirmed: auto, dispute_status: o.dispute_status === "acik" ? "kapandi" : o.dispute_status,
  }).eq("id", o.id);
  await note(db, o.conversation_id, auto
    ? "Teslim süresi dolduğu için sipariş kendiliğinden onaylandı. Ödeme satıcıya aktarılıyor."
    : "Alıcı ürünü teslim aldığını onayladı. Ödeme satıcıya aktarılıyor.");
  await db.rpc("refresh_badges", { p_user: o.seller_id }).then(() => {}, () => {});
}

/** İptal + iade (alıcı, satıcı ya da süre dolduğu için otomatik). Stok geri eklenir. */
export async function refundOrder(db: Db, o: Order, { by, ip = "85.34.78.112" }: { by: "buyer" | "seller" | "auto"; ip?: string }) {
  await iyzico("POST", "/payment/refund", {
    conversationId: o.id, paymentTransactionId: o.iyzico_tx_id, price: price(Number(o.unit_price) * o.quantity), ip, currency: "TRY",
  });
  await db.from("orders").update({
    status: "iptal", payment_status: "iade", payout_status: "iade", auto_cancelled: by === "auto",
    dispute_status: o.dispute_status === "acik" ? "kapandi" : o.dispute_status,
  }).eq("id", o.id);
  if (o.checkout_id) await releaseCheckoutStock(db, o.checkout_id, [o.id]);
  await note(db, o.conversation_id, {
    buyer: "Alıcı siparişi iptal etti. Ödeme iade edildi.",
    seller: "Satıcı siparişi iptal etti. Ödeme iade edildi.",
    auto: "Satıcı ürünü süresinde göndermediği için sipariş iptal edildi. Ödeme iade edildi.",
  }[by]);
}
