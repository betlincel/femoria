import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { getLocale, translations } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: translations[locale].cartTitle };
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getLocale((await params).locale);
  const m = translations[locale];
  return (
    <>
      <section className="page-hero"><div className="container"><p className="eyebrow">{m.cartEyebrow}</p><h1 className="page-title">{m.cartTitle}</h1><p>{m.cartText}</p></div></section>
      <section className="section"><div className="container"><EmptyState icon="bag" title={m.cartEmptyTitle} text={m.cartEmptyText} action={{ href: `/${locale}/products`, label: m.exploreProducts }} links={[{ href: `/${locale}/kitchen`, label: m.viewKitchen }, { href: `/${locale}/workshop`, label: m.viewWorkshop }, { href: `/${locale}/guide/el-yapimi-urun-kontrol-listesi`, label: m.readGuide }]} /></div></section>
    </>
  );
}
