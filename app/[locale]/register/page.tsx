import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { safeNextRedirect } from "@/lib/auth";
import { getLocale, translations } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: translations[locale].registerTitle };
}

export default async function RegisterPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const locale = getLocale((await params).locale);
  const nextPath = safeNextRedirect((await searchParams).next, locale);
  const m = translations[locale];
  return (
    <section className="auth-page">
      <div className="auth-shell">
        <div className="auth-intro"><p className="eyebrow">{m.registerEyebrow}</p><h1>{m.registerTitle}</h1><p>{m.registerText}</p></div>
        <AuthForm mode="register" locale={locale} nextPath={nextPath} messages={m} />
      </div>
    </section>
  );
}
