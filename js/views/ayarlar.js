// Ayarlar — ana liste 5 maddeyi geçmez: yazı büyüklüğü, sesli okuma, bildirimler, konum, çıkış.
// Güvenlik ve gizlilik ayrı grupta (gece sessizliği, kadın satıcı koruması, acil kişi, KVKK).
import { h, toast, ask, speak, sheet, icon, withIcon, canSpeak, stopSpeaking, GENDERS, hitap } from "../ui.js";
import { ayseAvatar } from "../icons.js";
import { state, saveSettings, updateProfile, signOut } from "../store.js";
import { pickLocation, pageTitle } from "../components.js";
import { deleteMyAccount } from "../api.js";
import { navigate } from "../router.js";

const KVKK_TEXT = [
  "Femoria olarak bilgilerinizi korumak bizim sözümüzdür.",
  "Sizden yalnızca e-posta adresinizi, adınızı ve mahallenizi alırız. Şifreniz şifrelenmiş olarak saklanır; biz de göremeyiz.",
  "Ev adresiniz hiçbir zaman alınmaz ve kimseye gösterilmez. Konumunuz mahalle düzeyinde, kaydırılarak saklanır.",
  "Mesajlarınızı yalnızca siz ve konuştuğunuz kişi görebilir. Şikayet edilen sohbetleri güvenliğiniz için ekibimiz inceleyebilir.",
  "Uygulamayı geliştirmek için hangi ekranların kullanıldığını isimsiz olarak sayarız.",
  "Ayşe Abla'ya yazdıklarınız cevap üretmek için yapay zeka hizmetine gönderilir; e-posta adresiniz gönderilmez.",
  "Hesabınızı ve tüm bilgilerinizi istediğiniz an, bu sayfadaki tek düğmeyle silebilirsiniz.",
];

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
  const needLogin = () => { toast("Bu ayar için giriş yapmanız gerekiyor."); navigate("/giris?next=/ayarlar"); };
  const guarded = (fn) => (v) => (loggedIn ? fn(v) : needLogin());

  const fontButtons = h("div", { class: "btn-group", role: "group", "aria-label": "Yazı büyüklüğü" });
  const drawFont = () => fontButtons.replaceChildren(...[[1, "Normal"], [1.15, "Büyük"], [1.3, "Çok büyük"]].map(([v, l]) =>
    h("button", { class: "btn btn-secondary btn-choice", "aria-pressed": String(Number(state.settings.font_scale) === v), style: { fontSize: `${Math.min(v, 1.15)}rem` },
      onclick: async () => { await saveSettings({ font_scale: v }); drawFont(); } }, l)));
  drawFont();

  const loc = state.location;
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
      item("map-pin", "Konum", loc?.neighborhood ? `${loc.neighborhood}, ${loc.district}` : "Seçilmedi",
        h("button", { class: "btn btn-secondary btn-inline", onclick: async () => { if (await pickLocation()) navigate("/ayarlar", { replace: true }); } }, "Değiştir")),
      loggedIn
        ? h("button", { class: "list-item", onclick: async () => { await signOut(); toast("Çıkış yaptınız."); navigate("/"); } },
            icon("logout"), h("div", { class: "body" }, h("strong", {}, "Çıkış yap")))
        : h("a", { class: "list-item", href: "#/giris?next=/ayarlar" },
            icon("user"), h("div", { class: "body" }, h("strong", {}, "Giriş yap / Üye ol")), icon("chevron-right")),
    ),

    h("div", { class: "group-title", id: "guvenlik" }, "Güvenlik ve gizlilik"),
    h("div", { class: "list" },
      item("moon", "Gece sessizliği", "22:00–08:00 arası mesajlar sessize alınır; karşı tarafa \"sabah dönecek\" notu gider.",
        toggle("Gece sessizliği", !!p.quiet_hours_enabled, guarded((v) => updateProfile({ quiet_hours_enabled: v })))),
      item("user-check", "Yalnız güvenilir alıcılar", "Sadece e-postası doğrulanmış ve daha önce alışveriş yapmış kişiler size yazabilir.",
        toggle("Yalnız güvenilir alıcılar", !!p.only_trusted_messages, guarded((v) => updateProfile({ only_trusted_messages: v })))),
      emergencyBlock(loggedIn, needLogin, !!query.acil),
      h("button", { class: "list-item", onclick: kvkk }, icon("file"), h("div", { class: "body" }, h("strong", {}, "Aydınlatma metni (KVKK)")), icon("chevron-right")),
    ),

    h("div", { class: "group-title" }, "Ayşe Abla"),
    h("div", { class: "list" }, lookBlock(loggedIn, needLogin)),

    loggedIn ? h("div", { class: "list section" },
      h("button", { class: "list-item danger", onclick: async () => {
        if (!(await ask("Hesabınızı silelim mi?", "Ürünleriniz, mesajlarınız ve tüm bilgileriniz kalıcı olarak silinir. Bu geri alınamaz.", "Evet, her şeyi sil", "Vazgeç"))) return;
        try { await deleteMyAccount(); toast("Hesabınız ve bilgileriniz silindi."); navigate("/"); }
        catch { toast("Silinemedi. Lütfen tekrar deneyin."); }
      } }, icon("trash"), h("div", { class: "body" }, h("strong", {}, "Hesabımı ve verilerimi sil"))),
    ) : null,
  );

  if (query.acil) document.getElementById("guvenlik")?.scrollIntoView({ behavior: "smooth" });
  if (query.hitap) document.getElementById("hitap")?.scrollIntoView({ behavior: "smooth", block: "center" });
  if (query.kvkk) kvkk();
}

