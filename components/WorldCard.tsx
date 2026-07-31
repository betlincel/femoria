import Link from "next/link";
import type { Locale, ProductWorld } from "@/lib/types";
import { productWorlds } from "@/lib/i18n";
import { Icon } from "./Icons";
import { SafeImage } from "./SafeImage";

export function WorldCard({
  world,
  locale,
  cta,
}: {
  world: ProductWorld;
  locale: Locale;
  cta: string;
}) {
  const content = productWorlds[world];

  return (
    <article className={`world-card world-card-${world}`}>
      <SafeImage
        src={content.image}
        alt=""
        sizes="(max-width: 720px) 100vw, 50vw"
      />
      <div className="world-card-overlay" />
      <div className="world-card-content">
        <p className="world-number">{world === "kitchen" ? "01" : "02"}</p>
        <h3>{content.title[locale]}</h3>
        <p>{content.description[locale]}</p>
        <ul aria-label={content.title[locale]}>
          {content.categories.slice(0, 4).map((category) => (
            <li key={category.tr}>{category[locale]}</li>
          ))}
        </ul>
        <Link className="world-link" href={`/${locale}/${world}`}>
          {cta}
          <Icon name="arrow" />
        </Link>
      </div>
    </article>
  );
}
