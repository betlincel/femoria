// Ayşe Abla — yapay zeka asistanı (Supabase Edge Function, Deno)
//
// POST /functions/v1/ayse-abla
//   { mode: "chat",       messages: [{role, content}], screen?, userName? }
//       -> { reply, buttons, highlight, search }
//   { mode: "describe",   transcript }                -> { title, description, category }
//   { mode: "transcribe", path }  (voice-messages kovası) -> { text }
//
// Gizli anahtarlar (supabase secrets set ...):
//   OPENAI_API_KEY   — zorunlu
//   OPENAI_MODEL     — isteğe bağlı (varsayılan: gpt-4o-mini)
//
// OpenAI anahtarı tarayıcıya hiç gitmez; tüm çağrılar buradan geçer.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { CATEGORY_SLUGS, DESCRIBE_PROMPT, HIGHLIGHTS, systemPrompt } from "../_shared/persona.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
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
  const out = await openaiJSON(
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
  const out = await openaiJSON(DESCRIBE_PROMPT, [{ role: "user", content: transcript }], 250);
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

  const form = new FormData();
  form.append("file", file, path.split("/").pop() ?? "ses.webm");
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Yalnız POST" }, 405);
  if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY tanımlı değil", fallback: true }, 503);

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
      default:
        return json({ error: "Bilinmeyen mode" }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: "Asistan şu an cevap veremiyor", fallback: true }, 502);
  }
});
