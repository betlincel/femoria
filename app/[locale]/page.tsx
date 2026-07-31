import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/Icons";
import { ProductCard } from "@/components/ProductCard";
import { categories, getLocale, guides, translations } from "@/lib/i18n";
import { products } from "@/lib/mock-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return {
    title: locale === "tr" ? "Kadın emeğini keşfet" : "Discover women-made goods",
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  const cities = ["Ankara", "İstanbul", "İzmir", "Bursa"];
  const producers = [
    { name: "Nermin’in Mutfağı", area: "Çankaya, Ankara", image: products[0].producerImage, count: 12, customers: 428 },
    { name: "Lale Atölye", area: "Beşiktaş, İstanbul", image: products[3].producerImage, count: 18, customers: 316 },
    { name: "Toprak & İz", area: "Bodrum, Muğla", image: products[5].producerImage, count: 9, customers: 204 },
  ];

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{m.heroEyebrow}</p>
            <h1>{m.heroTitleStart} <em>{m.heroTitleEmphasis}</em></h1>
            <p>{m.heroDescription}</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href={`/${locale}/products`}>{m.exploreProducts}<Icon name="arrow" /></Link>
              <Link className="btn btn-secondary" href={`/${locale}/guide`}>{m.becomeProducer}</Link>
            </div>
            <div className="trust-row">
              <span><i />{m.verified}</span>
              <span><i />{m.locationProtected}</span>
              <span><i />{m.secureRequest}</span>
            </div>
          </div>
          <div className="hero-visual" aria-label={m.producerQuote}>
            <img className="hero-main-image" src="https://images.unsplash.com/photo-1556911073-52527ac43761?auto=format&fit=crop&w=1200&q=90" alt={locale === "tr" ? "Mutfağında üretim yapan kadın" : "Woman maker working in her kitchen"} />
            <div className="floating-card product-mini">
              <img src={products[0].image} alt={products[0].title[locale]} />
              <div><small>{m.miniProduct}</small><strong>{m.miniProductName}</strong><span>{m.miniProductPrice}</span></div>
            </div>
            <div className="floating-card quote-card"><p>{m.producerQuote}</p><span>{m.producerQuoteBy}</span></div>
          </div>
        </div>
        <form className="container search-panel" action={`/${locale}/products`}>
          <div className="field"><Icon name="search" /><label htmlFor="hero-search">{m.searchLabel}</label><input id="hero-search" name="q" placeholder={m.searchPlaceholder} /></div>
          <div className="field"><Icon name="pin" /><label htmlFor="hero-city">{m.cityLabel}</label><select id="hero-city" name="city" defaultValue=""><option value="" disabled>{m.cityLabel}</option>{cities.map((city) => <option key={city}>{city}</option>)}</select></div>
          <button className="btn btn-plum" type="submit">{m.search}<Icon name="arrow" size={18} /></button>
        </form>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><div><p className="eyebrow">{m.sectionCategories}</p><h2>{m.sectionCategories}</h2><p>{m.sectionCategoriesText}</p></div><Link className="text-link" href={`/${locale}/products`}>{m.allCategories} →</Link></div>
          <div className="category-grid">
            {Object.entries(categories).map(([id, item]) => (
              <Link className="category-card" href={`/${locale}/products?category=${id}`} key={id}>
                <span className="category-icon">{item.icon}</span>
                <div><h3>{item[locale]}</h3><span>{products.filter((product) => product.category === id).length} {m.productCount}</span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-head"><div><p className="eyebrow">{m.location}</p><h2>{m.nearbyTitle}</h2><p>{m.nearbyText}</p></div><Link className="text-link" href={`/${locale}/nearby`}>{m.seeAll} →</Link></div>
          <div className="product-grid">{products.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} locale={locale} messages={m} />)}</div>
        </div>
      </section>

      <section className="section" id="producers">
        <div className="container">
          <div className="section-head"><div><p className="eyebrow">{m.producerLabel}</p><h2>{m.featuredProducers}</h2><p>{m.featuredProducersText}</p></div></div>
          <div className="producer-grid">
            {producers.map((producer) => (
              <article className="producer-card" key={producer.name}>
                <div className="producer-head"><img className="producer-avatar" src={producer.image} alt="" /><div><h3>{producer.name}</h3><p>{producer.area}</p></div></div>
                <div className="producer-stats"><span><strong>{producer.count}</strong> {m.productCount}</span><span><strong>{producer.customers}</strong> {m.happyCustomers}</span></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container story-panel">
          <img className="story-visual" src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1100&q=85" alt={locale === "tr" ? "FEMORIA kadın üretici" : "FEMORIA woman maker"} />
          <div className="story-copy"><p className="eyebrow">{m.storyEyebrow}</p><h2>{m.storyTitle}</h2><p>{m.storyText}</p><Link className="btn btn-primary" href={`/${locale}/guide`}>{m.learnStory}<Icon name="arrow" /></Link></div>
        </div>
      </section>

      <section className="section">
        <div className="container ai-panel">
          <div><p className="eyebrow">{m.aiEyebrow}</p><h2>{m.aiTitle}</h2><p>{m.aiText}</p><a className="btn btn-plum" href="#ai-demo">{m.tryAssistant}<Icon name="spark" /></a></div>
          <div className="ai-chat" id="ai-demo"><div className="chat-line">{m.aiQuestion}</div><div className="chat-line reply">{m.aiReply}</div></div>
        </div>
      </section>

      <section className="section">
        <div className="container story-panel">
          <div className="story-copy"><p className="eyebrow">{m.producerCtaEyebrow}</p><h2>{m.producerCtaTitle}</h2><p>{m.producerCtaText}</p><Link className="btn btn-primary" href={`/${locale}/guide`}>{m.startApplication}<Icon name="arrow" /></Link></div>
          <img className="story-visual" src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1100&q=85" alt={locale === "tr" ? "El işi üreten kadın elleri" : "Woman hands making a craft"} />
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-head"><div><p className="eyebrow">{m.guideEyebrow}</p><h2>{m.guideTitle}</h2><p>{m.guideText}</p></div><Link className="text-link" href={`/${locale}/guide`}>{m.allGuides} →</Link></div>
          <div className="guide-grid">{guides.map((guide) => <article className="guide-card" key={guide.no}><span className="guide-no">{guide.no}</span><h3>{guide.title[locale]}</h3><p>{guide.text[locale]}</p><Link href={`/${locale}/guide`}>{m.readGuide} →</Link></article>)}</div>
        </div>
      </section>
    </>
  );
}
