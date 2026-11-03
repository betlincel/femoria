// Giriş / Üye ol — e-posta + şifre.
// Üyelik ürün yüklemenin önüne konmaz; yalnızca satmak, yazmak ya da almak istenince sorulur.
import { h, toast, icon, withIcon, iconCircle, GENDERS } from "../ui.js";
import { supabase, isConfigured, NOT_CONFIGURED, authRedirectUrl } from "../supabase.js";
import { state, loadProfile, updateProfile } from "../store.js";
import { navigate } from "../router.js";
import { pickLocation } from "../components.js";
import { track } from "../api.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD = 8;

/** Supabase hata mesajlarını sade Türkçeye çevirir. */
export function authError(error) {
  const m = String(error?.message || "").toLowerCase();
  if (m.includes("invalid login credentials")) return "E-posta adresi ya da şifre hatalı.";
  if (m.includes("email not confirmed")) return "E-posta adresinizi henüz onaylamadınız. Gelen kutunuzdaki bağlantıya tıklayın.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Bu e-posta ile zaten bir hesap var. \"Giriş yap\" sekmesini kullanın.";
  if (m.includes("password") && (m.includes("at least") || m.includes("short") || m.includes("weak"))) return `Şifre en az ${MIN_PASSWORD} karakter olmalı.`;
  if (m.includes("rate limit") || m.includes("security purposes") || m.includes("too many")) return "Çok fazla deneme oldu. Bir dakika bekleyip tekrar deneyin.";
  if (m.includes("invalid") && m.includes("email")) return "E-posta adresi geçersiz görünüyor.";
  if (m.includes("same") && m.includes("password")) return "Yeni şifre eskisinden farklı olmalı.";
  return "Bir sorun oldu. Lütfen biraz sonra tekrar deneyin.";
}

/** Göster/gizle düğmeli şifre alanı */
export function passwordField(id, label, { autocomplete = "current-password", hint } = {}) {
  const input = h("input", { class: "input", id, type: "password", autocomplete, minlength: MIN_PASSWORD, required: true });
  const toggle = h("button", { type: "button", class: "btn btn-ghost btn-inline", "aria-controls": id, onclick: () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.textContent = show ? "Gizle" : "Göster";
  } }, "Göster");
  return {
    input,
    el: h("div", {},
      h("div", { class: "row", style: { justifyContent: "space-between", marginBottom: "6px" } },
        h("label", { for: id, style: { margin: 0, flex: "1" } }, label), toggle),
      input,
      hint ? h("div", { class: "small muted", style: { marginTop: "6px" } }, hint) : null,
    ),
  };
}

/** Cinsiyet seçimi (yalnız hitap için). value() → "kadin" | "erkek" | "belirtilmedi" | null */
export function genderField(initial = null) {
  let value = initial;
  const group = h("div", { class: "btn-group gender-group", role: "radiogroup", "aria-labelledby": "gender-label" });
  const draw = () => group.replaceChildren(...GENDERS.map(([k, l]) => h("button", {
    type: "button", class: "btn btn-secondary btn-choice", role: "radio",
    "aria-checked": String(value === k), "aria-pressed": String(value === k),
    onclick: () => { value = k; draw(); },
  }, l)));
  draw();
  return {
    value: () => value,
    el: h("div", {},
      h("label", { id: "gender-label" }, "Cinsiyetiniz"),
      group,
      h("div", { class: "small muted", style: { marginTop: "6px" } }, "Size nasıl hitap edeceğimizi bilmek için soruyoruz (Hanım / Bey). Başkalarına gösterilmez."),
    ),
  };
}

