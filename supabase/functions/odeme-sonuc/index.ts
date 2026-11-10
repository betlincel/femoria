// Femoria — iyzico ödeme dönüşü (callback). iyzico ödeme sayfası bittiğinde buraya POST eder.
// Güvenlik: gelen veriye güvenilmez; sonuç her zaman iyzico'dan, kayıtlı token ile yeniden sorgulanır
// ve tutar / sepet kimliği kontrol edilir. JWT yoktur (iyzico çağırır): verify_jwt = false.
// Sonunda kullanıcı sitedeki "Siparişlerim" sayfasına yönlendirilir.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { iyzico } from "../_shared/iyzico.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const SITE_URL = Deno.env.get("SITE_URL") ?? "";

const back = (base: string | null, result: "basarili" | "basarisiz", note = "") => {
  const target = `${(base || SITE_URL || "/").replace(/#.*$/, "")}#/siparislerim?odeme=${result}${note ? `&not=${encodeURIComponent(note.slice(0, 140))}` : ""}`;
  return new Response(null, { status: 303, headers: { Location: target } });
};

Deno.serve(async (req) => {
  const id = new URL(req.url).searchParams.get("c") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return back(null, "basarisiz", "Ödeme kaydı bulunamadı");
  const { data: co } = await db.from("checkouts").select("*").eq("id", id).maybeSingle();
  if (!co) return back(null, "basarisiz", "Ödeme kaydı bulunamadı");
  if (co.status === "odendi") return back(co.return_url, "basarili");
  if (!co.iyzico_token) return back(co.return_url, "basarisiz");

  let r: Record<string, any>;
  try {
    r = await iyzico("POST", "/payment/iyzipos/checkoutform/auth/ecom/detail", { conversationId: co.id, token: co.iyzico_token });
  } catch (e) {
    console.error("[odeme-sonuc] sorgu", e);
    r = (e as any)?.iyzico ?? { paymentStatus: "FAILURE", errorMessage: String(e) };
  }

  const ok = r.paymentStatus === "SUCCESS" && r.basketId === co.id && (r.fraudStatus === undefined || r.fraudStatus === 1)
    && Math.abs(Number(r.paidPrice ?? r.price) - Number(co.total)) < 0.01;

  if (!ok) {
    await db.from("checkouts").update({ status: "basarisiz", error: String(r.errorMessage ?? r.paymentStatus ?? "").slice(0, 300) }).eq("id", co.id);
    await db.from("orders").update({ status: "iptal", payment_status: "basarisiz" }).eq("checkout_id", co.id).eq("payment_status", "bekliyor");
    return back(co.return_url, "basarisiz", String(r.errorMessage ?? ""));
  }

  const now = new Date().toISOString();
  await db.from("checkouts").update({ status: "odendi", iyzico_payment_id: String(r.paymentId ?? ""), paid_at: now }).eq("id", co.id);
  for (const tx of r.itemTransactions ?? []) {
    const { data: o } = await db.from("orders").update({
      payment_status: "odendi", payout_status: "bekliyor", status: "anlasildi", seller_agreed: true, agreed_at: now,
      paid_at: now, shipping_status: "hazirlaniyor", iyzico_tx_id: String(tx.paymentTransactionId),
    }).eq("id", tx.itemId).eq("checkout_id", co.id).eq("payment_status", "bekliyor").select("*").maybeSingle();
    if (!o) continue;
    // Sohbette sipariş kartı + bilgi notu; teklifle alındıysa teklif kullanıldı
    await db.from("messages").insert({ conversation_id: o.conversation_id, sender_id: o.buyer_id, kind: "siparis", body: "Sipariş kartı", order_id: o.id });
    await db.rpc("post_system_note", {
      p_conversation_id: o.conversation_id,
      p_body: o.delivery === "kargo"
        ? "Ödeme alındı. Satıcı ürünü kargoya verip takip numarasını girecek."
        : "Ödeme alındı. Teslimi buradan konuşabilirsiniz; ürünü aldığınızda \"Teslim aldım\" deyin.",
    });
    if (o.offer_id) await db.from("offers").update({ status: "kullanildi", updated_at: now }).eq("id", o.offer_id);
  }
  return back(co.return_url, "basarili");
});
