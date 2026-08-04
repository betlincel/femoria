import Link from "next/link";
import type { Messages } from "@/lib/i18n";
import type { ProducerDirectoryEntry } from "@/lib/catalog-view";
import type { Locale } from "@/lib/types";
import { Badge } from "./Badge";
import { SafeImage } from "./SafeImage";

export function ProducerCard({
  producer,
  locale,
  messages: m,
}: {
  producer: ProducerDirectoryEntry;
  locale: Locale;
  messages: Messages;
}) {
  return (
    <article className="maker-card">
      <div className="maker-image">
        <SafeImage
          src={producer.image}
          alt={producer.imageAlt[locale]}
          sizes="(max-width: 720px) 100vw, 33vw"
        />
        <Badge tone="sage">{m.verifiedProfile}</Badge>
      </div>
      <div className="maker-body">
        {producer.area ? <p className="maker-location">{producer.area}</p> : null}
        <h3>{producer.name}</h3>
        <p className="maker-specialty">{producer.specialty[locale]}</p>
        {producer.story[locale] ? <p>{producer.story[locale]}</p> : null}
        <div className="maker-meta">
          <span>{producer.productCount} {m.productCount}</span>
        </div>
        <Link href={`/${locale}/products?q=${encodeURIComponent(producer.name)}`}>
          {m.viewProducts} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
