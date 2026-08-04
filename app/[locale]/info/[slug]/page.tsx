import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/ContactForm";
import { EditorialSections } from "@/components/EditorialSections";
import { FaqExplorer } from "@/components/FaqExplorer";
import { Icon } from "@/components/Icons";
import { SafeImage } from "@/components/SafeImage";
import { getInfoPage, infoPages } from "@/lib/content/editorial-content";
import { getLocale } from "@/lib/i18n";

export function generateStaticParams() {
  return Object.keys(infoPages).flatMap((slug) => [
    { locale: "tr", slug },
    { locale: "en", slug },
  ]);
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: value, slug } = await params;
  const locale = getLocale(value);
  const page = getInfoPage(slug);
  if (!page) return { title: "FEMORIA" };
  return {
    title: page.title[locale],
    description: page.description[locale],
    openGraph: {
      title: page.title[locale],
      description: page.description[locale],
      ...(page.image ? { images: [{ url: page.image.src, alt: page.image.alt[locale] }] } : {}),
    },
  };
}

export default async function InfoPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: value, slug } = await params;
  const locale = getLocale(value);
  const page = getInfoPage(slug);
  if (!page) notFound();
  const statusLabel = page.status === "planned"
    ? (locale === "tr" ? "Planlanan / demo alan" : "Planned / demo area")
    : (locale === "tr" ? "Editoryal içerik" : "Editorial content");

  return (
    <>
      <section className={`info-hero ${page.image ? "with-image" : ""}`}>
        <div className="container info-hero-grid">
          <div>
            <p className="eyebrow">{page.eyebrow[locale]}</p>
            <h1 className="page-title">{page.title[locale]}</h1>
            <p className="info-intro">{page.intro[locale]}</p>
            <span className={`content-status ${page.status}`}><Icon name={page.status === "planned" ? "spark" : "check"} size={15} />{statusLabel}</span>
          </div>
          {page.image ? <div className="info-hero-image"><SafeImage src={page.image.src} alt={page.image.alt[locale]} sizes="(max-width: 900px) 100vw, 42vw" priority /></div> : null}
        </div>
      </section>

      {page.sections.length ? <section className="section"><div className="container"><EditorialSections sections={page.sections} locale={locale} /></div></section> : null}

      {slug === "help" ? <section className="section help-section"><div className="container"><FaqExplorer locale={locale} /></div></section> : null}
      {slug === "contact" ? <section className="section contact-section"><div className="container contact-layout"><div><p className="eyebrow">{locale === "tr" ? "Demo arayüz" : "Demo interface"}</p><h2>{locale === "tr" ? "Mesaj bilgilerini hazırlayın" : "Prepare your message"}</h2><p>{page.description[locale]}</p></div><ContactForm locale={locale} /></div></section> : null}

      {page.links?.length ? (
        <section className="section info-cta-section">
          <div className="container info-cta">
            <div><p className="eyebrow">FEMORIA</p><h2>{locale === "tr" ? "İlgili alana devam et" : "Continue to a related area"}</h2></div>
            <div className="info-cta-actions">{page.links.map((link) => <Link className="btn btn-primary" href={`/${locale}${link.href}`} key={link.href}>{link.label[locale]}<Icon name="arrow" /></Link>)}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}
