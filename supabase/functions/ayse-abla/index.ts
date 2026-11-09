// Ayşe Abla — yapay zeka asistanı (Supabase Edge Function, Deno)
//
// POST /functions/v1/ayse-abla
//   { mode: "chat",       messages: [{role, content}], screen?, userName? (hitap: "Ayşe Hanım", "Erdem Bey" ya da yalnız ad) }
//       -> { reply, buttons, highlight, search }
//   { mode: "describe",   transcript }                -> { title, description, category }
//   { mode: "transcribe", path }  (voice-messages kovası) -> { text }
//   { mode: "speak",      text }  -> ses dosyası (application/octet-stream; Gemini'de WAV, OpenAI'da MP3) — Ayşe Abla'nın kadın sesi
//
// Sağlayıcı: GEMINI_API_KEY tanımlıysa Google Gemini, değilse OpenAI kullanılır.
// Gizli değerler (supabase secrets set ...):
//   Gemini
//     GEMINI_API_KEY        — Gemini için zorunlu (Google AI Studio → Get API key)
//     GEMINI_MODEL          — isteğe bağlı (varsayılan: gemini-3.8-flash)
//     GEMINI_TTS_MODEL      — isteğe bağlı (varsayılan: gemini-3.8-flash-tts)
//     GEMINI_TTS_VOICE      — isteğe bağlı (varsayılan: Sulafat — sıcak bir kadın sesi; alternatifler: Kore, Aoede, Achernar)
//     GEMINI_THINKING_LEVEL — isteğe bağlı (ör. "low"; boşsa modelin varsayılanı)
//   OpenAI (yedek; Gemini anahtarı yoksa ya da sesli mesaj Gemini'de yazıya dökülemezse)
//     OPENAI_API_KEY, OPENAI_MODEL (gpt-4o-mini), OPENAI_TTS_MODEL (gpt-4o-mini-tts), OPENAI_TTS_VOICE (coral)
//
// Anahtarlar tarayıcıya hiç gitmez; tüm çağrılar buradan geçer.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { corsHeaders, json } from "../_shared/cors.ts";
import { CATEGORY_SLUGS, DESCRIBE_PROMPT, HIGHLIGHTS, systemPrompt } from "../_shared/persona.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash";
const GEMINI_TTS_MODEL = Deno.env.get("GEMINI_TTS_MODEL") ?? "gemini-3.8-flash-tts";
const GEMINI_TTS_VOICE = Deno.env.get("GEMINI_TTS_VOICE") ?? "Sulafat";
const GEMINI_THINKING_LEVEL = Deno.env.get("GEMINI_THINKING_LEVEL");
const GEMINI_URL = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
const TTS_MODEL = Deno.env.get("OPENAI_TTS_MODEL") ?? "gpt-4o-mini-tts";
const TTS_VOICE = Deno.env.get("OPENAI_TTS_VOICE") ?? "coral";
const TTS_MAX_CHARS = 600; // istemci uzun metinleri cümle cümle böler

const USE_GEMINI = !!GEMINI_API_KEY;

// Ayşe Abla'nın ses tonu (OpenAI gpt-4o-mini-tts ve Gemini TTS doğal dilde ton tarifini anlar)
const TTS_INSTRUCTIONS =
  "Ellili yaşlarda, sıcak, sakin ve şefkatli bir Türk kadın gibi konuş. " +
  "Yavaş ve net konuş; mahallenin sevilen ablası gibi içten ve güven veren bir tonla. Doğal Türkçe vurgular kullan.";
const MAX_HISTORY = 12;

type ChatMessage = { role: "user" | "assistant"; content: string };

async function openaiJSON(system: string, messages: ChatMessage[], maxTokens = 300) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.4,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
}

// ---------- Gemini ----------
async function gemini(model: string, payload: Record<string, unknown>) {
  const res = await fetch(GEMINI_URL(model), {
    method: "POST",
    headers: { "x-goog-api-key": GEMINI_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  return await res.json();
}

const geminiText = (data: any) =>
  (data?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("").trim();

async function geminiJSON(system: string, messages: ChatMessage[], maxTokens = 300) {
  const generationConfig: Record<string, unknown> = {
    temperature: 0.4,
    // Düşünme belirteçleri de bu sınıra sayılabildiği için cömert tutulur; kısalığı persona sağlar.
    maxOutputTokens: Math.max(maxTokens * 4, 1024),
    responseMimeType: "application/json",
  };
  if (GEMINI_THINKING_LEVEL) generationConfig.thinkingConfig = { thinkingLevel: GEMINI_THINKING_LEVEL };
  const data = await gemini(GEMINI_MODEL, {
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    generationConfig,
  });
  const text = geminiText(data).replace(/^```(?:json)?\s*|\s*```$/g, "");
  return JSON.parse(text || "{}");
}

const askJSON = (system: string, messages: ChatMessage[], maxTokens = 300) =>
  USE_GEMINI ? geminiJSON(system, messages, maxTokens) : openaiJSON(system, messages, maxTokens);

// Gemini TTS ham PCM (16 bit, tek kanal) döndürür; tarayıcının çalabilmesi için WAV başlığı eklenir.
function pcmToWav(pcm: Uint8Array, sampleRate = 24000, channels = 1, bits = 16) {
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const str = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + pcm.length, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * channels * bits / 8, true);
  v.setUint16(32, channels * bits / 8, true); v.setUint16(34, bits, true);
  str(36, "data"); v.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length);
  out.set(new Uint8Array(header), 0); out.set(pcm, 44);
  return out;
}

function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1000) }));
}

