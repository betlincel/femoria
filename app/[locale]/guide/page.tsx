import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { SafeImage } from "@/components/SafeImage";
import { getLocale, guides, translations } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: locale === "tr" ? "FEMORIA Akademi" : "FEMORIA Academy" };
}

export default async function GuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  return (
    <>
      <section className="page-hero"><div className="container"><p className="eyebrow">{m.guidePageEyebrow}</p><h1 className="page-title">{m.guidePageTitle}</h1><p>{m.guidePageIntro}</p></div></section>
      <div className="container">
        <section className="guide-feature" id="featured-guide">
          <div className="guide-feature-image">
            <SafeImage src="https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1200&q=85" alt={m.featureGuideTitle} sizes="(max-width: 900px) 100vw, 50vw" />
          </div>
          <div className="guide-feature-copy"><p className="eyebrow">{m.guideEyebrow}</p><h2>{m.featureGuideTitle}</h2><p>{m.featureGuideText}</p><a className="btn btn-primary" href="#guide-list">{m.startReading}<Icon name="arrow" /></a></div>
        </section>
        <section className="guide-list" id="guide-list">
          <div className="section-head"><div><p className="eyebrow">{m.allGuides}</p><h2>{m.guideTitle}</h2><p>{m.guideText}</p></div></div>
          <div className="guide-grid">{guides.map((guide) => <article className="guide-card" key={guide.no}><span className="guide-no">{guide.no}</span><h3>{guide.title[locale]}</h3><p>{guide.text[locale]}</p><Link href={`/${locale}/info/guide-articles`}>{m.readGuide} →</Link></article>)}</div>
        </section>
      </div>
    </>
  );
}
