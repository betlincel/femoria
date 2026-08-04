import type { Metadata } from "next";
import { DeliveryExplainer } from "@/components/DeliveryExplainer";
import { Icon } from "@/components/Icons";
import { howItWorksContent } from "@/lib/content/editorial-content";
import { getLocale, translations } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  return { title: m.howPageTitle, description: m.howPageText };
}

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  const icons = ["compass", "search", "heart", "bag"] as const;

  return (
    <>
      <section className="page-hero how-hero">
        <div className="container">
          <p className="eyebrow">{m.howPageEyebrow}</p>
          <h1 className="page-title">{m.howPageTitle}</h1>
          <p>{m.howPageText}</p>
        </div>
      </section>
      <section className="section">
        <div className="container flow-section">
          <div className="section-head"><div><p className="eyebrow">{locale === "tr" ? "Üye yolculuğu" : "Member journey"}</p><h2>{howItWorksContent.memberTitle[locale]}</h2><p>{howItWorksContent.memberText[locale]}</p></div></div>
          <div className="process-grid">
            {howItWorksContent.memberSteps.map((step, index) => (
              <article className={`process-card ${step.status}`} key={step.title.tr}>
                <span className="process-icon"><Icon name={icons[index]} /></span>
                <p>{String(index + 1).padStart(2, "0")}</p>
                <h3>{step.title[locale]}</h3>
                <span>{step.text[locale]}</span>
                <small>{step.status === "planned" ? (locale === "tr" ? "Planlanan" : "Planned") : (locale === "tr" ? "Mevcut" : "Available")}</small>
              </article>
            ))}
          </div>
        </div>
      </section>
      <DeliveryExplainer messages={m} />
      <section className="section section-tint">
        <div className="container flow-section">
          <div className="section-head"><div><p className="eyebrow">{locale === "tr" ? "Üretici yolculuğu" : "Maker journey"}</p><h2>{howItWorksContent.producerTitle[locale]}</h2><p>{howItWorksContent.producerText[locale]}</p></div></div>
          <div className="process-grid">
            {howItWorksContent.producerSteps.map((step, index) => (
              <article className={`process-card ${step.status}`} key={step.title.tr}>
                <span className="process-icon"><Icon name={icons[index]} /></span>
                <p>{String(index + 1).padStart(2, "0")}</p>
                <h3>{step.title[locale]}</h3>
                <span>{step.text[locale]}</span>
                <small>{step.status === "planned" ? (locale === "tr" ? "Planlanan" : "Planned") : (locale === "tr" ? "Mevcut" : "Available")}</small>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
