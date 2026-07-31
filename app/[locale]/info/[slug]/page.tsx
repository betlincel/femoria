import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icons";
import { getLocale, translations, type Messages } from "@/lib/i18n";

const infoKeys = {
  privacy: ["privacyTitle", "privacyText"],
  terms: ["termsTitle", "termsText"],
  cookies: ["cookiesTitle", "cookiesText"],
  help: ["helpTitle", "helpText"],
  contact: ["contactTitle", "contactText"],
  safety: ["safetyTitle", "safetyText"],
  "producer-application": ["producerTitle", "producerText"],
  "password-reset": ["resetTitle", "resetText"],
  community: ["communityTitle", "communityText"],
  "guide-articles": ["guidesTitle", "guidesText"],
} as const satisfies Record<string, readonly [keyof Messages["info"], keyof Messages["info"]]>;

export function generateStaticParams() {
  return Object.keys(infoKeys).flatMap((slug) => [{ locale: "tr", slug }, { locale: "en", slug }]);
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: value, slug } = await params;
  const locale = getLocale(value);
  const keys = infoKeys[slug as keyof typeof infoKeys];
  return { title: keys ? translations[locale].info[keys[0]] : "FEMORIA" };
}

export default async function InfoPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: value, slug } = await params;
  const locale = getLocale(value);
  const m = translations[locale];
  const keys = infoKeys[slug as keyof typeof infoKeys];
  if (!keys) notFound();
  return (
    <section className="prototype-page">
      <div className="prototype-card">
        <span className="prototype-icon" aria-hidden="true"><Icon name="spark" /></span>
        <p className="eyebrow">FEMORIA</p>
        <h1>{m.info[keys[0]]}</h1>
        <p>{m.info[keys[1]]}</p>
        <Link className="btn btn-primary" href={`/${locale}`}>{m.backHome}<Icon name="arrow" /></Link>
      </div>
    </section>
  );
}
