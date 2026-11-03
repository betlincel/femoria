// Ayarlar — ana liste 5 maddeyi geçmez: yazı büyüklüğü, sesli okuma, bildirimler, konum, çıkış.
// Güvenlik ve gizlilik ayrı, katlanır bir bölümde (gece sessizliği, kadın satıcı koruması, acil kişi, KVKK).
import { h, toast, ask, speak, sheet } from "../ui.js";
import { state, saveSettings, updateProfile, signOut } from "../store.js";
import { pickLocation, pageTitle } from "../components.js";
import { deleteMyAccount } from "../api.js";
import { navigate } from "../router.js";

const KVKK_TEXT = [
  "Femoria olarak bilgilerinizi korumak bizim sözümüzdür.",
  "Sizden yalnızca telefon numaranızı, adınızı ve mahallenizi alırız.",
  "Ev adresiniz hiçbir zaman alınmaz ve kimseye gösterilmez. Konumunuz mahalle düzeyinde, kaydırılarak saklanır.",
  "Mesajlarınızı yalnızca siz ve konuştuğunuz kişi görebilir. Şikayet edilen sohbetleri güvenliğiniz için ekibimiz inceleyebilir.",
  "Uygulamayı geliştirmek için hangi ekranların kullanıldığını isimsiz olarak sayarız.",
  "Ayşe Abla'ya yazdıklarınız cevap üretmek için yapay zeka hizmetine gönderilir; telefon numaranız gönderilmez.",
  "Hesabınızı ve tüm bilgilerinizi istediğiniz an, bu sayfadaki tek düğmeyle silebilirsiniz.",
];

function toggle(label, checked, onChange, help) {
  const input = h("input", { type: "checkbox", checked, role: "switch", "aria-label": label, onchange: (e) => onChange(e.target.checked) });
  return h("div", { class: "card" },
    h("div", { class: "switch-row" },
      h("div", {}, h("strong", {}, label), help ? h("div", { class: "small muted" }, help) : null),
      h("label", { class: "switch" }, input, h("span")),
    ),
  );
}

export default async function render(root, { query }) {
  const s = state.settings;
  const p = state.profile || {};
  const loggedIn = !!state.user;
  const needLogin = () => { toast("Bu ayar için giriş yapmanız gerekiyor."); navigate("/giris?next=/ayarlar"); };

  const fontButtons = h("div", { class: "btn-group", role: "group", "aria-label": "Yazı büyüklüğü" });
  const drawFont = () => fontButtons.replaceChildren(...[[1, "Normal"], [1.15, "Büyük"], [1.3, "Çok büyük"]].map(([v, l]) =>
    h("button", { class: "btn btn-secondary btn-choice", "aria-pressed": String(Number(state.settings.font_scale) === v), style: { fontSize: `${v}rem` },
      onclick: async () => { await saveSettings({ font_scale: v }); drawFont(); } }, l)));
  drawFont();

  const loc = state.location;
  root.append(
    pageTitle("Ayarlar", { back: true }),
    h("div", { class: "stack" },
      h("div", { class: "card stack" }, h("strong", {}, "🔠 Yazı büyüklüğü"), fontButtons),
      toggle("🔊 Sesli okuma", s.tts_enabled !== false, (v) => { saveSettings({ tts_enabled: v }); if (v) speak("Sesli okuma açık."); }, "Ayşe Abla söylediklerini sesli okur."),
      toggle("🔔 Bildirimler", s.notifications_enabled !== false, (v) => saveSettings({ notifications_enabled: v }), "Yeni mesaj gelince haber veririz."),
      h("div", { class: "card" },
        h("div", { class: "switch-row" },
          h("div", {}, h("strong", {}, "📍 Konum"), h("div", { class: "small muted" }, loc?.neighborhood ? `${loc.neighborhood}, ${loc.district}` : "Seçilmedi")),
          h("button", { class: "btn btn-secondary", style: { width: "auto" }, onclick: async () => { if (await pickLocation()) navigate("/ayarlar", { replace: true }); } }, "Değiştir"),
        ),
      ),
      loggedIn
        ? h("button", { class: "btn btn-secondary", onclick: async () => { await signOut(); toast("Çıkış yaptınız."); navigate("/"); } },
            h("span", { class: "ico", "aria-hidden": "true" }, "🚪"), "Çıkış")
        : h("a", { class: "btn btn-primary", href: "#/giris?next=/ayarlar" }, "Telefonumla giriş yap"),
    ),

    h("details", { class: "section", open: !!(query.acil || query.kvkk) },
      h("summary", { class: "btn btn-ghost" }, "🛡️ Güvenlik ve gizlilik"),
      h("div", { class: "stack" },
        toggle("🌙 Gece sessizliği", !!p.quiet_hours_enabled, (v) => loggedIn ? updateProfile({ quiet_hours_enabled: v }) : needLogin(),
          "22:00–08:00 arası mesajlar sessize alınır; karşı tarafa \"Sabah dönecek\" notu gider."),
        toggle("👩 Yalnız güvenilir alıcılar", !!p.only_trusted_messages, (v) => loggedIn ? updateProfile({ only_trusted_messages: v }) : needLogin(),
          "Sadece telefonu doğrulanmış ve daha önce alışveriş yapmış kişiler size yazabilir."),
        emergencyCard(loggedIn, needLogin, !!query.acil),
        lookCard(loggedIn, needLogin),
        h("button", { class: "btn btn-secondary", onclick: kvkk }, "📄 Aydınlatma metni (KVKK)"),
        loggedIn ? h("button", { class: "btn btn-danger", onclick: async () => {
          if (!(await ask("Hesabınızı silelim mi?", "Ürünleriniz, mesajlarınız ve tüm bilgileriniz kalıcı olarak silinir. Bu geri alınamaz.", "Evet, her şeyi sil", "Vazgeç"))) return;
          try { await deleteMyAccount(); toast("Hesabınız ve bilgileriniz silindi."); navigate("/"); }
          catch { toast("Silinemedi. Lütfen tekrar deneyin."); }
        } }, "🗑️ Hesabımı ve verilerimi sil") : null,
      ),
    ),
  );

  if (query.kvkk) kvkk();
}

