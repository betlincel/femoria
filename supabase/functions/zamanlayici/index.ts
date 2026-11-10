// Femoria — zamanlayıcı (pg_cron birkaç dakikada bir çağırır; x-cron-secret ile korunur, JWT yok).
//   1) Yarım kalan ödemeler: iyzico'dan sonucu sorgular; ödenmediyse ayrılan stoğu geri ekler.
//   2) Kargo süresi: ödeme alındıktan SHIP_DAYS gün içinde gönderilmeyen sipariş iptal + iade
//      (bir gün önce satıcıya hatırlatma).
//   3) Otomatik onay: kargoya verildikten CONFIRM_DAYS gün sonra, alıcı sorun bildirmediyse ödeme
//      satıcıya aktarılır (iki gün önce alıcıya hatırlatma).
//   4) E-posta: bildirim kuyruğundaki iletileri gönderir (Resend).
// Gizli değerler: ZAMANLAYICI_SECRET (zorunlu), SITE_URL, ADMIN_EMAIL, RESEND_API_KEY, MAIL_FROM,
//                 SHIP_DAYS (varsayılan 5), CONFIRM_DAYS (varsayılan 7) + iyzico anahtarları.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { json } from "../_shared/cors.ts";
import { iyzicoConfigured } from "../_shared/iyzico.ts";
import { approveOrder, finalizeCheckout, refundOrder, releaseCheckoutStock } from "../_shared/orders.ts";
import { mailConfigured, sendMail } from "../_shared/mail.ts";

const SECRET = Deno.env.get("ZAMANLAYICI_SECRET") ?? "";
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/#.*$/, "");
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "";
const SHIP_DAYS = Math.max(1, Number(Deno.env.get("SHIP_DAYS") ?? "5"));
const CONFIRM_DAYS = Math.max(2, Number(Deno.env.get("CONFIRM_DAYS") ?? "7"));
const DAY = 864e5;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

async function title(o: Record<string, any>) {
  const { data } = await db.from("products").select("title").eq("id", o.product_id).maybeSingle();
  return data?.title ?? "Ürün";
}
const notify = (user: string | null, kind: string, subject: string, body: string, link: string | null) =>
  db.rpc("notify", { p_user: user, p_kind: kind, p_subject: subject, p_body: body, p_link: link });

// 1) Yarım kalan ödemeler (iyzico ödeme sayfası ~30 dk geçerli)
async function staleCheckouts(log: string[]) {
  const { data } = await db.from("checkouts").select("*").eq("status", "bekliyor").lt("created_at", ago(45 * 60e3)).limit(20);
  for (const co of data ?? []) {
    try {
      if (co.iyzico_token && iyzicoConfigured()) {
        const r = await finalizeCheckout(db, co);
        log.push(`ödeme ${co.id}: ${r.ok ? "ödendi" : "ödenmedi, stok geri eklendi"}`);
      } else {
        await db.from("checkouts").update({ status: "basarisiz", error: "Ödeme başlatılamadı" }).eq("id", co.id).eq("status", "bekliyor");
        await db.from("orders").update({ status: "iptal", payment_status: "basarisiz" }).eq("checkout_id", co.id).eq("payment_status", "bekliyor");
        await releaseCheckoutStock(db, co.id);
        log.push(`ödeme ${co.id}: başlatılamamış, stok geri eklendi`);
      }
    } catch (e) { log.push(`ödeme ${co.id}: HATA ${(e as Error).message}`); }
  }
}

// 2) Kargo süresi
async function shipDeadline(log: string[]) {
  const base = () => db.from("orders").select("*").eq("payment_status", "odendi").eq("payout_status", "bekliyor")
    .eq("status", "anlasildi").eq("shipping_status", "hazirlaniyor");
  const { data: remind } = await base().is("ship_reminded_at", null).lt("paid_at", ago((SHIP_DAYS - 1) * DAY)).limit(50);
  for (const o of remind ?? []) {
    const t = await title(o);
    await notify(o.seller_id, "kargo_hatirlatma", `Yarın son gün: ${t}`,
      `"${t}" siparişini ${o.delivery === "kargo" ? "kargoya verip takip numarasını girmeniz" : "teslime hazırlamanız"} gerekiyor. ` +
      `Ödeme alındıktan ${SHIP_DAYS} gün içinde gönderilmeyen siparişler iptal edilir ve ödeme alıcıya iade edilir.`, "/siparislerim?sekme=satislarim");
    await db.from("orders").update({ ship_reminded_at: new Date().toISOString() }).eq("id", o.id);
    log.push(`kargo hatırlatma ${o.id}`);
  }
  const { data: late } = await base().lt("paid_at", ago(SHIP_DAYS * DAY)).limit(20);
  for (const o of late ?? []) {
    try { await refundOrder(db, o, { by: "auto" }); log.push(`süre doldu, iade ${o.id}`); }
    catch (e) { log.push(`iade ${o.id}: HATA ${(e as Error).message}`); }
  }
}

