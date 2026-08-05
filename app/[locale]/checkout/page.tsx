import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/CheckoutView";
import { commerceUi, getLocale } from "@/lib/i18n";
import { requireUser } from "@/lib/supabase/auth";
import { getCartSnapshot, listUserAddresses } from "@/lib/supabase/commerce";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const locale = getLocale((await params).locale); return { title: commerceUi[locale].checkoutTitle }; }
export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getLocale((await params).locale); const ui = commerceUi[locale];
  const { supabase, user } = await requireUser(locale, `/${locale}/checkout`);
  const [cart, addresses] = await Promise.all([getCartSnapshot(supabase), listUserAddresses(supabase, user.id)]);
  if (!cart.items.length) redirect(`/${locale}/cart`);
  if (cart.items.some((item) => item.invalid_reason)) redirect(`/${locale}/cart`);
  return <><section className="page-hero"><div className="container"><p className="eyebrow">{ui.checkoutEyebrow}</p><h1 className="page-title">{ui.checkoutTitle}</h1><p>{ui.paymentNotice}</p></div></section><section className="section commerce-section"><div className="container"><CheckoutView cart={cart} addresses={addresses} locale={locale} /></div></section></>;
}
