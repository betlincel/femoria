"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icons";
import { translations } from "@/lib/i18n";

export default function NotFound() {
  const pathname = usePathname();
  const locale = pathname.startsWith("/en") ? "en" : "tr";
  const m = translations[locale];
  return (
    <section className="prototype-page">
      <div className="prototype-card">
        <span className="not-found-code">404</span>
        <h1>{m.notFoundTitle}</h1>
        <p>{m.notFoundText}</p>
        <div className="prototype-actions"><Link className="btn btn-primary" href={`/${locale}`}>{m.backHome}<Icon name="arrow" /></Link><Link className="btn btn-secondary" href={`/${locale}/products`}>{m.exploreProducts}</Link></div>
        <Link className="text-link" href={`/${locale}/guide`}>{m.allGuides}<Icon name="arrow" size={16} /></Link>
      </div>
    </section>
  );
}
