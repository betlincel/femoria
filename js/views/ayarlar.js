// Ayarlar — ana liste 5 maddeyi geçmez: hitap, yazı büyüklüğü, sesli okuma, bildirimler, çıkış.
// Güvenlik ve gizlilik ayrı grupta (gece sessizliği, kadın satıcı koruması, KVKK).
import { h, toast, ask, speak, sheet, icon, withIcon, canSpeak, stopSpeaking, GENDERS, hitap } from "../ui.js";
import { state, saveSettings, updateProfile, signOut } from "../store.js";
import { pageTitle } from "../components.js";
import { deleteMyAccount, askAssistant, updateBio } from "../api.js";
import { navigate } from "../router.js";

/** Liste satırı: ikon + başlık/açıklama + sağda anahtar ya da düğme */
function item(ico, title, help, trailing, { danger = false } = {}) {
  return h("div", { class: `list-item ${danger ? "danger" : ""}` },
    icon(ico),
    h("div", { class: "body" }, h("strong", {}, title), help ? h("div", { class: "small" }, help) : null),
    trailing,
  );
}

function toggle(label, checked, onChange) {
  return h("label", { class: "switch" },
    h("input", { type: "checkbox", checked, role: "switch", "aria-label": label, onchange: (e) => onChange(e.target.checked) }),
    h("span"),
  );
}

export default async function render(root, { query }) {
  const s = state.settings;
  const p = state.profile || {};
  const loggedIn = !!state.user;
  const needLogin = () => { toast("Bu ayar için giriş yapmanız gerekiyor."); navigate("/giris"); };
  const guarded = (fn) => (v) => (loggedIn ? fn(v) : needLogin());

  const fontButtons = h("div", { class: "btn-group", role: "group", "aria-label": "Yazı büyüklüğü" });
  const drawFont = () => fontButtons.replaceChildren(...[[1, "Normal"], [1.15, "Büyük"], [1.3, "Çok büyük"]].map(([v, l]) =>
    h("button", { class: "btn btn-secondary btn-choice", "aria-pressed": String(Number(state.settings.font_scale) === v), style: { fontSize: `${Math.min(v, 1.15)}rem` },
      onclick: async () => { await saveSettings({ font_scale: v }); drawFont(); } }, l)));
  drawFont();

  root.append(
    pageTitle("Ayarlar", { back: true }),

    h("div", { class: "group-title" }, "Genel"),
    h("div", { class: "list" },
      loggedIn ? hitapBlock() : null,
      h("div", { class: "list-block stack" }, h("div", { class: "row", style: { gap: "14px" } }, icon("type"), h("strong", { style: { flex: 1 } }, "Yazı büyüklüğü")), fontButtons),
      canSpeak ? item("volume", "Ayşe Abla sesli okusun",
        "Kapalıyken de her mesajın yanındaki hoparlöre dokunarak dinleyebilirsiniz.",
        toggle("Sesli okuma", s.tts_enabled === true, (v) => { saveSettings({ tts_enabled: v }); if (v) speak("Sesli okuma açık.", { force: true }); else stopSpeaking(); })) : null,
      item("bell", "Bildirimler", "Yeni mesaj gelince haber veririz.",
        toggle("Bildirimler", s.notifications_enabled !== false, (v) => saveSettings({ notifications_enabled: v }))),
      loggedIn
        ? h("button", { class: "list-item", onclick: async () => { await signOut(); toast("Çıkış yaptınız."); navigate("/"); } },
            icon("logout"), h("div", { class: "body" }, h("strong", {}, "Çıkış yap")))
        : h("a", { class: "list-item", href: "#/giris" },
            icon("user"), h("div", { class: "body" }, h("strong", {}, "Giriş yap / Üye ol")), icon("chevron-right")),
    ),

    loggedIn ? h("div", { class: "group-title", id: "magaza" }, "Mağazam") : null,
    loggedIn ? storeBlock() : null,

    h("div", { class: "group-title", id: "guvenlik" }, "Güvenlik ve gizlilik"),
    h("div", { class: "list" },
      item("moon", "Gece sessizliği", "22:00–08:00 arası mesajlar sessize alınır; karşı tarafa \"sabah dönecek\" notu gider.",
        toggle("Gece sessizliği", !!p.quiet_hours_enabled, guarded((v) => updateProfile({ quiet_hours_enabled: v })))),
      item("user-check", "Yalnız güvenilir alıcılar", "Sadece e-postası doğrulanmış ve daha önce alışveriş yapmış kişiler size yazabilir.",
        toggle("Yalnız güvenilir alıcılar", !!p.only_trusted_messages, guarded((v) => updateProfile({ only_trusted_messages: v })))),
      h("a", { class: "list-item", href: "#/aydinlatma" }, icon("file"), h("div", { class: "body" }, h("strong", {}, "Aydınlatma metni (KVKK)"),
        state.profile?.kvkk_accepted_at ? h("div", { class: "small" }, `${new Date(state.profile.kvkk_accepted_at).toLocaleDateString("tr-TR")} tarihinde onayladınız`) : null), icon("chevron-right")),
    ),

    loggedIn ? h("div", { class: "list section" },
      h("button", { class: "list-item danger", onclick: async () => {
        if (!(await ask("Hesabınızı silelim mi?", "Ürünleriniz, mesajlarınız ve tüm bilgileriniz kalıcı olarak silinir. Bu geri alınamaz.", "Evet, her şeyi sil", "Vazgeç"))) return;
        try { await deleteMyAccount(); toast("Hesabınız ve bilgileriniz silindi."); navigate("/"); }
        catch { toast("Silinemedi. Lütfen tekrar deneyin."); }
      } }, icon("trash"), h("div", { class: "body" }, h("strong", {}, "Hesabımı ve verilerimi sil"))),
    ) : null,
  );

  if (query.guvenlik) document.getElementById("guvenlik")?.scrollIntoView({ behavior: "smooth" });
  if (query.hitap) document.getElementById("hitap")?.scrollIntoView({ behavior: "smooth", block: "center" });
  if (query.bolum === "magaza") setTimeout(() => { document.getElementById("magaza")?.scrollIntoView({ behavior: "smooth" }); document.getElementById("bio")?.focus({ preventScroll: true }); }, 100);
  if (query.kvkk) navigate("/aydinlatma", { replace: true });
}

