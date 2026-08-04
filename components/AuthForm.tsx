"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { loginSchema, sanitizeSignupRole, signupSchema } from "@/lib/auth";
import type { Messages } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";

export function AuthForm({
  mode,
  locale,
  nextPath,
  messages: m,
}: {
  mode: "login" | "register";
  locale: Locale;
  nextPath: string;
  messages: Messages;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setError("");
    setNotice("");

    if (mode === "login") {
      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        setError(m.authValidation);
        return;
      }

      setSubmitting(true);
      const supabase = createClient();
      const result = await supabase.auth.signInWithPassword(parsed.data);
      if (result.error) {
        setError(m.authFailed);
        setSubmitting(false);
        return;
      }
      router.push(nextPath);
      router.refresh();
      return;
    }

    const parsed = signupSchema.safeParse({
      name: String(form.get("name") ?? ""),
      email,
      password,
      confirmation: String(form.get("confirmation") ?? ""),
      role: sanitizeSignupRole(form.get("role")),
      locale,
      termsAccepted: form.get("terms") === "on",
    });
    if (!parsed.success) {
      setError(m.registerValidation);
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: signupError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          display_name: parsed.data.name,
          role: parsed.data.role,
          locale: parsed.data.locale,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (signupError) {
      setError(m.authFailed);
      setSubmitting(false);
      return;
    }
    if (!data.session) {
      setNotice(m.emailConfirmationSent);
      setSubmitting(false);
      return;
    }
    router.push(nextPath);
    router.refresh();
  };

  const continueWithGoogle = async () => {
    setError("");
    setNotice("");
    setSubmitting(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (oauthError) {
      setError(m.authFailed);
      setSubmitting(false);
    }
  };

  return (
    <form className="auth-form" noValidate onSubmit={submit}>
      {mode === "register" ? (
        <label>{m.fullName}
          <input name="name" type="text" autoComplete="name" required maxLength={120} />
        </label>
      ) : null}
      <label>{m.email}
        <input name="email" type="email" autoComplete="email" required maxLength={254} />
      </label>
      <label>{m.password}
        <input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} maxLength={128} required />
      </label>
      {mode === "register" ? (
        <>
          <label>{m.passwordAgain}
            <input name="confirmation" type="password" autoComplete="new-password" minLength={6} maxLength={128} required />
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
          <span>{m.secureSession}</span>
          <Link href={`/${locale}/info/password-reset`}>{m.forgotPassword}</Link>
        </div>
      )}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="form-success" role="status">{notice}</p> : null}
      <button className="btn btn-primary auth-submit" type="submit" disabled={submitting} aria-busy={submitting}>
        {submitting ? <span className="button-spinner" aria-hidden="true" /> : null}
        {submitting ? m.signingIn : mode === "login" ? m.login : m.register}
        {!submitting ? <Icon name="arrow" /> : null}
      </button>
      <button className="btn btn-secondary auth-google" type="button" disabled={submitting} onClick={continueWithGoogle}>
        {m.continueGoogle}
      </button>
      <p className="auth-switch">
        {mode === "login" ? m.noAccount : m.haveAccount}{" "}
        <Link href={`/${locale}/${mode === "login" ? "register" : "login"}`}>
          {mode === "login" ? m.register : m.login}
        </Link>
      </p>
      <p className="demo-warning">{m.authSecurityNote}</p>
    </form>
  );
}
