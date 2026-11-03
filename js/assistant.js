// Ayşe Abla — her ekranın sağ altında yüzen asistan.
// Bölüm 3: persona, proaktif yardım tetikleyicileri ve "anket hissi vermeden" geri bildirim.
import { h, $, speak, stopSpeaking, ttsOn, canSpeak, micButton, icon, hitap } from "./ui.js";
import { ayseAvatar } from "./icons.js";
import { state, LS, saveSettings } from "./store.js";
import { navigate, currentScreen, onRoute } from "./router.js";
import { askAssistant, track, saveFeedback, logSearchRequest } from "./api.js";

const panel = () => $("#assistant-panel");
const fab = () => $("#assistant-fab");
const history = JSON.parse(sessionStorage.getItem("femoria:ayse") || "[]"); // {role, content}
let snoozed = sessionStorage.getItem("femoria:ayse-snooze") === "1"; // "Sonra" → bu oturumda kendiliğinden çıkmaz
let idleTimer = null;
let waitForSearch = false; // "Aradığınızı bulabildiniz mi?" → "Hayır" sonrası söylenen kelime kaydedilir
let log, choices;

// Metin olarak gelen bazı seçeneklerin doğrudan bir işi var.
const KNOWN_ACTIONS = {
  "Rehberi aç": () => { close(); navigate("/rehber"); },
};

const save = () => sessionStorage.setItem("femoria:ayse", JSON.stringify(history.slice(-20)));
// Hitap: "Ayşe Hanım", "Erdem Bey" ya da yalnız ad (cinsiyet belirtilmediyse)
const name = () => hitap(state.profile?.full_name, state.profile?.gender);

// ---------- Panel ----------
function buildPanel() {
  log = h("div", { class: "assistant-log", "aria-live": "polite" });
  choices = h("div", { class: "assistant-choices" });
  const input = h("input", { class: "input", placeholder: "Bana yazın…", "aria-label": "Ayşe Abla'ya yazın", enterkeyhint: "send" });
  const send = () => { const t = input.value.trim(); if (t) { input.value = ""; userSays(t); } };
  input.addEventListener("keydown", (e) => e.key === "Enter" && send());

  // Sesli okuma isteğe bağlı: başlıktaki hoparlör düğmesi açar/kapatır.
  const ttsBtn = h("button", { class: "icon-btn", type: "button" });
  const drawTts = () => {
    const on = ttsOn();
    ttsBtn.replaceChildren(icon(on ? "volume" : "volume-x", 22));
    ttsBtn.setAttribute("aria-pressed", String(on));
    ttsBtn.setAttribute("aria-label", on ? "Sesli okumayı kapat" : "Sesli okumayı aç");
    ttsBtn.title = on ? "Sesli okuma açık" : "Sesli okuma kapalı";
  };
  ttsBtn.addEventListener("click", async () => {
    const on = !ttsOn();
    await saveSettings({ tts_enabled: on });
    if (!on) stopSpeaking();
    drawTts();
  });
  drawTts();

  panel().replaceChildren(
    h("div", { class: "assistant-head" },
      ayseAvatar(state.profile?.assistant_look, 48),
      h("div", { class: "who" }, h("strong", {}, "Ayşe Abla"), h("div", { class: "small muted" }, "Takıldığınız her an buradayım")),
      canSpeak ? ttsBtn : null,
      h("button", { class: "icon-btn", "aria-label": "Kapat", onclick: close }, icon("x", 22)),
    ),
    log,
    choices,
    h("div", { class: "assistant-input" },
      input,
      micButton({ size: "sm", label: "Konuşarak sorun", onText: (t) => (input.value = t), onEnd: (t) => t && (input.value = "", userSays(t)) }),
      h("button", { class: "send-btn", "aria-label": "Gönder", onclick: send }, icon("send")),
    ),
  );
  for (const m of history) addBubble(m.role === "user" ? "me" : "them", m.content, false);
}

function addBubble(who, text, scroll = true) {
  // Ayşe Abla'nın her mesajında isteğe bağlı "Dinle" düğmesi (otomatik okuma kapalı olsa da)
  const listen = who === "them" && canSpeak
    ? h("button", { class: "listen-btn", "aria-label": "Bu mesajı sesli dinle", title: "Dinle", onclick: () => speak(text, { force: true }) }, icon("volume"))
    : null;
  log.append(h("div", { class: `bubble ${who}` }, h("span", { class: "text" }, text), listen));
  if (scroll) log.scrollTop = log.scrollHeight;
}

export function open() {
  if (panel().hidden) {
    panel().hidden = false;
    track("assistant_opened", { screen: currentScreen() });
  }
}

