"use client";

import { useMemo, useState } from "react";
import { faqCategoryLabels, faqItems } from "@/lib/content/faqs";
import type { FaqCategory } from "@/lib/content/types";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";

const categories = Object.keys(faqCategoryLabels) as FaqCategory[];

export function FaqExplorer({ locale, limit }: { locale: Locale; limit?: number }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory | "all">("all");
  const labels = locale === "tr"
    ? { search: "Sorularda ara", placeholder: "Örn. konum, şifre, favoriler…", all: "Tümü", empty: "Bu aramayla eşleşen soru bulunamadı." }
    : { search: "Search questions", placeholder: "For example location, password, favorites…", all: "All", empty: "No questions match this search." };

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    const matches = faqItems.filter((item) => {
      const categoryMatch = category === "all" || item.category === category;
      const textMatch = !normalized || `${item.question[locale]} ${item.answer[locale]}`.toLocaleLowerCase(locale).includes(normalized);
      return categoryMatch && textMatch;
    });
    return typeof limit === "number" ? matches.slice(0, limit) : matches;
  }, [category, limit, locale, query]);

  return (
    <div className="faq-explorer">
      {!limit ? (
        <div className="faq-tools">
          <label className="faq-search"><Icon name="search" size={18} /><span className="sr-only">{labels.search}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.placeholder} /></label>
          <div className="faq-categories" aria-label={labels.search}>
            <button className={category === "all" ? "active" : ""} type="button" onClick={() => setCategory("all")} aria-pressed={category === "all"}>{labels.all}</button>
            {categories.map((item) => (
              <button className={category === item ? "active" : ""} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} key={item}>{faqCategoryLabels[item][locale]}</button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="faq-list">
        {filtered.map((item) => (
          <details id={item.id} key={item.id}>
            <summary><span>{item.question[locale]}</span><Icon name="chevron" size={18} /></summary>
            <p>{item.answer[locale]}</p>
          </details>
        ))}
      </div>
      {!filtered.length ? <p className="faq-empty" role="status">{labels.empty}</p> : null}
    </div>
  );
}