// Hitap: "Hanım" / "Bey" / yalnız ad. Cinsiyet başkalarına gösterilmez.
// Mağaza tanıtımı (Hakkımda) + online ödeme hesabı. Ayşe Abla kısa notlardan tanıtım yazar.
function storeBlock() {
  const p = state.profile || {};
  const ta = h("textarea", { class: "input", id: "bio", rows: 4, maxlength: 600, placeholder: "Örn. Trabzon'da 20 yıldır reçel ve tarhana yapıyorum, katkısız." }, p.bio || "");
  const count = h("span", { class: "counter" }, `${ta.value.length}/600`);
  ta.addEventListener("input", () => (count.textContent = `${ta.value.length}/600`));
  const aiBtn = h("button", { type: "button", class: "btn btn-secondary", onclick: async () => {
    const notes = ta.value.trim();
    if (notes.length < 3) { toast("Önce birkaç kelimeyle ne yaptığınızı yazın; Ayşe Abla güzelleştirsin."); ta.focus(); return; }
    aiBtn.disabled = true; aiBtn.replaceChildren("Ayşe Abla yazıyor…");
    const ai = await askAssistant({ mode: "bio", notes });
    aiBtn.disabled = false; aiBtn.replaceChildren(...withIcon("sparkles", "Ayşe Abla güzelleştirsin"));
    if (ai?.bio) { ta.value = ai.bio; ta.dispatchEvent(new Event("input")); toast("Yazdım. Beğenmezseniz düzeltebilirsiniz, sonra Kaydet'e basın."); }
    else toast("Ayşe Abla şu an yazamadı; kendiniz yazıp kaydedebilirsiniz.");
  } }, ...withIcon("sparkles", "Ayşe Abla güzelleştirsin"));
  const save = h("button", { type: "button", class: "btn btn-primary", onclick: async () => {
    save.disabled = true;
    try { await updateBio(ta.value.trim()); state.profile && (state.profile.bio = ta.value.trim()); toast("Mağaza tanıtımınız kaydedildi."); }
    catch (e) { toast(e.message || "Kaydedilemedi."); }
    save.disabled = false;
  } }, "Kaydet");
  return h("div", { class: "list" },
    h("div", { class: "list-block stack" },
      h("div", { class: "row", style: { gap: "14px" } }, icon("bag"), h("strong", { style: { flex: 1 } }, "Mağaza tanıtımı")),
      h("p", { class: "small muted", style: { margin: 0 } }, "Mağaza sayfanızda görünür. Kendinizi birkaç kelimeyle anlatın; Ayşe Abla güzel bir yazıya çevirsin."),
      ta, h("div", { class: "field-help" }, h("span", {}, "İletişim bilgisi (telefon, adres) yazmayın."), count),
      h("div", { class: "btn-row" }, aiBtn, save),
      h("a", { class: "link-btn", href: `#/magaza/${state.user.id}` }, ...withIcon("arrow-right", "Mağazamı gör"))),
    h("a", { class: "list-item", href: "#/odeme-hesabi" }, icon("wallet"),
      h("div", { class: "body" }, h("strong", {}, "Ödeme hesabım"), h("div", { class: "small" }, p.payout_ready ? "Online ödeme alabiliyorsunuz." : "Online ödeme almak için iyzico'ya bağlanın.")),
      icon("chevron-right")),
  );
}

function hitapBlock() {
  const p = state.profile || {};
  const preview = h("div", { class: "small muted" });
  const group = h("div", { class: "btn-group gender-group", role: "radiogroup", "aria-label": "Cinsiyet" });
  const draw = (v) => {
    preview.textContent = `Size böyle hitap ediyoruz: "${hitap(p.full_name, v) || "—"}"`;
    group.replaceChildren(...GENDERS.map(([k, l]) => h("button", {
      type: "button", class: "btn btn-secondary btn-choice", role: "radio",
      "aria-checked": String(v === k), "aria-pressed": String(v === k),
      onclick: async () => {
        try { await updateProfile({ gender: k }); p.gender = k; draw(k); toast("Kaydettim."); }
        catch { toast("Kaydedilemedi, tekrar deneyin."); }
      },
    }, l)));
  };
  draw(p.gender || null);
  return h("div", { class: "list-block stack", id: "hitap" },
    h("div", { class: "row", style: { gap: "14px" } }, icon("user"), h("strong", { style: { flex: 1 } }, "Cinsiyet ve hitap")),
    group,
    preview,
  );
}




