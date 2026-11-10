// Femoria — online ödeme (iyzico Pazaryeri / emanet). Yalnız giriş yapmış kullanıcılar çağırır.
//
// POST /functions/v1/odeme
//   { mode: "payout_setup", name, surname, gsm, address, iban, identityNumber }
//       Satıcıyı iyzico'ya "alt üye işyeri" olarak kaydeder (ya da günceller). TC ve tam IBAN saklanmaz.
//   { mode: "checkout", items: [{ product_id, qty, delivery }], address: { name, surname, phone, city, district, line }, return_url }
//       Fiyatları sunucuda hesaplar, siparişleri "ödeme bekliyor" açar, iyzico ödeme sayfası adresini döndürür.
//   { mode: "confirm", order_id }  Alıcı ürünü teslim aldı → satıcının parası serbest bırakılır (iyzico onay).
//   { mode: "cancel",  order_id }  Kargoya verilmeden (alıcı) ya da teslimden önce (satıcı) iptal → para iadesi.
//
// Gizli değerler: IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL (varsayılan: sandbox),
//                 PLATFORM_COMMISSION (varsayılan 0.10 = %10), SITE_URL (ödeme sonrası dönüş için yedek adres).

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { iyzico, iyzicoConfigured, price } from "../_shared/iyzico.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const COMMISSION = Math.min(Math.max(Number(Deno.env.get("PLATFORM_COMMISSION") ?? "0.10"), 0), 0.5);
const SITE_URL = Deno.env.get("SITE_URL") ?? "";