export function close() {
  panel().hidden = true;
  stopSpeaking();
}

/** Ayşe Abla konuşur: balon + sesli okuma + seçenek düğmeleri. */
export function say(text, buttons = [], { open: doOpen = true } = {}) {
  if (doOpen) open();
  addBubble("them", text);
  history.push({ role: "assistant", content: text });
  save();
  speak(text);
  setChoices(buttons);
}

function setChoices(buttons) {
  choices.replaceChildren(...buttons.map((b) => {
    const btn = typeof b === "string" ? { label: b } : b;
    return h("button", {
      class: `btn ${btn.primary ? "btn-primary" : "btn-secondary"}`,
      onclick: () => {
        setChoices([]);
        addBubble("me", btn.label);
        history.push({ role: "user", content: btn.label });
        save();
        const action = btn.action || KNOWN_ACTIONS[btn.label];
        action ? action() : userSays(btn.label, { echo: false });
      },
    }, btn.label);
  }));
}

/** "Burayı göster": ekrandaki düğmeyi parlatır. */
export function highlight(key) {
  // Masaüstünde alt menü gizlidir; aynı işin başlıktaki karşılığını ("…-top") parlat.
  const el = [...document.querySelectorAll(`[data-highlight="${key}"], [data-highlight="${key}-top"]`)]
    .find((e) => e.offsetParent !== null || getComputedStyle(e).position === "fixed");
  if (!el) return;
  el.classList.add("pulse-highlight");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => el.classList.remove("pulse-highlight"), 6000);
  el.addEventListener("click", () => el.classList.remove("pulse-highlight"), { once: true });
}

// ---------- Kullanıcı konuşur ----------
async function userSays(text, { echo = true } = {}) {
  if (echo) {
    addBubble("me", text);
    history.push({ role: "user", content: text });
    save();
  }
  track("assistant_message", { screen: currentScreen() });
  setChoices([]);
  if (waitForSearch) {
    waitForSearch = false;
    logSearchRequest(text);
    track("search_request", { source: "assistant" });
  }
  const thinking = h("div", { class: "bubble them muted" }, "…");
  log.append(thinking);

  const ai = await askAssistant({ mode: "chat", messages: history, screen: currentScreen(), userName: name() });
  thinking.remove();
  const res = ai || scripted(text);
  say(res.reply, (res.buttons || []).map((b) => ({ label: b })), { open: true });
  if (res.highlight) {
    close();
    setTimeout(() => highlight(res.highlight), 250);
  }
  if (res.search) {
    navigate(`/yakinimda?q=${encodeURIComponent(res.search)}`);
  }
}

// Yapay zeka bağlı değilken basit, kurallı cevaplar.
function scripted(text) {
  const t = text.toLocaleLowerCase("tr-TR");
  if (/(sat|koy|yükle|ilan|vitrin)/.test(t))
    return { reply: "Hemen göstereyim. Aşağıdaki parlayan \"Sat\" düğmesine dokunun.", highlight: "nav-sat" };
  if (/(mesaj|yaz|konuş|cevap)/.test(t))
    return { reply: "Mesajlarınız aşağıdaki \"Mesajlar\" düğmesinde. Oraya dokunun.", highlight: "nav-mesajlar" };
  if (/(fiyat|kaç lira|para)/.test(t))
    return { reply: "Ürün koyarken benzerlerinin fiyatını ben söylerim. Karar sizin.", buttons: ["Bir şey satmak istiyorum"] };
  if (/(alışveriş|almak|bak)/.test(t))
    return { reply: "Yakınınızdaki ürünler \"Yakınımda\" düğmesinde. Oraya dokunun.", highlight: "nav-yakinimda" };
  if (/(nasıl|öğren|rehber|kitap)/.test(t))
    return { reply: "Size küçük bir kitapçık hazırladım. Birlikte okuyalım mı?", buttons: ["Rehberi aç"] };
  const m = t.match(/(?:yakınımda|var mı|arıyorum|lazım)\s*(.*)/);
  if (m || /(ev |mantı|reçel|salça|erişte|tarhana|patik|örgü|kolye)/.test(t)) {
    return { reply: "Hemen bakıyorum. Yakınınızdakileri gösteriyorum.", search: t.replace(/(yakınımda|var mı|arıyorum|lazım|\?)/g, "").trim() };
  }
  return { reply: "Tam anlayamadım. Satmak mı, almak mı istiyorsunuz?", buttons: ["Bir şey satmak istiyorum", "Alışveriş yapmak istiyorum"] };
}

// ---------- Proaktif yardım (3.2) ----------
function nudge(text, buttons) {
  if (snoozed || !panel().hidden) return;
  fab().classList.add("nudge");
  setTimeout(() => fab().classList.remove("nudge"), 4000);
  say(text, buttons);
}