// Hitap: "Hanım" / "Bey" / yalnız ad. Cinsiyet başkalarına gösterilmez.
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

function emergencyBlock(loggedIn, needLogin, focus) {
  const p = state.profile || {};
  const name = h("input", { class: "input", id: "e-name", placeholder: "Örn. Kızım Elif", value: p.emergency_name || "" });
  const phone = h("input", { class: "input", id: "e-phone", type: "tel", inputmode: "tel", placeholder: "05XX XXX XX XX", value: p.emergency_phone || "" });
  const block = h("div", { class: "list-block stack" },
    h("div", { class: "row", style: { gap: "14px", alignItems: "flex-start" } },
      icon("sos"),
      h("div", { style: { flex: 1 } },
        h("strong", {}, "Acil durum kişisi"),
        h("div", { class: "small muted" }, "Elden teslimde, sohbetteki kalkan düğmesinden bu kişiye tek dokunuşla konumunuzu gönderebilirsiniz."),
      ),
    ),
    h("div", {}, h("label", { for: "e-name" }, "Kim?"), name),
    h("div", {}, h("label", { for: "e-phone" }, "Telefonu"), phone),
    h("button", { class: "btn btn-secondary", onclick: async () => {
      if (!loggedIn) return needLogin();
      await updateProfile({ emergency_name: name.value.trim() || null, emergency_phone: phone.value.replace(/[^\d+]/g, "") || null });
      toast("Kaydettim.");
    } }, "Kaydet"),
  );
  if (focus) setTimeout(() => name.focus(), 300);
  return block;
}

function lookBlock(loggedIn, needLogin) {
  const current = state.profile?.assistant_look || "basortulu";
  const wrap = h("div", { class: "btn-group" });
  const draw = (v) => wrap.replaceChildren(...[["basortulu", "Başörtülü"], ["basi_acik", "Başı açık"]].map(([k, l]) =>
    h("button", { class: "btn btn-secondary btn-choice", "aria-pressed": String(v === k), style: { minHeight: "72px" }, onclick: async () => {
      if (!loggedIn) return needLogin();
      await updateProfile({ assistant_look: k }); draw(k); toast("Ayşe Abla'nın görünümü değişti.");
    } }, ayseAvatar(k, 40), l)));
  draw(current);
  return h("div", { class: "list-block stack" }, h("strong", {}, "Görünüm"), wrap);
}

function kvkk() {
  sheet("Aydınlatma metni", h("div", { class: "stack" },
    ...KVKK_TEXT.map((t) => h("p", {}, t)),
    canSpeak ? h("button", { class: "btn btn-secondary", onclick: () => speak(KVKK_TEXT.join(" "), { force: true }) }, withIcon("volume", "Sesli dinle")) : null,
  ));
}