// 3) Otomatik onay
async function autoConfirm(log: string[]) {
  const base = () => db.from("orders").select("*").eq("payment_status", "odendi").eq("payout_status", "bekliyor")
    .eq("status", "anlasildi").eq("shipping_status", "kargoda").or("dispute_status.is.null,dispute_status.eq.kapandi");
  const { data: remind } = await base().is("reminded_at", null).lt("shipped_at", ago((CONFIRM_DAYS - 2) * DAY)).limit(50);
  for (const o of remind ?? []) {
    const t = await title(o);
    await notify(o.buyer_id, "onay_hatirlatma", `Siparişinizi teslim aldınız mı? ${t}`,
      `"${t}" ürününü teslim aldıysanız "Teslim aldım" deyin. Bir sorun varsa "Sorun bildir"e dokunun. ` +
      `Bildirim yapılmazsa sipariş 2 gün sonra kendiliğinden onaylanır ve ödeme satıcıya aktarılır.`, "/siparislerim");
    await db.from("orders").update({ reminded_at: new Date().toISOString() }).eq("id", o.id);
    log.push(`onay hatırlatma ${o.id}`);
  }
  const { data: due } = await base().lt("shipped_at", ago(CONFIRM_DAYS * DAY)).limit(20);
  for (const o of due ?? []) {
    try { await approveOrder(db, o, { auto: true }); log.push(`otomatik onay ${o.id}`); }
    catch (e) { log.push(`onay ${o.id}: HATA ${(e as Error).message}`); }
  }
}

// 4) E-postalar
async function sendEmails(log: string[]) {
  if (!mailConfigured()) { log.push("e-posta: RESEND_API_KEY yok, gönderilmedi"); return; }
  // 3 günden eski gönderilmemiş bildirimler artık gönderilmez
  await db.from("notifications").update({ sent_at: new Date().toISOString(), error: "eskidi" }).is("sent_at", null).lt("created_at", ago(3 * DAY));
  const { data: list } = await db.from("notifications").select("*").is("sent_at", null).lt("attempts", 5).order("created_at").limit(40);
  const emailOf = new Map<string, string | null>();
  for (const n of list ?? []) {
    let to: string | null = null, skip: string | null = null;
    if (!n.user_id) {
      to = ADMIN_EMAIL || null;
      if (!to) skip = "ADMIN_EMAIL yok";
    } else {
      const { data: prof } = await db.from("profiles").select("notifications_enabled").eq("id", n.user_id).maybeSingle();
      if (prof && prof.notifications_enabled === false) skip = "kullanıcı kapattı";
      else {
        if (!emailOf.has(n.user_id)) {
          const { data } = await db.auth.admin.getUserById(n.user_id);
          emailOf.set(n.user_id, data?.user?.email ?? null);
        }
        to = emailOf.get(n.user_id) ?? null;
        if (!to) skip = "e-posta adresi yok";
      }
    }
    if (skip) { await db.from("notifications").update({ sent_at: new Date().toISOString(), error: skip }).eq("id", n.id); continue; }
    try {
      await sendMail(to!, n.subject, n.body, n.link && SITE_URL ? `${SITE_URL}#${n.link}` : SITE_URL || null);
      await db.from("notifications").update({ sent_at: new Date().toISOString(), attempts: n.attempts + 1, error: null }).eq("id", n.id);
      log.push(`e-posta ${n.kind}`);
    } catch (e) {
      await db.from("notifications").update({ attempts: n.attempts + 1, error: String((e as Error).message).slice(0, 300) }).eq("id", n.id);
      log.push(`e-posta ${n.id}: HATA ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 600)); // Resend hız sınırı
  }
}

Deno.serve(async (req) => {
  if (!SECRET || req.headers.get("x-cron-secret") !== SECRET) return json({ error: "Yetkisiz" }, 401);
  const log: string[] = [];
  const step = async (name: string, fn: (l: string[]) => Promise<void>) => {
    try { await fn(log); } catch (e) { log.push(`${name}: HATA ${(e as Error).message}`); }
  };
  if (iyzicoConfigured()) {
    await step("ödemeler", staleCheckouts);
    await step("kargo", shipDeadline);
    await step("onay", autoConfirm);
  } else {
    await step("ödemeler", staleCheckouts); // iyzico yoksa yalnız başlatılamamış ödemelerin stoğunu bırakır
  }
  await step("e-posta", sendEmails);
  return json({ ok: true, log });
});