function snooze() {
  snoozed = true;
  sessionStorage.setItem("femoria:ayse-snooze", "1");
  say("Tabii, acele yok. Ben buradayım; ihtiyacınız olursa sağ alttaki Ayşe Abla düğmesine dokunmanız yeterli.", [], { open: true });
  setTimeout(close, 3500);
}

const later = { label: "Sonra", action: snooze };

function firstVisit() {
  say("Hoş geldiniz! Ben Ayşe Abla. Burada size yardım edeceğim.");
  setTimeout(() => say("Bugün ne yapmak istersiniz?", [
    { label: "Bir şey satmak istiyorum", primary: true, action: () => {
      say("Ne güzel! Hadi ilkini birlikte satışa çıkaralım. 3 dakika sürer.", [
        { label: "Hadi başlayalım", primary: true, action: () => { close(); navigate("/sat"); } },
        { label: "Önce nasıl olduğunu göster", action: () => { close(); navigate("/rehber#satmak"); } },
        later,
      ]);
    } },
    { label: "Alışveriş yapmak istiyorum", action: () => {
      say("Mahallenizdeki el emeği ürünlere bakalım.", [
        { label: "Göster bana", primary: true, action: () => { close(); navigate("/yakinimda"); } }, later,
      ]);
    } },
    { label: "Sadece bakıyorum", action: () => { say("Tabii, rahatça gezin. Ben buradayım.", []); setTimeout(close, 2500); } },
  ]), 700);
}

function resetIdle() {
  clearTimeout(idleTimer);
  if (snoozed) return;
  idleTimer = setTimeout(() => {
    if (document.hidden || !panel().hidden) return;
    const key = `idle:${currentScreen()}`;
    if (sessionStorage.getItem(key)) return; // her ekranda bir kez
    sessionStorage.setItem(key, "1");
    nudge("Yardım edeyim mi?", [{ label: "Evet", primary: true, action: () => say("Ne yapmak istiyorsunuz? Söyleyebilir ya da yazabilirsiniz.") }, later]);
  }, 30000);
}

// Aynı düğmeye 2 saniyede 3 kez dokunma: "Bir şey ters gitti galiba"
let taps = [];
function onTap(e) {
  const target = e.target.closest("button, a, .tile");
  if (!target || target.closest("#assistant-panel, #assistant-fab")) return;
  const now = Date.now();
  taps = taps.filter((t) => now - t.at < 2000 && t.el === target);
  taps.push({ el: target, at: now });
  if (taps.length >= 3) {
    taps = [];
    nudge("Bir şey ters gitti galiba, birlikte bakalım.", [{ label: "Evet, yardım et", primary: true, action: () => say("Ne yapmaya çalışıyordunuz?") }, later]);
  }
}

// Yarım kalan ürün: "Reçeliniz yarım kalmıştı, bitirelim mi?"
function checkUnfinishedDraft() {
  const draft = LS.get("draft");
  if (!draft || currentScreen() === "sat") return;
  const age = Date.now() - (draft.updatedAt || 0);
  if (age < 6 * 3600e3 || sessionStorage.getItem("femoria:draft-nudged")) return;
  sessionStorage.setItem("femoria:draft-nudged", "1");
  const what = draft.title ? `"${draft.title}"` : "Ürününüz";
  nudge(`${what} yarım kalmıştı, bitirelim mi?`, [
    { label: "Bitirelim", primary: true, action: () => { close(); navigate("/sat"); } }, later,
  ]);
}

// ---------- Geri bildirim (3.3): tek soru, tek dokunuş, haftada en fazla 2 ----------
function canAskFeedback(key) {
  const asked = LS.get("feedback_asked", {});
  if (asked[key]) return false;
  const week = (LS.get("feedback_times", [])).filter((t) => Date.now() - t < 7 * 864e5);
  return week.length < 2 && LS.get("feedback_snooze_until", 0) < Date.now();
}

export function askFeedback(key, question, answers, onAnswer) {
  if (!canAskFeedback(key)) return false;
  LS.set("feedback_asked", { ...LS.get("feedback_asked", {}), [key]: Date.now() });
  LS.set("feedback_times", [...LS.get("feedback_times", []), Date.now()]);
  say(question, [
    ...answers.map((a) => ({ label: a, action: async () => {
      await saveFeedback(key, a);
      if (onAnswer) onAnswer(a);
      else { say("Söylediğiniz için teşekkürler. Bunu ekibe ilettim."); setTimeout(close, 3000); }
    } })),
    { label: "Sonra", action: () => {
      LS.set("feedback_snooze_until", Date.now() + 7 * 864e5); // o hafta tekrar sorulmaz
      say("Tabii, acele yok."); setTimeout(close, 2000);
    } },
  ]);
  return true;
}

