// iyzico API istemcisi (IYZWSv2 imzası) — resmi iyzipay-node kütüphanesiyle aynı yöntem:
//   imza = HMAC-SHA256(secretKey, randomKey + uriPath + gövdeJSON)  (hex)
//   Authorization: "IYZWSv2 " + base64("apiKey:<k>&randomKey:<r>&signature:<imza>"), x-iyzi-rnd: <r>
// Anahtarlar yalnız Edge Function ortamında durur (supabase secrets set IYZICO_API_KEY=... IYZICO_SECRET_KEY=...).

const API_KEY = Deno.env.get("IYZICO_API_KEY") ?? "";
const SECRET_KEY = Deno.env.get("IYZICO_SECRET_KEY") ?? "";
export const IYZICO_BASE_URL = (Deno.env.get("IYZICO_BASE_URL") ?? "https://sandbox-api.iyzipay.com").replace(/\/$/, "");
export const iyzicoConfigured = () => !!(API_KEY && SECRET_KEY);

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hmacHex(key: string, data: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

/** IYZWSv2 yetki bilgisi (base64). Test edilebilsin diye ayrı. */
export async function authToken(apiKey: string, secretKey: string, rnd: string, path: string, json: string) {
  const signature = await hmacHex(secretKey, rnd + path + json);
  return btoa(`apiKey:${apiKey}&randomKey:${rnd}&signature:${signature}`);
}

/** iyzico'nun beklediği fiyat biçimi: "120.0", "99.9", "12.35" */
export function price(n: number): string {
  const s = (Math.round(n * 100) / 100).toString();
  return s.includes(".") ? s : `${s}.0`;
}

export type IyzicoResponse = Record<string, any> & { status?: string; errorCode?: string; errorMessage?: string };

/** İmzalı istek. Başarısızlıkta errorMessage ile hata fırlatır. */
export async function iyzico(method: "POST" | "PUT", path: string, body: Record<string, unknown>): Promise<IyzicoResponse> {
  if (!iyzicoConfigured()) throw new Error("iyzico anahtarları tanımlı değil (IYZICO_API_KEY, IYZICO_SECRET_KEY)");
  const json = JSON.stringify({ locale: "tr", ...body });
  const rnd = `${Date.now()}${crypto.getRandomValues(new Uint32Array(2)).join("")}`;
  const auth = await authToken(API_KEY, SECRET_KEY, rnd, path, json);
  const res = await fetch(IYZICO_BASE_URL + path, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `IYZWSv2 ${auth}`, "x-iyzi-rnd": rnd },
    body: json,
  });
  const data: IyzicoResponse = await res.json().catch(() => ({ status: "failure", errorMessage: `HTTP ${res.status}` }));
  if (data.status !== "success") {
    throw Object.assign(new Error(data.errorMessage || `iyzico hatası (${res.status})`), { iyzico: data });
  }
  return data;
}