async function chat(body: Record<string, unknown>) {
  const messages = sanitizeHistory(body.messages);
  if (!messages.length) return json({ error: "messages boş" }, 400);
  const out = await askJSON(
    systemPrompt(String(body.screen ?? ""), body.userName ? String(body.userName).slice(0, 40) : undefined),
    messages,
  );
  return json({
    reply: String(out.reply ?? "Bir daha söyler misiniz? Tam anlayamadım."),
    buttons: Array.isArray(out.buttons) ? out.buttons.slice(0, 3).map(String) : [],
    highlight: HIGHLIGHTS.includes(out.highlight) ? out.highlight : null,
    search: out.search ? String(out.search).slice(0, 80) : null,
  });
}

async function describe(body: Record<string, unknown>) {
  const transcript = String(body.transcript ?? "").trim().slice(0, 1500);
  if (transcript.length < 3) return json({ error: "transcript boş" }, 400);
  const out = await askJSON(DESCRIBE_PROMPT, [{ role: "user", content: transcript }], 250);
  const category = (CATEGORY_SLUGS as readonly string[]).includes(out.category) ? out.category : "diger";
  return json({
    title: String(out.title ?? "").slice(0, 120),
    description: String(out.description ?? "").slice(0, 2000),
    category,
  });
}

async function transcribe(req: Request, body: Record<string, unknown>) {
  const path = String(body.path ?? "");
  if (!path) return json({ error: "path gerekli" }, 400);

  // Kullanıcının kendi oturumuyla indir: Storage RLS yalnız sohbet katılımcısına izin verir.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: file, error } = await supabase.storage.from("voice-messages").download(path);
  if (error || !file) return json({ error: "Ses dosyasına erişilemedi" }, 403);

  const name = path.split("/").pop() ?? "ses.webm";
  if (USE_GEMINI) {
    try {
      const ext = name.split(".").pop()?.toLowerCase() ?? "";
      const byExt: Record<string, string> = { webm: "audio/webm", ogg: "audio/ogg", mp4: "audio/mp4", m4a: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac" };
      const mimeType = (file.type || byExt[ext] || "audio/webm").split(";")[0];
      const data = await gemini(GEMINI_MODEL, {
        contents: [{
          role: "user",
          parts: [
            { text: "Bu Türkçe sesli mesajı kelimesi kelimesine yazıya dök. Yalnızca söylenenleri yaz; açıklama, başlık ya da tırnak ekleme." },
            { inlineData: { mimeType, data: encodeBase64(new Uint8Array(await file.arrayBuffer())) } },
          ],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 2048 },
      });
      return json({ text: geminiText(data) });
    } catch (e) {
      if (!OPENAI_API_KEY) throw e;
      console.warn("Gemini sesi yazıya dökemedi, OpenAI'ya geçiliyor:", e);
    }
  }

  const form = new FormData();
  form.append("file", file, name);
  form.append("model", "whisper-1");
  form.append("language", "tr");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const { text } = await res.json();
  return json({ text: String(text ?? "") });
}

async function speak(body: Record<string, unknown>) {
  const text = String(body.text ?? "").replace(/\s+/g, " ").trim().slice(0, TTS_MAX_CHARS);
  if (!text) return json({ error: "text boş" }, 400);
  if (USE_GEMINI) {
    const data = await gemini(GEMINI_TTS_MODEL, {
      contents: [{ role: "user", parts: [{ text: `${TTS_INSTRUCTIONS}\nŞu metni bu tonla oku:\n${text}` }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE } } },
      },
    });
    const part = (data?.candidates?.[0]?.content?.parts ?? []).find((p: any) => p.inlineData?.data);
    if (!part) throw new Error("Gemini TTS ses döndürmedi");
    const raw = Uint8Array.from(atob(part.inlineData.data), (c) => c.charCodeAt(0));
    const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType ?? "")?.[1]) || 24000;
    const wav = /wav/i.test(part.inlineData.mimeType ?? "") ? raw : pcmToWav(raw, rate);
    return new Response(wav, {
      headers: { ...corsHeaders, "Content-Type": "application/octet-stream", "Cache-Control": "private, max-age=86400" },
    });
  }
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: text,
      response_format: "mp3",
      ...(TTS_MODEL.startsWith("gpt-4o") ? { instructions: TTS_INSTRUCTIONS } : { speed: 0.95 }),
    }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${await res.text()}`);
  // application/octet-stream → supabase-js functions.invoke bunu Blob olarak döndürür
  return new Response(res.body, {
    headers: { ...corsHeaders, "Content-Type": "application/octet-stream", "Cache-Control": "private, max-age=86400" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Yalnız POST" }, 405);
  if (!GEMINI_API_KEY && !OPENAI_API_KEY) return json({ error: "GEMINI_API_KEY (ya da OPENAI_API_KEY) tanımlı değil", fallback: true }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Geçersiz JSON" }, 400);
  }

  try {
    switch (body.mode) {
      case "chat":
        return await chat(body);
      case "describe":
        return await describe(body);
      case "transcribe":
        return await transcribe(req, body);
      case "speak":
        return await speak(body);
      default:
        return json({ error: "Bilinmeyen mode" }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: "Asistan şu an cevap veremiyor", fallback: true }, 502);
  }
});