export default async function render(root, { query }) {
  const next = query.next || "/";
  let mode = query.mod === "kayit" ? "signup" : "signin";
  const body = h("div", { class: "stack" });
  const tabs = h("div", { class: "tabs", role: "tablist", style: { marginTop: "0" } });

  root.append(
    h("div", { class: "auth-card card" },
      h("h1", { class: "center", style: { marginBottom: "4px" } }, "Femoria'ya hoş geldiniz"),
      h("p", { class: "center muted" }, "Satmak, mesajlaşmak ve alışveriş yapmak için hesabınıza girin."),
      tabs,
      body,
    ),
  );

  if (!isConfigured) {
    tabs.hidden = true;
    body.append(h("p", { class: "notice" }, icon("alert", 20), NOT_CONFIGURED));
    return;
  }
  if (state.user) return finish();

  const drawTabs = () => tabs.replaceChildren(...[["signin", "Giriş yap"], ["signup", "Üye ol"]].map(([k, l]) =>
    h("button", { role: "tab", "aria-selected": String(mode === k), onclick: () => { mode = k; drawTabs(); draw(); } }, l)));

  function draw() {
    if (mode === "signup") signUpForm();
    else signInForm();
  }

  // ---------- Giriş ----------
  function signInForm(prefillEmail = "") {
    const email = h("input", { class: "input", id: "email", type: "email", inputmode: "email", autocomplete: "email", required: true, value: prefillEmail, placeholder: "ornek@eposta.com" });
    const pw = passwordField("password", "Şifre");
    const btn = h("button", { class: "btn btn-primary btn-xl", type: "submit" }, "Giriş yap");
    body.replaceChildren(
      h("form", { class: "stack", onsubmit: async (e) => {
        e.preventDefault();
        if (!EMAIL_RE.test(email.value.trim())) return toast("E-posta adresini kontrol edin.");
        btn.disabled = true;
        const { error } = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: pw.input.value });
        btn.disabled = false;
        if (error) {
          toast(authError(error));
          if (String(error.message).toLowerCase().includes("not confirmed")) checkInbox(email.value.trim());
          return;
        }
        track("login_success", { method: "email" });
        await loadProfile();
        finish();
      } },
        h("div", {}, h("label", { for: "email" }, "E-posta adresiniz"), email),
        pw.el,
        btn,
      ),
      h("button", { class: "btn btn-ghost", onclick: () => forgotForm(email.value.trim()) }, "Şifremi unuttum"),
      h("p", { class: "small muted center" }, "Hesabınız yok mu? ",
        h("a", { href: "#", onclick: (e) => { e.preventDefault(); mode = "signup"; drawTabs(); draw(); } }, "Hemen üye olun"), "."),
    );
    (prefillEmail ? pw.input : email).focus();
  }

  // ---------- Üye ol ----------
  function signUpForm() {
    const name = h("input", { class: "input", id: "name", autocomplete: "given-name", required: true, placeholder: "Adınız", value: "" });
    const email = h("input", { class: "input", id: "email", type: "email", inputmode: "email", autocomplete: "email", required: true, placeholder: "ornek@eposta.com" });
    const pw = passwordField("password", "Şifre", { autocomplete: "new-password", hint: `En az ${MIN_PASSWORD} karakter. Kolay hatırlayacağınız ama tahmin edilemeyecek bir şey seçin.` });
    const gender = genderField();
    const kvkk = h("input", { type: "checkbox", id: "kvkk", required: true, style: { width: "22px", height: "22px", flex: "0 0 auto", marginTop: "2px" } });
    const btn = h("button", { class: "btn btn-primary btn-xl", type: "submit" }, "Üye ol");
    body.replaceChildren(
      h("form", { class: "stack", onsubmit: async (e) => {
        e.preventDefault();
        if (name.value.trim().length < 2) return toast("Adınızı yazın.");
        if (!gender.value()) return toast("Cinsiyetinizi seçin. İsterseniz \"Belirtmek istemiyorum\"u seçebilirsiniz.");
        if (!EMAIL_RE.test(email.value.trim())) return toast("E-posta adresini kontrol edin.");
        if (pw.input.value.length < MIN_PASSWORD) return toast(`Şifre en az ${MIN_PASSWORD} karakter olmalı.`);
        if (!kvkk.checked) return toast("Devam etmek için aydınlatma metnini onaylayın.");
        btn.disabled = true;
        const { data, error } = await supabase.auth.signUp({
          email: email.value.trim(),
          password: pw.input.value,
          options: { data: { full_name: name.value.trim(), gender: gender.value() }, emailRedirectTo: authRedirectUrl() },
        });
        btn.disabled = false;
        if (error) return toast(authError(error));
        // Supabase, var olan bir e-posta için de hata vermeden döner (identities boş gelir).
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          toast("Bu e-posta ile zaten bir hesap var. Giriş yapın.");
          mode = "signin"; drawTabs(); return signInForm(email.value.trim());
        }
        track("signup", { method: "email", needs_confirm: !data.session });
        if (!data.session) return checkInbox(email.value.trim());
        await loadProfile();
        finish();
      } },
        h("div", {}, h("label", { for: "name" }, "Adınız"), name),
        gender.el,
        h("div", {}, h("label", { for: "email" }, "E-posta adresiniz"), email),
        pw.el,
        h("label", { for: "kvkk", class: "row", style: { alignItems: "flex-start", gap: "10px", fontWeight: "400", cursor: "pointer" } },
          kvkk,
          h("span", { style: { flex: "1" } }, h("a", { href: "#/ayarlar?kvkk=1", target: "_blank" }, "Aydınlatma metnini"), " okudum, kabul ediyorum."),
        ),
        btn,
      ),
      h("div", { class: "tip" }, icon("lock"), h("p", {}, "Ev adresinizi kimse görmez; insanlar sadece hangi mahallede olduğunuzu bilir.")),
    );
    name.focus();
  }

  // ---------- E-posta onayı bekleniyor ----------
  function checkInbox(email) {
    let cooldown = false;
    body.replaceChildren(
      iconCircle("message"),
      h("h2", { class: "center" }, "E-postanızı kontrol edin"),
      h("p", { class: "center" }, h("strong", {}, email), " adresine bir onay bağlantısı gönderdik. Bağlantıya tıklayınca hesabınız açılır."),
      h("p", { class: "center small muted" }, "Birkaç dakika içinde gelmezse \"Gereksiz\" (spam) klasörüne de bakın."),
      h("button", { class: "btn btn-secondary", onclick: async () => {
        if (cooldown) return toast("Lütfen bir dakika bekleyin.");
        const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: authRedirectUrl() } });
        if (error) return toast(authError(error));
        cooldown = true; setTimeout(() => (cooldown = false), 60000);
        toast("Onay e-postasını yeniden gönderdik.");
      } }, withIcon("refresh", "Tekrar gönder")),
      h("button", { class: "btn btn-ghost", onclick: () => { mode = "signin"; drawTabs(); signInForm(email); } }, "Onayladım, giriş yap"),
    );
  }

  // ---------- Şifremi unuttum ----------
  function forgotForm(prefill = "") {
    const email = h("input", { class: "input", id: "email", type: "email", inputmode: "email", autocomplete: "email", required: true, value: prefill, placeholder: "ornek@eposta.com" });
    body.replaceChildren(
      h("h2", {}, "Şifrenizi mi unuttunuz?"),
      h("p", { class: "muted" }, "E-posta adresinizi yazın; şifrenizi yenilemeniz için bir bağlantı gönderelim."),
      h("form", { class: "stack", onsubmit: async (e) => {
        e.preventDefault();
        if (!EMAIL_RE.test(email.value.trim())) return toast("E-posta adresini kontrol edin.");
        const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: authRedirectUrl() });
        if (error) return toast(authError(error));
        body.replaceChildren(
          iconCircle("check", "ok"),
          h("h2", { class: "center" }, "Bağlantı gönderildi"),
          h("p", { class: "center" }, "Bu adrese kayıtlı bir hesap varsa, şifre yenileme bağlantısı birkaç dakika içinde gelecek."),
          h("button", { class: "btn btn-secondary", onclick: () => signInForm(email.value.trim()) }, withIcon("chevron-left", "Girişe dön")),
        );
      } },
        h("div", {}, h("label", { for: "email" }, "E-posta adresiniz"), email),
        h("button", { class: "btn btn-primary btn-xl", type: "submit" }, "Bağlantı gönder"),
      ),
      h("button", { class: "btn btn-ghost", onclick: () => signInForm(email.value.trim()) }, withIcon("chevron-left", "Girişe dön")),
    );
    email.focus();
  }

  // ---------- İlk girişte eksik bilgiler ----------
  async function stepProfile() {
    const name = h("input", { class: "input", id: "name", autocomplete: "given-name", placeholder: "Adınız", value: state.profile?.full_name || "" });
    const gender = genderField(state.profile?.gender || null);
    tabs.hidden = true;
    body.replaceChildren(
      h("h2", {}, "Son adım"),
      h("form", { class: "stack", onsubmit: async (e) => {
        e.preventDefault();
        if (name.value.trim().length < 2) return toast("Adınızı yazın.");
        if (!gender.value()) return toast("Cinsiyetinizi seçin. İsterseniz \"Belirtmek istemiyorum\"u seçebilirsiniz.");
        await updateProfile({ full_name: name.value.trim(), gender: gender.value() });
        if (!state.location?.neighborhood) await pickLocation();
        else await updateProfile({
          approx_lat: state.location.lat, approx_lng: state.location.lng, city: state.location.city,
          district: state.location.district, neighborhood: state.location.neighborhood,
        }).catch(() => {});
        finish();
      } },
        h("div", {}, h("label", { for: "name" }, "Adınız"), name),
        gender.el,
        h("div", { class: "tip" }, icon("lock"), h("p", {}, "Ev adresinizi kimse görmez; insanlar sadece hangi mahallede olduğunuzu bilir.")),
        h("button", { class: "btn btn-primary btn-xl", type: "submit" }, state.location?.neighborhood ? "Kaydet ve devam et" : "Mahallemi seç ve bitir"),
      ),
    );
  }

  function finish() {
    const p = state.profile;
    if (!p?.full_name || !p?.gender || (!p?.neighborhood && !state.location?.neighborhood)) return stepProfile();
    toast("Hoş geldiniz! Artık hem satabilir hem alışveriş yapabilirsiniz.");
    navigate(next, { replace: true });
  }

  drawTabs();
  draw();
}
