"use client";

import { FormEvent, useState } from "react";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";

type FormStatus = "idle" | "pending" | "disabled" | "invalid";

export function ContactForm({ locale }: { locale: Locale }) {
  const [status, setStatus] = useState<FormStatus>("idle");
  const t = locale === "tr" ? {
    topic: "Konu", name: "Ad", email: "E-posta", message: "Mesaj", send: "Göndermeyi dene", sending: "Kontrol ediliyor…",
    privacy: "Şifre, kimlik belgesi, ödeme bilgisi veya kesin ev adresi yazmayın.",
    disabled: "Form arayüzü hazır; ancak gerçek e-posta veya destek servisi henüz bağlı olmadığı için mesaj gönderilmedi.",
    invalid: "Lütfen zorunlu alanları geçerli biçimde doldurun.",
    options: ["Genel yardım", "Hesap erişimi", "Şüpheli içerik bildirimi", "Üretici başvurusu", "Teknik geri bildirim"],
  } : {
    topic: "Topic", name: "Name", email: "Email", message: "Message", send: "Try to send", sending: "Checking…",
    privacy: "Do not include passwords, identity documents, payment details, or exact home addresses.",
    disabled: "The form interface is ready, but no email or support service is connected, so the message was not sent.",
    invalid: "Please complete the required fields with valid information.",
    options: ["General help", "Account access", "Report suspicious content", "Maker application", "Technical feedback"],
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) {
      setStatus("invalid");
      return;
    }
    setStatus("pending");
    window.setTimeout(() => setStatus("disabled"), 500);
  };

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <label>{t.topic}<select name="topic" required defaultValue=""><option value="" disabled>—</option>{t.options.map((option) => <option key={option}>{option}</option>)}</select></label>
      <div className="contact-form-grid">
        <label>{t.name}<input name="name" type="text" minLength={2} maxLength={120} required autoComplete="name" /></label>
        <label>{t.email}<input name="email" type="email" maxLength={254} required autoComplete="email" /></label>
      </div>
      <label>{t.message}<textarea name="message" minLength={10} maxLength={1500} rows={7} required /></label>
      <p className="form-privacy"><Icon name="shield" size={16} />{t.privacy}</p>
      {status === "disabled" ? <p className="form-notice" role="status">{t.disabled}</p> : null}
      {status === "invalid" ? <p className="form-error" role="alert">{t.invalid}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={status === "pending"} aria-busy={status === "pending"}>
        {status === "pending" ? t.sending : t.send}<Icon name="arrow" size={18} />
      </button>
    </form>
  );
}
