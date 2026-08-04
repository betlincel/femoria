import Link from "next/link";
import type { Metadata } from "next";
import { DeliveryExplainer } from "@/components/DeliveryExplainer";
import { EmptyState } from "@/components/EmptyState";
import { FaqExplorer } from "@/components/FaqExplorer";
import { GuideCard } from "@/components/GuideCard";
import { Icon } from "@/components/Icons";
import { ProducerCard } from "@/components/ProducerCard";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { SafeImage } from "@/components/SafeImage";
import { WorldCard } from "@/components/WorldCard";
import { listCatalogProducts } from "@/lib/catalog";
import { buildProducerDirectory } from "@/lib/catalog-view";
import { homeEditorial } from "@/lib/content/editorial-content";
import { guideArticles } from "@/lib/content/guides";
import { getLocale, translations } from "@/lib/i18n";
import type { Product } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return {
    title:
      locale === "tr"
        ? "Kadın emeğini keşfet"
        : "Discover women-made goods",
    description: homeEditorial.purpose.text[locale],
    openGraph: {
      title: locale === "tr" ? "Kadın emeğini keşfet · FEMORIA" : "Discover women-made goods · FEMORIA",
      description: homeEditorial.purpose.text[locale],
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  const products = await listCatalogProducts();
  const kitchenProducts = products.filter((product) => product.world === "kitchen");
  const workshopProducts = products.filter((product) => product.world === "workshop");
  const featuredProduct = products[0];
  const producerDirectory = buildProducerDirectory(products);
  const cities = ["Ankara", "İstanbul", "İzmir", "Bursa"];

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{m.heroEyebrow}</p>
            <h1>
              {m.heroTitleStart} <em>{m.heroTitleEmphasis}</em>
            </h1>
            <p className="hero-description">{m.heroDescription}</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href={`/${locale}/products`}>
                {m.exploreProducts}<Icon name="arrow" />
              </Link>
              <Link className="btn btn-secondary" href={`/${locale}/producers`}>
                {m.nav.producers}
              </Link>
            </div>
            <div className="trust-row">
              <span><Icon name="shield" size={16} />{m.verified}</span>
              <span><Icon name="pin" size={16} />{m.locationProtected}</span>
              <span><Icon name="heart" size={16} />{m.secureRequest}</span>
            </div>
          </div>
          <div className="hero-visual" aria-label={homeEditorial.hero.image.alt[locale]}>
            <div className="hero-arch">
              <SafeImage
                 src={homeEditorial.hero.image.src}
                 alt={homeEditorial.hero.image.alt[locale]}
                sizes="(max-width: 900px) 100vw, 46vw"
                priority
              />
            </div>
            {featuredProduct ? (
              <div className="floating-card hero-product">
                <div className="floating-thumb">
                  <SafeImage src={featuredProduct.image} alt={featuredProduct.imageAlt?.[locale] ?? featuredProduct.title[locale]} sizes="72px" />
                </div>
                <div>
                  <small>{m.miniProduct}</small>
                  <strong>{featuredProduct.title[locale]}</strong>
                  <span>{new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", { style: "currency", currency: featuredProduct.currency }).format(featuredProduct.price)}</span>
                </div>
              </div>
            ) : null}
            <div className="hero-quote"><p>{homeEditorial.purpose.title[locale]}</p><span>{homeEditorial.purpose.eyebrow[locale]}</span></div>
          </div>
        </div>

        <form className="container search-panel" action={`/${locale}/products`}>
          <div className="field">
            <Icon name="search" />
            <label htmlFor="hero-search">{m.searchLabel}</label>
            <input id="hero-search" name="q" placeholder={m.searchPlaceholder} />
          </div>
          <div className="field">
            <Icon name="pin" />
            <label htmlFor="hero-city">{m.cityLabel}</label>
            <select id="hero-city" name="city" defaultValue="">
              <option value="" disabled>{m.cityLabel}</option>
              {cities.map((city) => <option key={city}>{city}</option>)}
            </select>
          </div>
          <button className="btn btn-plum" type="submit">
            {m.search}<Icon name="arrow" size={18} />
          </button>
        </form>
      </section>

      <section className="section editorial-intro-section">
        <div className="container">
          <SectionHeader eyebrow={homeEditorial.purpose.eyebrow[locale]} title={homeEditorial.purpose.title[locale]} text={homeEditorial.purpose.text[locale]} />
          <div className="principle-grid">
            {homeEditorial.principles.map((principle, index) => (
              <article className="principle-card" key={principle.title.tr}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{principle.title[locale]}</h3>
                <p>{principle.text[locale]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section worlds-section">
        <div className="container">
          <SectionHeader
            eyebrow={m.worldsEyebrow}
            title={m.worldsTitle}
            text={m.worldsText}
          />
          <div className="world-grid">
            <WorldCard world="kitchen" locale={locale} cta={m.viewKitchen} />
            <WorldCard world="workshop" locale={locale} cta={m.viewWorkshop} />
          </div>
        </div>
      </section>

      <ProductSection
        className="section-tint"
        eyebrow={m.nearbyKitchenEyebrow}
        title={m.nearbyKitchenTitle}
        text={m.nearbyKitchenText}
        link={{ href: `/${locale}/nearby`, label: m.seeAll }}
        products={kitchenProducts}
        locale={locale}
        messages={m}
        showEmpty
      />

      <ProductSection
        eyebrow={m.todayEyebrow}
        title={m.todayTitle}
        text={m.todayText}
        link={{ href: `/${locale}/kitchen`, label: m.viewKitchen }}
        products={kitchenProducts.slice(0, 2)}
        locale={locale}
        messages={m}
        compact
      />

      <ProductSection
        className="section-pantry"
        eyebrow={m.pantryEyebrow}
        title={m.pantryTitle}
        text={m.pantryText}
        link={{ href: `/${locale}/kitchen`, label: m.viewKitchen }}
        products={kitchenProducts.slice(1)}
        locale={locale}
        messages={m}
        compact
      />

      <ProductSection
        eyebrow={m.workshopEyebrow}
        title={m.workshopCollectionsTitle}
        text={m.workshopCollectionsText}
        link={{ href: `/${locale}/workshop`, label: m.viewWorkshop }}
        products={workshopProducts}
        locale={locale}
        messages={m}
      />

      <section className="section section-tint" id="producers">
        <div className="container">
          <SectionHeader
            eyebrow={m.producerLabel}
            title={m.featuredProducers}
            text={m.featuredProducersText}
            link={{ href: `/${locale}/producers`, label: m.seeProducers }}
          />
          {producerDirectory.length ? <div className="maker-grid maker-grid-home">
            {producerDirectory.slice(0, 3).map((producer) => (
              <ProducerCard
                key={producer.id}
                producer={producer}
                locale={locale}
                messages={m}
              />
            ))}
          </div> : <EmptyState title={m.catalogEmptyTitle} text={m.catalogEmptyText} action={{ href: `/${locale}/products`, label: m.exploreProducts }} />}
        </div>
      </section>

      <DeliveryExplainer messages={m} />

      <section className="section">
        <div className="container ai-panel">
          <div className="ai-copy">
            <p className="eyebrow">{m.aiEyebrow}</p>
            <h2>{m.aiTitle}</h2>
            <p>{m.aiText}</p>
            <span className="soon-label">{m.aiComingSoon}</span>
          </div>
          <div className="ai-chat" aria-label={m.aiTitle}>
            <div className="chat-line">{m.aiQuestion}</div>
            <div className="chat-line reply">
              <span><Icon name="spark" size={16} /></span>{m.aiReply}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container producer-cta" id="producer-cta">
          <div>
            <p className="eyebrow">{m.producerCtaEyebrow}</p>
            <h2>{m.producerCtaTitle}</h2>
            <p>{m.producerCtaText}</p>
            <Link className="btn btn-light" href={`/${locale}/info/producer-application`}>
              {m.startApplication}<Icon name="arrow" />
            </Link>
          </div>
          <div className="producer-cta-image">
            <SafeImage
              src={homeEditorial.trust.image.src}
              alt={homeEditorial.trust.image.alt[locale]}
              sizes="(max-width: 900px) 100vw, 42vw"
            />
          </div>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <SectionHeader
            eyebrow={m.guideEyebrow}
            title={m.guideTitle}
            text={m.guideText}
            link={{ href: `/${locale}/guide`, label: m.allGuides }}
          />
          <div className="editorial-guide-grid">{guideArticles.slice(0, 3).map((guide) => <GuideCard guide={guide} locale={locale} compact key={guide.slug} />)}</div>
        </div>
      </section>

      <section className="section">
        <div className="container faq-home">
          <SectionHeader eyebrow={m.help} title={homeEditorial.faqTitle[locale]} text={homeEditorial.faqText[locale]} link={{ href: `/${locale}/info/help`, label: m.help }} />
          <FaqExplorer locale={locale} limit={4} />
        </div>
      </section>
    </>
  );
}

function ProductSection({
  className = "",
  eyebrow,
  title,
  text,
  link,
  products: sectionProducts,
  locale,
  messages,
  compact = false,
  showEmpty = false,
}: {
  className?: string;
  eyebrow: string;
  title: string;
  text: string;
  link: { href: string; label: string };
  products: Product[];
  locale: ReturnType<typeof getLocale>;
  messages: (typeof translations)[ReturnType<typeof getLocale>];
  compact?: boolean;
  showEmpty?: boolean;
}) {
  if (!sectionProducts.length && !showEmpty) return null;
  return (
    <section className={`section ${className}`}>
      <div className="container">
        <SectionHeader eyebrow={eyebrow} title={title} text={text} link={link} />
        {sectionProducts.length ? (
          <div className={`product-grid ${compact ? "product-grid-compact" : ""}`}>
            {sectionProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                locale={locale}
                messages={messages}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={messages.catalogEmptyTitle}
            text={messages.catalogEmptyText}
            action={{ href: `/${locale}/products`, label: messages.exploreProducts }}
          />
        )}
      </div>
    </section>
  );
}
