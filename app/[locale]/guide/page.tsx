import type { Metadata } from "next";
import Link from "next/link";
import { GuideCard } from "@/components/GuideCard";
import { Icon } from "@/components/Icons";
import { SafeImage } from "@/components/SafeImage";
import { guideArticles } from "@/lib/content/guides";
import { editorialVisuals } from "@/lib/content/visuals";
import { getLocale, translations } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  const description = locale === "tr"
    ? "El yapımı ürünler, bakım, güvenli teslimat ve yerel üretim hakkında özgün editoryal rehberler."
    : "Original editorial guides about handmade goods, care, safer handover, and local making.";
  return {
    title: locale === "tr" ? "FEMORIA Rehber" : "FEMORIA Guides",
    description,
    openGraph: { title: locale === "tr" ? "FEMORIA Rehber" : "FEMORIA Guides", description },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  const featured = guideArticles[0];
  return (
    <>
      <section className="page-hero"><div className="container"><p className="eyebrow">{m.guidePageEyebrow}</p><h1 className="page-title">{m.guidePageTitle}</h1><p>{m.guidePageIntro}</p></div></section>
      <div className="container">
        <section className="guide-feature" id="featured-guide">
          <div className="guide-feature-image">
            <SafeImage src={editorialVisuals.guideDesk} alt={featured.cover.alt[locale]} sizes="(max-width: 900px) 100vw, 50vw" />
          </div>
          <div className="guide-feature-copy">
            <p className="eyebrow">{featured.editorialLabel[locale]}</p>
            <h2>{featured.title[locale]}</h2>
            <p>{featured.summary[locale]}</p>
            <Link className="btn btn-primary" href={`/${locale}/guide/${featured.slug}`}>{m.startReading}<Icon name="arrow" /></Link>
          </div>
        </section>
        <section className="guide-list" id="guide-list">
          <div className="section-head"><div><p className="eyebrow">{m.allGuides}</p><h2>{m.guideTitle}</h2><p>{m.guideText}</p></div></div>
          <div className="editorial-guide-grid">{guideArticles.map((guide) => <GuideCard guide={guide} locale={locale} key={guide.slug} />)}</div>
        </section>
      </div>
    </>
  );
}
