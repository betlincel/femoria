// Femoria — iyzico ödeme dönüşü (callback). iyzico ödeme sayfası bittiğinde buraya POST eder.
// Güvenlik: gelen veriye güvenilmez; sonuç her zaman iyzico'dan, kayıtlı token ile yeniden sorgulanır
// ve tutar / sepet kimliği kontrol edilir. JWT yoktur (iyzico çağırır): verify_jwt = false.
// Başarısız ödemede ayrılan stok geri eklenir. Sonunda kullanıcı "Siparişlerim" sayfasına yönlendirilir.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { finalizeCheckout } from "../_shared/orders.ts";

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
  try {
    const r = await finalizeCheckout(db, co);
    return back(co.return_url, r.ok ? "basarili" : "basarisiz", r.note ?? "");
  } catch (e) {
    console.error("[odeme-sonuc]", e);
    return back(co.return_url, "basarisiz", "Ödeme sonucu alınamadı; kısa süre içinde kendiliğinden kontrol edilecek");
  }
});
