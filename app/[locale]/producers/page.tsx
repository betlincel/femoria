import type { Metadata } from "next";
import { ProducerCard } from "@/components/ProducerCard";
import { SectionHeader } from "@/components/SectionHeader";
import { getLocale, translations } from "@/lib/i18n";
import { producerProfiles } from "@/lib/presentation-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  return { title: m.producersPageTitle, description: m.producersPageText };
}

export default async function ProducersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];

  return (
    <>
      <section className="page-hero page-hero-makers">
        <div className="container">
          <p className="eyebrow">{m.producersPageEyebrow}</p>
          <h1 className="page-title">{m.producersPageTitle}</h1>
          <p>{m.producersPageText}</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <SectionHeader
            eyebrow={m.verifiedProfile}
            title={m.featuredProducers}
            text={m.featuredProducersText}
          />
          <div className="maker-grid">
            {producerProfiles.map((producer) => (
              <ProducerCard
                key={producer.id}
                producer={producer}
                locale={locale}
                messages={m}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
