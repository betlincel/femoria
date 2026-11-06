// Femoria — gece temizliği (Supabase Edge Function, Deno)
//
// Silinir:
//   1) Hiçbir ürüne ait olmayan ürün fotoğrafları (yarım kalmış yüklemeler, kaldırılan ürünlerden
//      silinemeyip kalan dosyalar; 1 günden eski)
//   2) Sohbeti artık olmayan sesli mesajlar (ör. karşı taraf hesabını sildiyse)
//
// Çağıran: pg_cron (supabase/cron/purge-schedule.sql), her gece.
// Güvenlik: yalnız doğru "x-cron-secret" başlığıyla çalışır.
//   supabase secrets set PURGE_CRON_SECRET=<uzun-rastgele-değer>
//   supabase functions deploy purge-removed-photos --no-verify-jwt
//
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY Supabase tarafından otomatik sağlanır.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = Deno.env.get("PURGE_CRON_SECRET");
const BATCH = 100; // Storage remove() tek seferde en fazla bu kadar dosya

type Candidate = { bucket: string; path: string; product_id: string | null; reason: string };

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Yalnız POST", { status: 405 });
  if (!SECRET) return new Response("PURGE_CRON_SECRET tanımlı değil", { status: 503 });
  if (!timingSafeEqual(req.headers.get("x-cron-secret") ?? "", SECRET)) {
    return new Response("Yetkisiz", { status: 401 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc("storage_cleanup_candidates");
  if (error) {
    console.error("Temizlik listesi alınamadı:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  const candidates = (data ?? []) as Candidate[];

  const summary: Record<string, number> = {};
  const failed: string[] = [];

  // Kova bazında, 100'erli gruplar halinde sil
  for (const bucket of [...new Set(candidates.map((c) => c.bucket))]) {
    const items = candidates.filter((c) => c.bucket === bucket);
    for (let i = 0; i < items.length; i += BATCH) {
      const chunk = items.slice(i, i + BATCH);
      const { error: rmError } = await supabase.storage.from(bucket).remove(chunk.map((c) => c.path));
      for (const c of chunk) {
        if (rmError) failed.push(`${bucket}/${c.path}`);
        else summary[c.reason] = (summary[c.reason] ?? 0) + 1;
      }
      if (rmError) console.error(`${bucket} silme hatası:`, rmError);
    }
  }

  const result = { ok: failed.length === 0, deleted: summary, failed: failed.length };
  console.log("Temizlik tamamlandı:", JSON.stringify(result));
  return Response.json(result);
});
