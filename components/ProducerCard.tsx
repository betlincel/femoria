import Link from "next/link";
import type { Messages } from "@/lib/i18n";
import type { ProducerProfile } from "@/lib/presentation-data";
import type { Locale } from "@/lib/types";
import { Badge } from "./Badge";
import { SafeImage } from "./SafeImage";

export function ProducerCard({
  producer,
  locale,
  messages: m,
}: {
  producer: ProducerProfile;
  locale: Locale;
  messages: Messages;
}) {
  return (
    <article className="maker-card">
      <div className="maker-image">
        <SafeImage
          src={producer.image}
          alt={`${producer.name} — ${producer.specialty[locale]}`}
          sizes="(max-width: 720px) 100vw, 33vw"
        />
        <Badge tone="sage">{m.verifiedProfile}</Badge>
      </div>
      <div className="maker-body">
        <p className="maker-location">{producer.city}</p>
        <h3>{producer.name}</h3>
        <p className="maker-specialty">{producer.specialty[locale]}</p>
        <p>{producer.story[locale]}</p>
        <div className="maker-meta">
          <span>★ {producer.rating}</span>
          <span>{producer.productCount} {m.productCount}</span>
        </div>
        <Link href={`/${locale}/products?q=${encodeURIComponent(producer.name)}`}>
          {m.viewProducts} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
