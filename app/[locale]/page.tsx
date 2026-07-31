import Link from "next/link";
import type { Metadata } from "next";
import { DeliveryExplainer } from "@/components/DeliveryExplainer";
import { Icon } from "@/components/Icons";
import { ProducerCard } from "@/components/ProducerCard";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { SafeImage } from "@/components/SafeImage";
import { WorldCard } from "@/components/WorldCard";
import { getLocale, guides, translations } from "@/lib/i18n";
import { products } from "@/lib/mock-data";
import { producerProfiles } from "@/lib/presentation-data";

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
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  const kitchenProducts = products.filter((product) => product.world === "kitchen");
  const workshopProducts = products.filter((product) => product.world === "workshop");
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
          <div className="hero-visual" aria-label={m.producerQuote}>
            <div className="hero-arch">
              <SafeImage
                src="https://images.unsplash.com/photo-1556911073-52527ac43761?auto=format&fit=crop&w=1200&q=90"
                alt=""
                sizes="(max-width: 900px) 100vw, 46vw"
                priority
              />
            </div>
            <div className="floating-card hero-product">
              <div className="floating-thumb">
                <SafeImage src={products[0].image} alt={products[0].title[locale]} sizes="72px" />
              </div>
              <div>
                <small>{m.miniProduct}</small>
                <strong>{products[0].title[locale]}</strong>
                <span>{products[0].price.toLocaleString(locale)} ₺</span>
              </div>
            </div>
            <div className="hero-quote">
              <p>{m.producerQuote}</p>
              <span>{m.producerQuoteBy}</span>
            </div>
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
          <div className="maker-grid maker-grid-home">
            {producerProfiles.slice(0, 3).map((producer) => (
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
              src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1100&q=85"
              alt=""
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
          <div className="guide-grid">
            {guides.map((guide) => (
              <article className="guide-card" key={guide.no}>
                <span className="guide-no">{guide.no}</span>
                <h3>{guide.title[locale]}</h3>
                <p>{guide.text[locale]}</p>
                <Link href={`/${locale}/guide`}>{m.readGuide} →</Link>
              </article>
            ))}
          </div>
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
}: {
  className?: string;
  eyebrow: string;
  title: string;
  text: string;
  link: { href: string; label: string };
  products: typeof products;
  locale: ReturnType<typeof getLocale>;
  messages: (typeof translations)[ReturnType<typeof getLocale>];
  compact?: boolean;
}) {
  return (
    <section className={`section ${className}`}>
      <div className="container">
        <SectionHeader eyebrow={eyebrow} title={title} text={text} link={link} />
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
      </div>
    </section>
  );
}
