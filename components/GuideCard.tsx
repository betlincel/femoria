import Link from "next/link";
import type { GuideArticle } from "@/lib/content/types";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";
import { SafeImage } from "./SafeImage";

export function GuideCard({ guide, locale, compact = false }: { guide: GuideArticle; locale: Locale; compact?: boolean }) {
  return (
    <article className={`editorial-guide-card ${compact ? "compact" : ""}`}>
      <Link className="editorial-guide-image" href={`/${locale}/guide/${guide.slug}`} aria-label={guide.title[locale]}>
        <SafeImage src={guide.cover.src} alt={guide.cover.alt[locale]} sizes={compact ? "(max-width: 720px) 100vw, 33vw" : "(max-width: 720px) 100vw, 31vw"} />
      </Link>
      <div className="editorial-guide-body">
        <div className="editorial-guide-meta"><span>{guide.category[locale]}</span><span>{guide.readingMinutes} min</span></div>
        <h3><Link href={`/${locale}/guide/${guide.slug}`}>{guide.title[locale]}</Link></h3>
        <p>{guide.summary[locale]}</p>
        <Link className="text-link" href={`/${locale}/guide/${guide.slug}`}>
          {locale === "tr" ? "Rehberi oku" : "Read guide"}<Icon name="arrow" size={16} />
        </Link>
      </div>
    </article>
  );
}

