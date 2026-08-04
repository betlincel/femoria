import type { ContentSection } from "@/lib/content/types";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";
import { SafeImage } from "./SafeImage";

export function EditorialSections({ sections, locale }: { sections: readonly ContentSection[]; locale: Locale }) {
  return (
    <div className="editorial-sections">
      {sections.map((section, index) => (
        <article className={`editorial-section ${section.image ? "with-image" : ""}`} id={section.id} key={section.id}>
          {section.image ? (
            <div className="editorial-section-image">
              <SafeImage src={section.image.src} alt={section.image.alt[locale]} sizes="(max-width: 800px) 100vw, 38vw" />
            </div>
          ) : null}
          <div className="editorial-section-copy">
            <span className="editorial-index">{String(index + 1).padStart(2, "0")}</span>
            {section.eyebrow ? <p className="eyebrow">{section.eyebrow[locale]}</p> : null}
            <h2>{section.title[locale]}</h2>
            {section.paragraphs[locale].map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets?.[locale].length ? (
              <ul className="editorial-list">
                {section.bullets[locale].map((item) => <li key={item}><Icon name="check" size={16} /><span>{item}</span></li>)}
              </ul>
            ) : null}
            {section.callout ? <aside className="editorial-callout"><Icon name="shield" size={18} /><p>{section.callout[locale]}</p></aside> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

