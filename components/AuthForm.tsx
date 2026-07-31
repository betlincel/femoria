"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createDemoAuthService } from "@/lib/demo-auth";
import type { Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";

export function AuthForm({
  mode,
  locale,
  messages: m,
}: {
  mode: "login" | "register";
  locale: Locale;
  messages: Messages;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleNotice, setGoogleNotice] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    const terms = form.get("terms");
    const role = form.get("role") === "producer" ? "producer" : "buyer";

    if (!email.includes("@") || password.length < 6) {
      setError(m.authValidation);
      return;
    }
    if (mode === "register" && (!name || password !== confirmation || !terms)) {
      setError(m.registerValidation);
      return;
    }

    setError("");
    setSubmitting(true);
    createDemoAuthService(window.localStorage).signIn({
      name: name || email.split("@")[0] || m.demoUser,
      email,
      role,
    });
    window.setTimeout(() => router.push(`/${locale}/account`), 250);
  };

  return (
    <form className="auth-form" noValidate onSubmit={submit}>
      {mode === "register" ? (
        <label>{m.fullName}
          <input name="name" type="text" autoComplete="name" required />
        </label>
      ) : null}
      <label>{m.email}
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>{m.password}
        <input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required />
      </label>
      {mode === "register" ? (
        <>
          <label>{m.passwordAgain}
            <input name="confirmation" type="password" autoComplete="new-password" minLength={6} required />
          </label>
          <fieldset className="role-choice">
            <legend>{m.accountType}</legend>
            <label><input type="radio" name="role" value="buyer" defaultChecked />{m.registerBuyer}</label>
            <label><input type="radio" name="role" value="producer" />{m.registerProducer}</label>
          </fieldset>
          <label className="check auth-check">
            <input name="terms" type="checkbox" required />
            <span>{m.acceptTerms} <Link href={`/${locale}/info/terms`}>{m.terms}</Link></span>
          </label>
        </>
      ) : (
        <div className="auth-options">
          <label className="check auth-check"><input name="remember" type="checkbox" />{m.rememberMe}</label>
          <Link href={`/${locale}/info/password-reset`}>{m.forgotPassword}</Link>
        </div>
      )}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
        {submitting ? m.signingIn : mode === "login" ? m.login : m.register}
        {!submitting ? <Icon name="arrow" /> : null}
      </button>
      <button className="btn btn-secondary auth-google" type="button" onClick={() => setGoogleNotice(true)}>
        {m.continueGoogle}
      </button>
      {googleNotice ? <p className="prototype-notice" role="status">{m.integrationSoon}</p> : null}
      <p className="auth-switch">
        {mode === "login" ? m.noAccount : m.haveAccount}{" "}
        <Link href={`/${locale}/${mode === "login" ? "register" : "login"}`}>
          {mode === "login" ? m.register : m.login}
        </Link>
      </p>
      <p className="demo-warning">{m.demoAuthWarning}</p>
    </form>
  );
}
