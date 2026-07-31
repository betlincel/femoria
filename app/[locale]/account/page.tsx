import type { Metadata } from "next";
import { AccountView } from "@/components/AccountView";
import { getLocale, translations } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: translations[locale].accountTitle };
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  return (
    <>
      <section className="page-hero"><div className="container"><p className="eyebrow">{m.accountEyebrow}</p><h1 className="page-title">{m.accountTitle}</h1><p>{m.accountText}</p></div></section>
      <section className="section"><div className="container"><AccountView locale={locale} messages={m} /></div></section>
    </>
  );
}
