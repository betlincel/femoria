import type { Metadata } from "next";
import { SellerAccessStatePanel } from "@/components/SellerAccessStatePanel";
import { SellerProductForm } from "@/components/SellerProductForm";
import { getLocale, sellerUi } from "@/lib/i18n";
import { listSellerCategories } from "@/lib/seller-catalog";
import { requireApprovedSeller } from "@/lib/supabase/seller";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const locale = getLocale((await params).locale); return { title: sellerUi[locale].newProduct }; }
export default async function NewSellerProductPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getLocale((await params).locale); const ui = sellerUi[locale]; const access = await requireApprovedSeller(locale, `/${locale}/seller/products/new`);
  if (!access.approved) return <SellerAccessStatePanel locale={locale} state={access.state} admin={access.profile.role === "admin"} />;
  const categories = await listSellerCategories(access.supabase);
  return <><section className="page-hero"><div className="container"><p className="eyebrow">{ui.dashboardTitle}</p><h1 className="page-title">{ui.newProduct}</h1></div></section><section className="section"><div className="container seller-form-shell"><SellerProductForm locale={locale} categories={categories} /></div></section></>;
}
