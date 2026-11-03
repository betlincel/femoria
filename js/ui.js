// Küçük arayüz yardımcıları: DOM oluşturma, bildirim, alt sayfa, ses, görsel.
import { icon } from "./icons.js";

export { icon };

/** h("button", { class: "btn", onclick }, "Metin") */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
    else if (k in el && typeof v !== "string") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const $ = (sel, root = document) => root.querySelector(sel);

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// ---------- Biçimlendirme ----------
const tl = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
export const formatPrice = (n) => `${tl.format(Number(n || 0))} TL`;

export function formatDistance(km) {
  if (km == null || Number.isNaN(km)) return "";
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} metre`;
  return `${tl.format(Math.round(km * 10) / 10)} km`;
}

export function timeAgo(date) {
  const s = (Date.now() - new Date(date).getTime()) / 1000;
  if (s < 60) return "az önce";
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)} saat önce`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} gün önce`;
  return new Date(date).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

export const clockTime = (d) => new Date(d).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export function monthsSince(date) {
  const d = new Date(date);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth());
}

export function greeting(name) {
  const hr = new Date().getHours();
  const g = hr < 11 ? "Günaydın" : hr < 18 ? "İyi günler" : "İyi akşamlar";
  return name ? `${g} ${name.split(" ")[0]} Hanım` : `${g}`;
}

// ---------- Bildirim ve alt sayfa ----------
let toastTimer;
export function toast(msg, ms = 3200) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), ms);
}

/** Alt sayfa açar. content: Node | (close) => Node. Döndürür: close() */
export function sheet(title, content) {
  const root = $("#sheet-root");
  const close = () => {
    backdrop.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => e.key === "Escape" && close();
  const body = typeof content === "function" ? content(close) : content;
  const backdrop = h("div", { class: "sheet-backdrop", onclick: (e) => e.target === backdrop && close() },
    h("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title },
      title ? h("h2", {}, title) : null,
      body,
    ),
  );
  root.append(backdrop);
  document.addEventListener("keydown", onKey);
  backdrop.querySelector("button, input, textarea, select")?.focus();
  return close;
}

/** Evet/Hayır sorusu — Promise<boolean> */
export function ask(title, text, yes = "Evet", no = "Vazgeç") {
  return new Promise((resolve) => {
    sheet(title, (close) => h("div", { class: "stack" },
      text ? h("p", {}, text) : null,
      h("button", { class: "btn btn-primary", onclick: () => { close(); resolve(true); } }, yes),
      h("button", { class: "btn btn-secondary", onclick: () => { close(); resolve(false); } }, no),
    ));
  });
}

export function loading(text = "Yükleniyor…") {
  return h("div", { class: "stack", "aria-busy": "true" },
    h("span", { class: "sr-only" }, text),
    h("div", { class: "skeleton" }), h("div", { class: "skeleton" }),
  );
}

/** İkonlu, metinli düğme içeriği: [ikon, "Metin"] */
export const withIcon = (name, label) => [icon(name), label];

export function iconCircle(name, cls = "") {
  return h("div", { class: `icon-circle ${cls}`, "aria-hidden": "true" }, icon(name));
}

export function statusScreen(name, text, { spin = false } = {}) {
  const c = iconCircle(name);
  if (spin) c.firstChild.classList.add("spin");
  return h("div", { class: "status-screen" }, c, h("p", {}, text));
}

export function emptyState(iconName, title, text, action) {
  return h("div", { class: "empty" },
    iconCircle(iconName),
    h("h3", {}, title),
    text ? h("p", {}, text) : null,
    action || null,
  );
}

// ---------- Ses: sesli okuma (TTS) ----------
// İsteğe bağlıdır ve varsayılan olarak kapalıdır. Kapalıyken yalnızca kullanıcı
// "Dinle" düğmesine bastığında okunur ({ force: true }).
let ttsEnabled = false;
export const setTTS = (on) => (ttsEnabled = !!on);
export const ttsOn = () => ttsEnabled;
export const canSpeak = "speechSynthesis" in window;

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel();
}

export function speak(text, { force = false } = {}) {
  if ((!ttsEnabled && !force) || !canSpeak || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).replace(/[\u{1F300}-\u{1FAFF}]/gu, ""));
  u.lang = "tr-TR";
  u.rate = 0.92;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("tr"));
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

// ---------- Ses: konuşmayı yazıya çevirme (tarayıcı içi) ----------
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!Recognition;

/** Dinlemeye başlar; stop() döndürür. onText(fullText, isFinal) */
export function listen({ onText, onEnd, onError } = {}) {
  if (!Recognition) {
    onError?.("Bu telefon sesle yazmayı desteklemiyor. Klavyeyle yazabilirsiniz.");
    return () => {};
  }
  const rec = new Recognition();
  rec.lang = "tr-TR";
  rec.interimResults = true;
  rec.continuous = true;
  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript + " ";
      else interim += r[0].transcript;
    }
    onText?.((finalText + interim).trim(), !interim);
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed") onError?.("Mikrofon izni verilmedi. Telefon ayarlarından izin verebilirsiniz.");
    else if (e.error !== "no-speech" && e.error !== "aborted") onError?.("Sesinizi alamadım, bir daha dener misiniz?");
  };
  rec.onend = () => onEnd?.(finalText.trim());
  rec.start();
  return () => rec.stop();
}

/**
 * Mikrofon düğmesi. Basılı tutunca dinler, bırakınca durur;
 * kısa dokunuşta açık kalır, ikinci dokunuşta durur.
 */
export function micButton({ onText, onEnd, size = "lg", label = "Konuşmak için basılı tutun" } = {}) {
  let stop = null;
  let downAt = 0;
  const btn = h("button", {
    type: "button",
    class: size === "lg" ? "mic-btn" : "mic-sm",
    "aria-label": label,
    title: label,
  }, icon("mic"));

  const start = () => {
    if (stop) return;
    btn.classList.add("listening");
    stop = listen({
      onText,
      onEnd: (t) => { btn.classList.remove("listening"); stop = null; onEnd?.(t); },
      onError: (m) => { toast(m); btn.classList.remove("listening"); stop = null; },
    });
  };
  const end = () => { if (stop) { stop(); } };

  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (stop) { end(); downAt = 0; return; }
    downAt = Date.now();
    start();
  });
  btn.addEventListener("pointerup", () => {
    if (downAt && Date.now() - downAt > 500) end(); // basılı tutup bıraktı
    downAt = 0;
  });
  btn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); stop ? end() : start(); }
  });
  return btn;
}

// ---------- Görsel: küçültme + otomatik ışık düzeltme ----------
export async function prepareImage(source, maxSide = 1280) {
  const img = await loadImage(source);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const hgt = Math.round(img.height * scale);
  const canvas = Object.assign(document.createElement("canvas"), { width: w, height: hgt });
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, hgt);
  autoLevels(ctx, w, hgt);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (source instanceof Blob) img.src = URL.createObjectURL(source);
    else img.src = source;
  });
}

// Loş ışıkta çekilmiş fotoğrafı aydınlatır: %1–%99 aralığını tam aralığa yayar.
function autoLevels(ctx, w, hgt) {
  const data = ctx.getImageData(0, 0, w, hgt);
  const px = data.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) hist[(px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0]++;
  const total = px.length / 4;
  let lo = 0, hi = 255, acc = 0;
  while (lo < 255 && (acc += hist[lo]) < total * 0.01) lo++;
  acc = 0;
  while (hi > 0 && (acc += hist[hi]) < total * 0.01) hi--;
  if (hi - lo < 40 || (lo < 8 && hi > 247)) return; // zaten iyi
  const k = 255 / (hi - lo);
  for (let i = 0; i < px.length; i += 4) {
    px[i] = Math.min(255, Math.max(0, (px[i] - lo) * k));
    px[i + 1] = Math.min(255, Math.max(0, (px[i + 1] - lo) * k));
    px[i + 2] = Math.min(255, Math.max(0, (px[i + 2] - lo) * k));
  }
  ctx.putImageData(data, 0, 0);
}

export async function dataUrlToBlob(dataUrl) {
  return (await fetch(dataUrl)).blob();
}

// ---------- Akıllı mesaj kalkanı (istemci tarafı ön uyarı) ----------
// Sunucudaki message_shield_flags() ile aynı kurallar.
export function shieldCheck(text) {
  const t = String(text || "");
  const flags = [];
  if (/(\+?9\s*0|0)?\s*\(?5\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/i.test(t)) flags.push("telefon");
  if (/tr\s*\d{2}[\s\d]{20,}/i.test(t) || /\biban\b/i.test(t)) flags.push("iban");
  if (/(sokak|sok\.|cadde|cad\.|bulvar|apartman|apt\.|daire|kap[ıi] no|no\s*:\s*\d)/i.test(t)) flags.push("adres");
  if (/(kapora|[öo]n [öo]deme|[öo]nce (para|[öo]deme)|havale yap|eft yap|[şs]ifre|kart numara)/i.test(t)) flags.push("dolandiricilik");
  return flags;
}
