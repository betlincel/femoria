// Şifre yenileme — e-postadaki bağlantıdan gelinir (Supabase PASSWORD_RECOVERY oturumu).
import { h, toast, iconCircle } from "../ui.js";
import { supabase, isConfigured } from "../supabase.js";
import { state } from "../store.js";
import { navigate } from "../router.js";
import { passwordField, authError, MIN_PASSWORD } from "./giris.js";

export default async function render(root) {
  const card = h("div", { class: "auth-card card stack" });
  root.append(card);

  if (!isConfigured || !state.user) {
    card.append(
      iconCircle("lock"),
      h("h1", { class: "center" }, "Bağlantının süresi dolmuş"),
      h("p", { class: "center muted" }, "Şifre yenileme bağlantısı geçersiz ya da kullanılmış. Yeni bir bağlantı isteyebilirsiniz."),
      h("a", { class: "btn btn-primary", href: "#/giris" }, "Girişe dön"),
    );
    return;
  }

  const pw = passwordField("new-password", "Yeni şifre", { autocomplete: "new-password", hint: `En az ${MIN_PASSWORD} karakter.` });
  const pw2 = passwordField("new-password-2", "Yeni şifre (tekrar)", { autocomplete: "new-password" });
  card.append(
    iconCircle("lock"),
    h("h1", { class: "center" }, "Yeni şifrenizi belirleyin"),
    h("form", { class: "stack", onsubmit: async (e) => {
      e.preventDefault();
      if (pw.input.value.length < MIN_PASSWORD) return toast(`Şifre en az ${MIN_PASSWORD} karakter olmalı.`);
      if (pw.input.value !== pw2.input.value) return toast("İki şifre aynı değil.");
      const { error } = await supabase.auth.updateUser({ password: pw.input.value });
      if (error) return toast(authError(error));
      toast("Şifreniz değişti.");
      navigate("/", { replace: true });
    } }, pw.el, pw2.el, h("button", { class: "btn btn-primary btn-xl", type: "submit" }, "Şifremi kaydet")),
  );
  pw.input.focus();
}
