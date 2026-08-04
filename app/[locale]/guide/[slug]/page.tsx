import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideCard } from "@/components/GuideCard";
import { Icon } from "@/components/Icons";
import { SafeImage } from "@/components/SafeImage";
import { getGuideBySlug, getRelatedGuides, guideArticles } from "@/lib/content/guides";
import { getLocale } from "@/lib/i18n";

export function generateStaticParams() {
  return guideArticles.flatMap((guide) => [
    { locale: "tr", slug: guide.slug },
    { locale: "en", slug: guide.slug },
  ]);
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: value, slug } = await params;
  const locale = getLocale(value);
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: "FEMORIA" };
  return {
    title: guide.title[locale],
    description: guide.summary[locale],
    openGraph: {
      title: guide.title[locale],
      description: guide.summary[locale],
      images: [{ url: guide.cover.src, alt: guide.cover.alt[locale] }],
      type: "article",
    },
  };
}

export default async function GuideDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: value, slug } = await params;
  const locale = getLocale(value);
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();
  const related = getRelatedGuides(guide);

  return (
    <article className="guide-article">
      <header className="guide-article-hero">
        <div className="container guide-article-hero-grid">
          <div>
            <nav className="breadcrumb" aria-label={locale === "tr" ? "İçerik yolu" : "Breadcrumb"}><Link href={`/${locale}`}>FEMORIA</Link> / <Link href={`/${locale}/guide`}>{locale === "tr" ? "Rehber" : "Guides"}</Link></nav>
            <p className="eyebrow">{guide.editorialLabel[locale]} · {guide.category[locale]}</p>
            <h1>{guide.title[locale]}</h1>
            <p className="guide-article-summary">{guide.summary[locale]}</p>
            <span className="reading-time">{guide.readingMinutes} {locale === "tr" ? "dakika tahmini okuma" : "minute estimated read"}</span>
          </div>
          <div className="guide-article-cover"><SafeImage src={guide.cover.src} alt={guide.cover.alt[locale]} sizes="(max-width: 900px) 100vw, 44vw" priority /></div>
        </div>
      </header>
      <div className="container guide-article-layout">
        <div className="guide-article-body">
          <p className="guide-lead">{guide.intro[locale]}</p>
          {guide.sections.map((section) => (
            <section id={section.id} key={section.id}>
              <h2>{section.title[locale]}</h2>
              {section.paragraphs[locale].map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets?.[locale].length ? <ul>{section.bullets[locale].map((item) => <li key={item}><Icon name="check" size={16} />{item}</li>)}</ul> : null}
            </section>
          ))}
          <section className="guide-conclusion"><h2>{locale === "tr" ? "Kısaca" : "In brief"}</h2><p>{guide.conclusion[locale]}</p></section>
          {guide.note ? <aside className="editorial-callout"><Icon name="shield" /><p>{guide.note[locale]}</p></aside> : null}
        </div>
        <aside className="guide-article-aside">
          <strong>{locale === "tr" ? "Bu rehber hakkında" : "About this guide"}</strong>
          <p>{locale === "tr" ? "Demo/editoryal içeriktir; gerçek kullanıcı deneyimi, tıbbi veya hukuki tavsiye değildir." : "This is demo/editorial content, not a real user testimonial, medical advice, or legal advice."}</p>
          <Link className="text-link" href={`/${locale}/info/safety`}>{locale === "tr" ? "Güvenlik sınırları" : "Safety boundaries"}<Icon name="arrow" size={16} /></Link>
        </aside>
      </div>
      {related.length ? <section className="section section-tint"><div className="container"><div className="section-head"><div><p className="eyebrow">{locale === "tr" ? "İlgili içerikler" : "Related guides"}</p><h2>{locale === "tr" ? "Okumaya devam et" : "Keep reading"}</h2></div></div><div className="editorial-guide-grid">{related.map((item) => <GuideCard guide={item} locale={locale} compact key={item.slug} />)}</div></div></section> : null}
    </article>
  );
}