function emergencyCard(loggedIn, needLogin, focus) {
  const p = state.profile || {};
  const name = h("input", { class: "input", id: "e-name", placeholder: "Örn. Kızım Elif", value: p.emergency_name || "" });
  const phone = h("input", { class: "input", id: "e-phone", type: "tel", inputmode: "tel", placeholder: "05XX XXX XX XX", value: p.emergency_phone || "" });
  const card = h("div", { class: "card stack" },
    h("strong", {}, "🆘 Acil durum kişisi"),
    h("p", { class: "small muted" }, "Elden teslim sırasında sohbetteki kalkan düğmesinden bu kişiye tek dokunuşla konumunuzu gönderebilirsiniz."),
    h("label", { for: "e-name" }, "Kim?"), name,
    h("label", { for: "e-phone" }, "Telefonu"), phone,
    h("button", { class: "btn btn-primary", onclick: async () => {
      if (!loggedIn) return needLogin();
      await updateProfile({ emergency_name: name.value.trim() || null, emergency_phone: phone.value.replace(/[^\d+]/g, "") || null });
      toast("Kaydettim.");
    } }, "Kaydet"),
  );
  if (focus) setTimeout(() => name.focus(), 300);
  return card;
}

function lookCard(loggedIn, needLogin) {
  const current = state.profile?.assistant_look || "basortulu";
  const wrap = h("div", { class: "btn-group" });
  const draw = (v) => wrap.replaceChildren(...[["basortulu", "🧕🏻", "Başörtülü"], ["basi_acik", "👩🏻", "Başı açık"]].map(([k, ico, l]) =>
    h("button", { class: "btn btn-secondary btn-choice", "aria-pressed": String(v === k), onclick: async () => {
      if (!loggedIn) return needLogin();
      await updateProfile({ assistant_look: k }); draw(k); toast("Ayşe Abla'nın görünümü değişti.");
    } }, h("span", { class: "ico", "aria-hidden": "true" }, ico), l)));
  draw(current);
  return h("div", { class: "card stack" }, h("strong", {}, "🌸 Ayşe Abla'nın görünümü"), wrap);
}

function kvkk() {
  sheet("Aydınlatma metni", h("div", { class: "stack" },
    ...KVKK_TEXT.map((t) => h("p", {}, t)),
    h("button", { class: "btn btn-secondary", onclick: () => speak(KVKK_TEXT.join(" ")) }, "🔊 Sesli oku"),
  ));
}
