import Link from "next/link";
import type { Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { Brand } from "./Brand";

export function Footer({ locale, messages: m }: { locale: Locale; messages: Messages }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div><Brand locale={locale} /><p className="footer-summary">{m.footerText}</p></div>
          <div><h3>{m.footerExplore}</h3><ul><li><Link href={`/${locale}/kitchen`}>{m.nav.kitchen}</Link></li><li><Link href={`/${locale}/workshop`}>{m.nav.workshop}</Link></li><li><Link href={`/${locale}/products`}>{m.nav.discover}</Link></li><li><Link href={`/${locale}/producers`}>{m.nav.producers}</Link></li></ul></div>
          <div><h3>{m.footerSupport}</h3><ul><li><Link href={`/${locale}/how-it-works`}>{m.nav.howItWorks}</Link></li><li><Link href={`/${locale}/nearby`}>{m.nav.nearby}</Link></li><li><Link href={`/${locale}/guide`}>{m.nav.guide}</Link></li></ul></div>
          <div><h3>{m.footerLegal}</h3><ul><li><a href="#">{m.privacy}</a></li><li><a href="#">{m.terms}</a></li><li><span>{m.footerNote}</span></li></ul></div>
        </div>
        <div className="footer-bottom"><span>{m.copyright}</span><span>TR · EN</span></div>
      </div>
    </footer>
  );
}
