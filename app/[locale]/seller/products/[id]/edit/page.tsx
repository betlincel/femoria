import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SellerAccessStatePanel } from "@/components/SellerAccessStatePanel";
import { SellerImageManager } from "@/components/SellerImageManager";
import { SellerProductForm } from "@/components/SellerProductForm";
import { SellerProductReviewButton } from "@/components/SellerProductReviewButton";
import { SellerProductStatusBadge } from "@/components/SellerProductStatusBadge";
import { getLocale, sellerUi } from "@/lib/i18n";
import { getSellerProduct, listSellerCategories } from "@/lib/seller-catalog";
import { sellerProductIdSchema } from "@/lib/seller-products";
import { requireApprovedSeller } from "@/lib/supabase/seller";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> { const values = await params; const locale = getLocale(values.locale); return { title: sellerUi[locale].editProduct }; }
export default async function EditSellerProductPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const values = await params; const locale = getLocale(values.locale); const ui = sellerUi[locale]; const id = sellerProductIdSchema.safeParse(values.id); if (!id.success) notFound();
  const access = await requireApprovedSeller(locale, `/${locale}/seller/products/${id.data}/edit`);
  if (!access.approved) return <SellerAccessStatePanel locale={locale} state={access.state} admin={access.profile.role === "admin"} />;
  const [product, categories] = await Promise.all([getSellerProduct(access.supabase, access.user.id, id.data), listSellerCategories(access.supabase)]); if (!product) notFound();
  const editable = product.status === "draft" || product.status === "rejected";
  return <><section className="page-hero seller-edit-hero"><div className="container"><p className="eyebrow">{ui.products}</p><div><h1 className="page-title">{ui.editProduct}</h1><SellerProductStatusBadge status={product.status} locale={locale} /></div></div></section><section className="section"><div className="container seller-edit-layout">{product.status === "rejected" && product.rejection_reason ? <aside className="seller-rejection-detail" role="note"><h2>{ui.rejectionReason}</h2><p>{product.rejection_reason}</p><small>{ui.rejectionReasonHelp}</small></aside> : null}<SellerProductForm locale={locale} categories={categories} product={product} /><SellerImageManager locale={locale} product={product} />{editable ? <SellerProductReviewButton locale={locale} productId={product.id} hasImage={product.images.length > 0} /> : null}<p className="seller-delete-unavailable">{ui.deleteProductUnavailable}</p><Link className="text-link" href={`/${locale}/seller/products`}>{ui.backProducts}</Link></div></section></>;
}
