import type { Metadata } from "next";
import { DeliveryExplainer } from "@/components/DeliveryExplainer";
import { Icon } from "@/components/Icons";
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
  const steps = [
    { title: m.stepDiscoverTitle, text: m.stepDiscoverText, icon: "compass" as const },
    { title: m.stepCompareTitle, text: m.stepCompareText, icon: "search" as const },
    { title: m.stepRequestTitle, text: m.stepRequestText, icon: "heart" as const },
    { title: m.stepReceiveTitle, text: m.stepReceiveText, icon: "bag" as const },
  ];

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
        <div className="container process-grid">
          {steps.map((step, index) => (
            <article className="process-card" key={step.title}>
              <span className="process-icon"><Icon name={step.icon} /></span>
              <p>{String(index + 1).padStart(2, "0")}</p>
              <h2>{step.title}</h2>
              <span>{step.text}</span>
            </article>
          ))}
        </div>
      </section>
      <DeliveryExplainer messages={m} />
    </>
  );
}