function scheduleBrowseFeedback() {
  // Sitede 5 dakika geçtikten sonra: "Aradığınızı bulabildiniz mi?"
  setTimeout(() => {
    if (!panel().hidden || snoozed) return;
    askFeedback("arama_basarisi", "Bir süredir bakınıyorsunuz. Aradığınızı bulabildiniz mi?", ["Evet", "Biraz", "Hayır"], (a) => {
      if (a === "Hayır" || a === "Biraz") {
        say("Söyleyin, ben bakayım. Ne arıyordunuz?", []);
        waitForSearch = true;
      } else {
        say("Çok sevindim! İyi alışverişler."); setTimeout(close, 2500);
      }
    });
  }, 5 * 60e3);
}


// ---------- Dış olaylar ----------
export function assistantEvent(event, payload) {
  if (event === "message_received" && !LS.get("first_message_seen")) {
    LS.set("first_message_seen", true);
    nudge("İlk mesajınız geldi! Nasıl cevap verilir göstereyim mi?", [
      { label: "Göster bana", primary: true, action: () => { close(); navigate(`/sohbet/${payload.conversation_id}`); setTimeout(() => say("Alttaki hazır cevaplardan birine dokunmanız yeterli. Ya da mikrofona basıp konuşun."), 900); } },
      later,
    ]);
  }
  if (event === "product_published") {
    setTimeout(() => askFeedback("urun_koyma", "Ürün koymak nasıldı?", ["Kolaydı", "İdare eder", "Zorlandım"], (a) => {
      if (a.includes("Zorlandım") || a.includes("İdare")) {
        say("Söylediğiniz için teşekkürler. En çok neresi zorladı?", ["Fotoğraf", "Anlatmak", "Fiyat", "Kendim söyleyeyim"].map((x) => ({
          label: x, action: () => { saveFeedback("urun_koyma_zorluk", x); say("Bunu ekibe ilettim. Bir dahakine daha kolay olacak."); setTimeout(close, 3000); },
        })));
      } else { say("Çok sevindim! İlk satışınız hayırlı olsun."); setTimeout(close, 3000); }
    }), 1500);
  }
  if (event === "first_sale") {
    askFeedback("sohbet_deneyimi", `${name() ? name() + ", " : ""}müjde! İlk satışınız hayırlı olsun. Alıcıyla konuşmak nasıldı?`,
      ["Kolaydı", "İdare eder", "Zorlandım"], (a) => {
        if (a.includes("Kolay")) { say("Ne güzel! Böyle devam."); setTimeout(close, 2500); return; }
        say("Söylediğiniz için teşekkürler. En çok neresi zorladı?", ["Ne yazacağımı bilemedim", "Ses kaydı", "Fiyat konuşmak"].map((x) => ({
          label: x, action: () => { saveFeedback("sohbet_zorluk", x); say("Bunu ekibe ilettim. Sohbette hazır cevaplar size yardım eder."); setTimeout(close, 3000); },
        })));
      });
  }
  if (event === "guide_read") {
    setTimeout(() => askFeedback("rehber_etkisi", "Anlattıklarım işinize yaradı mı?", ["Evet", "Biraz", "Hayır"]), 500);
  }
}

// ---------- Başlat ----------
export function initAssistant() {
  buildPanel();
  fab().addEventListener("click", () => {
    if (panel().hidden) {
      open();
      if (!log.children.length) say(`Merhaba${name() ? " " + name() : ""}! Size nasıl yardım edebilirim?`, [
        "Bir şey satmak istiyorum", "Alışveriş yapmak istiyorum", "Rehberi aç",
      ]);
    } else close();
  });

  ["pointerdown", "keydown", "scroll"].forEach((ev) => window.addEventListener(ev, resetIdle, { passive: true }));
  document.addEventListener("click", onTap, true);
  onRoute(() => { resetIdle(); setTimeout(checkUnfinishedDraft, 1500); });

  const lastVisit = LS.get("last_visit");
  if (!LS.get("ayse_intro_done")) {
    LS.set("ayse_intro_done", true);
    setTimeout(firstVisit, 1200);
  } else if (lastVisit && Date.now() - lastVisit > 14 * 864e5) {
    setTimeout(() => askFeedback("geri_donus", "Sizi özledik! Ara verirken sizi zorlayan bir şey oldu mu?", ["Vakit bulamadım", "Bir yerde takıldım", "Hayır, her şey iyi"]), 1500);
  } else {
    scheduleBrowseFeedback();
  }
}

