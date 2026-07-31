import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { getLocale, translations } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: translations[locale].loginTitle };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  return (
    <section className="auth-page">
      <div className="auth-shell">
        <div className="auth-intro"><p className="eyebrow">{m.loginEyebrow}</p><h1>{m.loginTitle}</h1><p>{m.loginText}</p></div>
        <AuthForm mode="login" locale={locale} messages={m} />
      </div>
    </section>
  );
}
