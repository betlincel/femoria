import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { commerceUi, getLocale } from "@/lib/i18n";
import { requireUser } from "@/lib/supabase/auth";
import { getCartSnapshot } from "@/lib/supabase/commerce";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: commerceUi[locale].cartTitle };
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getLocale((await params).locale);
  const ui = commerceUi[locale];
  const { supabase } = await requireUser(locale, `/${locale}/cart`);
  const cart = await getCartSnapshot(supabase);
  return (
    <>
      <section className="page-hero"><div className="container"><p className="eyebrow">{ui.cartEyebrow}</p><h1 className="page-title">{ui.cartTitle}</h1><p>{ui.cartIntro}</p></div></section>
      <section className="section commerce-section"><div className="container"><CartView cart={cart} locale={locale} /></div></section>
    </>
  );
}
