import type { Metadata } from "next";
import { ProducerCard } from "@/components/ProducerCard";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icons";
import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { listCatalogProducts } from "@/lib/catalog";
import { buildProducerDirectory } from "@/lib/catalog-view";
import { producerEditorial } from "@/lib/content/editorial-content";
import { getLocale, translations } from "@/lib/i18n";

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
  const producerDirectory = buildProducerDirectory(await listCatalogProducts());

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
          {producerDirectory.length ? <div className="maker-grid">
            {producerDirectory.map((producer) => (
              <ProducerCard
                key={producer.id}
                producer={producer}
                locale={locale}
                messages={m}
              />
            ))}
          </div> : <EmptyState title={producerEditorial.emptyTitle[locale]} text={producerEditorial.emptyText[locale]} action={{ href: `/${locale}/products`, label: m.exploreProducts }} />}
        </div>
      </section>
      <section className="section section-tint">
        <div className="container principle-grid">
          <article className="principle-card"><Icon name="shield" /><h2>{producerEditorial.verificationTitle[locale]}</h2><p>{producerEditorial.verificationText[locale]}</p><Link className="text-link" href={`/${locale}/info/safety`}>{m.safety}<Icon name="arrow" size={16} /></Link></article>
          <article className="principle-card"><Icon name="heart" /><h2>{producerEditorial.ethicsTitle[locale]}</h2><p>{producerEditorial.ethicsText[locale]}</p><Link className="text-link" href={`/${locale}/info/producer-application`}>{m.startApplication}<Icon name="arrow" size={16} /></Link></article>
        </div>
      </section>
    </>
  );
}
