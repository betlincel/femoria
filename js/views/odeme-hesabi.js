// Ödeme hesabım — satıcının online ödeme alabilmesi için iyzico'ya "alt üye işyeri" kaydı.
// T.C. kimlik numarası ve IBAN yalnızca iyzico'ya iletilir; Femoria saklamaz (IBAN'ın son 4 hanesi hariç).
import { h, loading, toast, icon, withIcon } from "../ui.js";
import { state } from "../store.js";
import { myPayoutAccount, setupPayout } from "../api.js";
import { breadcrumb } from "../components.js";
import { requireAuth } from "../router.js";

export default async function render(root) {
  if (!requireAuth("/odeme-hesabi")) return;
  root.append(breadcrumb(["Ana sayfa", "#/"], ["Profilim", "#/profil"], ["Ödeme hesabım"]), h("h1", {}, "Ödeme hesabım"));
  const body = h("div", {}, loading());
  root.append(body);
  const account = await myPayoutAccount().catch(() => null);

  const name = (state.profile?.full_name || "").trim().split(/\s+/);
  const f = { name: name.slice(0, -1).join(" ") || name[0] || "", surname: name.length > 1 ? name.at(-1) : "", gsm: "", address: "", iban: "", identityNumber: "" };
  const field = (id, label, key, attrs = {}, hint) => h("div", { class: "field" },
    h("label", { for: id }, label),
    h(attrs.rows ? "textarea" : "input", { class: "input", id, ...(attrs.rows ? {} : { value: f[key] }), oninput: (e) => (f[key] = e.target.value), ...attrs }, attrs.rows ? f[key] : null),
    hint ? h("div", { class: "field-help" }, h("span", {}, hint)) : null);

  const err = h("p", { class: "field-error", hidden: true, role: "alert" });
  const btn = h("button", { type: "submit", class: "btn btn-primary btn-xl" }, ...withIcon("lock", account ? "Bilgilerimi güncelle" : "Ödeme hesabımı bağla"));

  const form = h("form", { class: "card stack", novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    err.hidden = true;
    btn.disabled = true;
    btn.replaceChildren("iyzico'ya kaydediliyor…");
    try {
      const r = await setupPayout({ ...f });
      state.profile && (state.profile.payout_ready = true);
      toast(`Ödeme hesabınız hazır. IBAN ••••${r.iban_last4}`);
      draw({ contact_name: `${f.name} ${f.surname}`, iban_last4: r.iban_last4 });
    } catch (e2) {
      err.textContent = e2.message || "Kaydedilemedi.";
      err.hidden = false;
      btn.disabled = false;
      btn.replaceChildren(...withIcon("lock", account ? "Bilgilerimi güncelle" : "Ödeme hesabımı bağla"));
    }
  } },
    h("div", { class: "grid-2" }, field("pa-name", "Ad", "name", { autocomplete: "given-name" }), field("pa-surname", "Soyad", "surname", { autocomplete: "family-name" })),
    field("pa-gsm", "Cep telefonu", "gsm", { type: "tel", inputmode: "tel", placeholder: "05xx xxx xx xx", autocomplete: "tel" }),
    field("pa-addr", "Adres", "address", { rows: 2, placeholder: "Mahalle, sokak, kapı no, ilçe / il" }),
    field("pa-iban", "IBAN", "iban", { placeholder: "TR00 0000 0000 0000 0000 0000 00", autocomplete: "off", spellcheck: "false" }, "Hesap sizin adınıza olmalı."),
    field("pa-tc", "T.C. kimlik numarası", "identityNumber", { inputmode: "numeric", maxlength: 11, autocomplete: "off" }, "iyzico, yasal zorunluluk gereği satıcının kimliğini doğrular."),
    err, btn,
    h("div", { class: "pay-trust" },
      h("span", {}, icon("shield-check", 18), "T.C. kimlik numaranız ve IBAN'ınız yalnızca iyzico'ya iletilir; Femoria bunları saklamaz."),
      h("span", {}, icon("lock", 18), "Satış ödemesi, alıcı ürünü teslim aldığını onaylayınca iyzico tarafından IBAN'ınıza gönderilir.")),
  );

  function draw(acc) {
    body.replaceChildren(h("div", { class: "stack" },
      acc ? h("div", { class: "notice ok" }, icon("check", 20), h("span", {}, h("strong", {}, "Online ödeme alabiliyorsunuz. "),
        `${acc.contact_name || ""} · IBAN ••••${acc.iban_last4 || ""}. Bilgileriniz değiştiyse aşağıdan güncelleyin.`))
        : h("div", { class: "card stack" },
          h("h2", { style: { margin: 0 } }, "Online ödeme almak için hesabınızı bağlayın"),
          h("p", { class: "muted", style: { margin: 0 } },
            "Alıcılar ürününüzü kartla öder. Para iyzico güvencesinde bekler; alıcı ürünü teslim aldığını onaylayınca hizmet bedeli düşülerek IBAN'ınıza geçer.")),
      form));
  }
  draw(account);
}
