// Giriş — yalnız telefon numarası + tek seferlik kod (e-posta/şifre yok). Rehber Bölüm 1.
import { h, toast, micButton } from "../ui.js";
import { supabase, isConfigured, NOT_CONFIGURED } from "../supabase.js";
import { state, loadProfile, updateProfile } from "../store.js";
import { navigate } from "../router.js";
import { pageTitle, pickLocation } from "../components.js";
import { track } from "../api.js";

/** "0555 111 22 33" → "+905551112233" */
export function normalizePhone(raw) {
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("0090")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10 && d.startsWith("5")) d = "90" + d;
  return /^905\d{9}$/.test(d) ? `+${d}` : null;
}

export default async function render(root, { query }) {
  const next = query.next || "/";
  const body = h("div", { class: "stack" });
  root.append(pageTitle("Femoria'ya katılın", { back: true }), body);

  if (!isConfigured) {
    body.append(h("p", { class: "notice" }, NOT_CONFIGURED));
    return;
  }
  if (state.user) return finish();

  let phone = "";

  function stepPhone() {
    const input = h("input", {
      class: "input", id: "phone", type: "tel", inputmode: "tel", autocomplete: "tel",
      placeholder: "05XX XXX XX XX", value: phone,
    });
    const submit = async (e) => {
      e?.preventDefault();
      const p = normalizePhone(input.value);
      if (!p) return toast("Numara eksik görünüyor. 05 ile başlayan 11 haneyi yazın.");
      phone = p;
      btn.disabled = true;
      const { error } = await supabase.auth.signInWithOtp({ phone });
      btn.disabled = false;
      if (error) return toast("Kod gönderemedim. Biraz sonra tekrar dener misiniz?");
      track("otp_sent");
      stepCode();
    };
    const btn = h("button", { class: "btn btn-primary btn-xl", type: "submit" }, "Kod gönder");
    body.replaceChildren(
      h("p", {}, "Katılmak için sadece telefon numaranız yeter. E-posta ya da şifre gerekmez."),
      h("form", { class: "stack", onsubmit: submit },
        h("label", { for: "phone" }, "📞 Telefon numaranız"),
        input,
        btn,
      ),
      h("p", { class: "small muted" }, "Devam ederek ", h("a", { href: "#/ayarlar?kvkk=1" }, "aydınlatma metnini"), " kabul etmiş olursunuz."),
    );
    input.focus();
  }

  function stepCode() {
    const input = h("input", {
      class: "input otp-input", id: "otp", inputmode: "numeric", autocomplete: "one-time-code",
      maxlength: 6, pattern: "[0-9]*", "aria-label": "Gelen şifre",
    });
    const resend = h("button", { class: "btn btn-ghost", disabled: true, onclick: async () => {
      await supabase.auth.signInWithOtp({ phone });
      toast("Yeni kod gönderdim.");
      countdown();
    } }, "Tekrar gönder");
    const countdown = () => { resend.disabled = true; setTimeout(() => (resend.disabled = false), 60000); };
    const verify = async (e) => {
      e?.preventDefault();
      const token = input.value.replace(/\D/g, "");
      if (token.length < 4) return;
      const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
      if (error) { input.value = ""; return toast("Kod tutmadı. Bir daha bakar mısınız?"); }
      track("login_success");
      await loadProfile();
      finish();
    };
    input.addEventListener("input", () => input.value.replace(/\D/g, "").length === 6 && verify());
    body.replaceChildren(
      h("div", { class: "illus", "aria-hidden": "true" }, "✉️ 1 2 3 4"),
      h("p", {}, `Telefonunuza bir mesaj gönderdim. İçindeki şifreyi yazın. Çoğu telefonda kendiliğinden yazılır.`),
      h("form", { class: "stack", onsubmit: verify },
        input,
        h("button", { class: "btn btn-primary btn-xl", type: "submit" }, "Devam"),
      ),
      h("p", { class: "small muted center" }, "Gelmezse 1 dakika bekleyip tekrar isteyin."),
      resend,
      h("button", { class: "btn btn-ghost", onclick: stepPhone }, "← Numarayı değiştir"),
    );
    countdown();
    input.focus();
  }

  async function stepName() {
    const input = h("input", { class: "input", id: "name", autocomplete: "given-name", placeholder: "Adınız", value: state.profile?.full_name || "" });
    body.replaceChildren(
      h("h2", {}, "Son adım!"),
      h("form", { class: "stack", onsubmit: async (e) => {
        e.preventDefault();
        const name = input.value.trim();
        if (name.length < 2) return toast("Adınızı yazın ya da söyleyin.");
        await updateProfile({ full_name: name });
        if (!state.location?.neighborhood) await pickLocation();
        else await updateProfile({
          approx_lat: state.location.lat, approx_lng: state.location.lng, city: state.location.city,
          district: state.location.district, neighborhood: state.location.neighborhood,
        }).catch(() => {});
        finish();
      } },
        h("label", { for: "name" }, "Adınız"),
        h("div", { class: "input-row" }, input, micButton({ size: "sm", onText: (t) => (input.value = t) })),
        h("div", { class: "card card-warm row" },
          h("span", { style: { flex: "0 0 auto", fontSize: "2rem" }, "aria-hidden": "true" }, "🏠🛡️"),
          h("p", { style: { margin: 0 } }, "Ev adresinizi kimse görmez; insanlar sadece hangi mahallede olduğunuzu bilir."),
        ),
        h("button", { class: "btn btn-primary btn-xl", type: "submit" }, "Mahallemi seç ve bitir"),
      ),
    );
  }

  function finish() {
    if (!state.profile?.full_name) return stepName();
    toast("İşte bu kadar! Artık hem satabilir hem alışveriş yapabilirsiniz.");
    navigate(next, { replace: true });
  }

  stepPhone();
}