const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const fail = (msg: string, status = 400) => json({ error: msg }, status);
const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "85.34.78.112";
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- Doğrulamalar ----------
function validTc(tc: string) {
  if (!/^[1-9]\d{10}$/.test(tc)) return false;
  const d = [...tc].map(Number);
  const d10 = ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d10 === d[9] && d11 === d[10];
}
function normalizeIban(raw: string) {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^TR\d{24}$/.test(iban)) return null;
  const moved = iban.slice(4) + iban.slice(0, 4);
  const digits = moved.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of digits) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1 ? iban : null;
}
function normalizeGsm(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^0090|^90|^0/, "");
  return /^5\d{9}$/.test(d) ? `+90${d}` : null;
}
const clean = (v: unknown, max = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// ---------- Satıcı ödeme hesabı ----------
async function payoutSetup(user: { id: string; email?: string }, body: Record<string, unknown>) {
  const name = clean(body.name, 60), surname = clean(body.surname, 60), address = clean(body.address, 250);
  const gsm = normalizeGsm(String(body.gsm ?? ""));
  const iban = normalizeIban(String(body.iban ?? ""));
  const tc = String(body.identityNumber ?? "").replace(/\D/g, "");
  if (name.length < 2 || surname.length < 2) return fail("Adınızı ve soyadınızı yazın.");
  if (!gsm) return fail("Cep telefonu numaranızı 05xx xxx xx xx biçiminde yazın.");
  if (address.length < 10) return fail("Adresinizi açık olarak yazın.");
  if (!iban) return fail("IBAN geçerli değil. TR ile başlayan 26 karakterli IBAN'ınızı yazın.");
  if (!validTc(tc)) return fail("T.C. kimlik numarası geçerli değil.");
  if (!user.email) return fail("Hesabınızda e-posta adresi yok.");

  const db = admin();
  const { data: existing } = await db.from("payout_accounts").select("sub_merchant_key").eq("user_id", user.id).maybeSingle();
  const common = {
    conversationId: user.id,
    name: `${name} ${surname}`.slice(0, 100),
    email: user.email, gsmNumber: gsm, address, iban,
    contactName: name, contactSurname: surname, identityNumber: tc, currency: "TRY",
  };
  let key = existing?.sub_merchant_key as string | undefined;
  if (key) {
    await iyzico("PUT", "/onboarding/submerchant", { ...common, subMerchantKey: key });
  } else {
    const r = await iyzico("POST", "/onboarding/submerchant", { ...common, subMerchantExternalId: user.id, subMerchantType: "PERSONAL" });
    key = r.subMerchantKey;
    if (!key) throw new Error("iyzico alt üye işyeri anahtarı dönmedi");
  }
  const { error } = await db.from("payout_accounts").upsert({
    user_id: user.id, sub_merchant_key: key, contact_name: `${name} ${surname}`, iban_last4: iban.slice(-4), updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  await db.from("profiles").update({ payout_ready: true }).eq("id", user.id);
  return json({ ok: true, iban_last4: iban.slice(-4) });
}

// ---------- Ödeme başlat ----------
type Item = { product_id: string; qty: number; delivery: "elden" | "kargo" };

async function checkout(req: Request, user: { id: string; email?: string; created_at?: string }, body: Record<string, unknown>) {
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  const items: Item[] = rawItems.map((i: any) => ({
    product_id: String(i?.product_id ?? ""), qty: Math.min(99, Math.max(1, Math.round(Number(i?.qty) || 1))),
    delivery: (i?.delivery === "kargo" ? "kargo" : "elden") as Item["delivery"],
  })).filter((i) => /^[0-9a-f-]{36}$/i.test(i.product_id));
  if (!items.length) return fail("Sepetiniz boş.");

  const a = (body.address ?? {}) as Record<string, unknown>;
  const addr = {
    name: clean(a.name, 60), surname: clean(a.surname, 60), phone: normalizeGsm(String(a.phone ?? "")),
    city: clean(a.city, 40), district: clean(a.district, 60), line: clean(a.line, 250),
  };
  if (addr.name.length < 2 || addr.surname.length < 2) return fail("Teslimat için ad ve soyad yazın.");
  if (!addr.phone) return fail("Cep telefonu numaranızı 05xx xxx xx xx biçiminde yazın.");
  if (!addr.city || !addr.district || addr.line.length < 10) return fail("İl, ilçe ve açık adresi yazın.");

  const db = admin();
  const ids = [...new Set(items.map((i) => i.product_id))];
  const { data: products, error: pe } = await db.from("products")
    .select("id,title,price,category,delivery,status,seller_id").in("id", ids);
  if (pe) throw pe;
  const sellers = [...new Set((products ?? []).map((p) => p.seller_id))];
  const [{ data: accounts }, { data: offers }, { data: cats }] = await Promise.all([
    db.from("payout_accounts").select("user_id,sub_merchant_key").in("user_id", sellers),
    db.from("offers").select("id,product_id,amount,expires_at").eq("buyer_id", user.id).eq("status", "kabul").in("product_id", ids),
    db.from("categories").select("slug,name"),
  ]);
  const keyOf = Object.fromEntries((accounts ?? []).map((r) => [r.user_id, r.sub_merchant_key]));
  const catName = Object.fromEntries((cats ?? []).map((c) => [c.slug, c.name]));

  const lines: Array<{ item: Item; p: any; unit: number; offerId: string | null }> = [];
  for (const item of items) {
    const p = (products ?? []).find((x) => x.id === item.product_id);
    if (!p || p.status !== "satista") return fail("Sepetinizdeki bir ürün artık satışta değil. Sepeti yenileyin.");
    if (p.seller_id === user.id) return fail(`"${p.title}" sizin ürününüz; satın alamazsınız.`);
    if (!keyOf[p.seller_id]) return fail(`"${p.title}" satıcısı henüz online ödeme almıyor.`);
    if (p.delivery !== "ikisi" && p.delivery !== item.delivery) item.delivery = p.delivery;
    const { data: blocked } = await db.rpc("is_blocked_between", { a: user.id, b: p.seller_id }).then((r) => r, () => ({ data: false }));
    if (blocked === true) return fail(`"${p.title}" satıcısıyla alışveriş yapamazsınız.`);
    const offer = (offers ?? []).find((o) => o.product_id === p.id && (!o.expires_at || new Date(o.expires_at) > new Date()));
    if (offer && item.qty !== 1) return fail(`"${p.title}" teklif fiyatıyla yalnız 1 adet alınabilir.`);
    lines.push({ item, p, unit: offer ? Number(offer.amount) : Number(p.price), offerId: offer?.id ?? null });
  }
  if (lines.some((l) => l.unit <= 0)) return fail("Ücretsiz ürünler online ödemeyle alınamaz; satıcıya yazın.");
  const total = round2(lines.reduce((s, l) => s + l.unit * l.item.qty, 0));

  const shipping = { ...addr, country: "Türkiye" };
  const returnUrl = (() => {
    try { const u = new URL(String(body.return_url ?? "")); return /^https?:$/.test(u.protocol) ? `${u.origin}${u.pathname}` : SITE_URL; }
    catch { return SITE_URL; }
  })();
  const { data: co, error: ce } = await db.from("checkouts")
    .insert({ buyer_id: user.id, total, shipping_address: shipping, return_url: returnUrl }).select("id").single();
  if (ce) throw ce;

  // Her ürün için sohbet (satıcıyla yazışma) ve "ödeme bekliyor" siparişi
  const basketItems = [];
  for (const l of lines) {
    const { data: conv, error: cvErr } = await db.from("conversations")
      .upsert({ product_id: l.p.id, buyer_id: user.id, seller_id: l.p.seller_id }, { onConflict: "product_id,buyer_id" })
      .select("id").single();
    if (cvErr) throw cvErr;
    const { data: order, error: oe } = await db.from("orders").insert({
      conversation_id: conv.id, product_id: l.p.id, buyer_id: user.id, seller_id: l.p.seller_id,
      quantity: l.item.qty, unit_price: l.unit, delivery: l.item.delivery, buyer_agreed: true,
      status: "teklif", payment_status: "bekliyor", checkout_id: co.id, offer_id: l.offerId,
      shipping_address: l.item.delivery === "kargo" ? shipping : null, created_by: user.id,
    }).select("id").single();
    if (oe) throw oe;
    const linePrice = round2(l.unit * l.item.qty);
    basketItems.push({
      id: order.id, name: String(l.p.title).slice(0, 100), category1: catName[l.p.category] || "El emeği",
      itemType: "PHYSICAL", price: price(linePrice),
      subMerchantKey: keyOf[l.p.seller_id], subMerchantPrice: price(round2(linePrice * (1 - COMMISSION))),
    });
  }

  const fullAddress = `${addr.line}, ${addr.district}/${addr.city}`;
  const iyzAddress = { contactName: `${addr.name} ${addr.surname}`, city: addr.city, country: "Turkey", address: fullAddress };
  try {
    const r = await iyzico("POST", "/payment/iyzipos/checkoutform/initialize/auth/ecom", {
      conversationId: co.id, price: price(total), paidPrice: price(total), currency: "TRY",
      basketId: co.id, paymentGroup: "PRODUCT", enabledInstallments: [1],
      callbackUrl: `${SUPABASE_URL}/functions/v1/odeme-sonuc?c=${co.id}`,
      buyer: {
        id: user.id, name: addr.name, surname: addr.surname, gsmNumber: addr.phone, email: user.email || "alici@femoria.local",
        identityNumber: "11111111111", // alıcının TC'si istenmez (iyzico'nun önerdiği yer tutucu)
        registrationAddress: fullAddress, city: addr.city, country: "Turkey", ip: clientIp(req),
      },
      shippingAddress: iyzAddress, billingAddress: iyzAddress, basketItems,
    });
    await db.from("checkouts").update({ iyzico_token: r.token }).eq("id", co.id);
    return json({ checkout_id: co.id, payment_page_url: r.paymentPageUrl, token: r.token });
  } catch (e) {
    await db.from("checkouts").update({ status: "basarisiz", error: String((e as Error).message).slice(0, 300) }).eq("id", co.id);
    await db.from("orders").update({ status: "iptal", payment_status: "basarisiz" }).eq("checkout_id", co.id);
    throw e;
  }
}

// ---------- Teslim onayı: satıcının parasını serbest bırak ----------
async function confirm(user: { id: string }, body: Record<string, unknown>) {
  const db = admin();
  const { data: o } = await db.from("orders").select("*").eq("id", String(body.order_id ?? "")).maybeSingle();
  if (!o || o.buyer_id !== user.id) return fail("Sipariş bulunamadı.", 404);
  if (o.payment_status !== "odendi" || o.payout_status !== "bekliyor" || o.status === "iptal") return fail("Bu sipariş onaylanamaz.");
  await iyzico("POST", "/payment/iyzipos/item/approve", { conversationId: o.id, paymentTransactionId: o.iyzico_tx_id });
  const now = new Date().toISOString();
  await db.from("orders").update({
    status: "teslim_edildi", shipping_status: "teslim_edildi", payout_status: "onaylandi", delivered_at: now, confirmed_at: now,
  }).eq("id", o.id);
  await db.rpc("post_system_note", { p_conversation_id: o.conversation_id, p_body: "Alıcı ürünü teslim aldığını onayladı. Ödeme satıcıya aktarılıyor." });
  await db.rpc("refresh_badges", { p_user: o.seller_id }).then(() => {}, () => {});
  return json({ ok: true });
}

// ---------- İptal ve iade ----------
async function cancel(req: Request, user: { id: string }, body: Record<string, unknown>) {
  const db = admin();
  const { data: o } = await db.from("orders").select("*").eq("id", String(body.order_id ?? "")).maybeSingle();
  if (!o || (o.buyer_id !== user.id && o.seller_id !== user.id)) return fail("Sipariş bulunamadı.", 404);
  if (o.payment_status !== "odendi" || o.payout_status !== "bekliyor" || o.status === "iptal") return fail("Bu sipariş iptal edilemez.");
  if (o.buyer_id === user.id && o.shipping_status === "kargoda") return fail("Ürün kargoya verildi; iptal için satıcıya yazın.");
  await iyzico("POST", "/payment/refund", {
    conversationId: o.id, paymentTransactionId: o.iyzico_tx_id, price: price(Number(o.unit_price) * o.quantity),
    ip: clientIp(req), currency: "TRY",
  });
  await db.from("orders").update({ status: "iptal", payment_status: "iade", payout_status: "iade" }).eq("id", o.id);
  await db.rpc("post_system_note", {
    p_conversation_id: o.conversation_id,
    p_body: o.buyer_id === user.id ? "Alıcı siparişi iptal etti. Ödeme iade edildi." : "Satıcı siparişi iptal etti. Ödeme iade edildi.",
  });
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Yalnız POST", 405);
  if (!iyzicoConfigured()) return fail("Online ödeme henüz açılmadı (iyzico anahtarları tanımlı değil).", 503);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = await admin().auth.getUser(token);
  if (!user) return fail("Giriş yapmanız gerekiyor.", 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail("Geçersiz istek"); }

  try {
    switch (body.mode) {
      case "payout_setup": return await payoutSetup(user, body);
      case "checkout": return await checkout(req, user, body);
      case "confirm": return await confirm(user, body);
      case "cancel": return await cancel(req, user, body);
      default: return fail("Bilinmeyen işlem");
    }
  } catch (e) {
    console.error("[odeme]", body.mode, e);
    const msg = (e as any)?.iyzico?.errorMessage || (e as Error)?.message || "Ödeme işlemi şu an yapılamıyor";
    return json({ error: `Ödeme işlemi yapılamadı: ${msg}` }, 502);
  }
});
