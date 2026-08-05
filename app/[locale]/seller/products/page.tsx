import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { SafeImage } from "@/components/SafeImage";
import { SellerAccessStatePanel } from "@/components/SellerAccessStatePanel";
import { SellerProductStatusBadge } from "@/components/SellerProductStatusBadge";
import { getLocale, sellerUi } from "@/lib/i18n";
import { listSellerProducts } from "@/lib/seller-catalog";
import { sellerProductFilterSchema } from "@/lib/seller-products";
import { requireApprovedSeller } from "@/lib/supabase/seller";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const locale = getLocale((await params).locale); return { title: sellerUi[locale].products }; }

export default async function SellerProductsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = getLocale((await params).locale); const ui = sellerUi[locale]; const query = await searchParams;
  const rawStatus = Array.isArray(query.status) ? query.status[0] : query.status; const status = sellerProductFilterSchema.safeParse(rawStatus).success ? sellerProductFilterSchema.parse(rawStatus) : "all";
  const rawQ = Array.isArray(query.q) ? query.q[0] : query.q; const search = typeof rawQ === "string" ? rawQ.trim().slice(0, 80) : "";
  const returnTo = `/${locale}/seller/products?status=${status}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
  const access = await requireApprovedSeller(locale, returnTo);
  if (!access.approved) return <SellerAccessStatePanel locale={locale} state={access.state} admin={access.profile.role === "admin"} />;
  const products = await listSellerProducts(access.supabase, access.user.id);
  const normalized = search.toLocaleLowerCase("tr-TR");
  const filtered = products.filter((product) => (status === "all" || product.status === status) && (!normalized || [product.title_tr, product.title_en, product.slug].some((value) => value.toLocaleLowerCase("tr-TR").includes(normalized))));
  const filters = ["all", "draft", "pending", "approved", "rejected"] as const;
  return <><section className="page-hero"><div className="container"><p className="eyebrow">{ui.dashboardTitle}</p><h1 className="page-title">{ui.products}</h1></div></section><section className="section seller-products-section"><div className="container">
    <div className="seller-products-toolbar"><nav aria-label={ui.stockStatus}>{filters.map((item) => <Link className={status === item ? "active" : ""} href={`/${locale}/seller/products?status=${item}${search ? `&q=${encodeURIComponent(search)}` : ""}`} key={item}>{ui[item]}</Link>)}</nav><Link className="btn btn-primary" href={`/${locale}/seller/products/new`}>{ui.newProduct}</Link></div>
    <form className="seller-product-search" method="get"><input type="hidden" name="status" value={status} /><label htmlFor="seller-q">{ui.searchProducts}</label><div><input id="seller-q" name="q" defaultValue={search} maxLength={80} placeholder={ui.searchPlaceholder} /><button className="btn btn-secondary" type="submit">{ui.search}</button></div></form>
    {filtered.length ? <div className="seller-product-grid">{filtered.map((product) => <article className="seller-product-card" key={product.id}><div className="seller-product-card-image">{product.images[0] ? <SafeImage src={product.images[0].publicUrl} alt={product.images[0][locale === "tr" ? "alt_tr" : "alt_en"] || product.title_tr} sizes="(max-width: 700px) 100vw, 320px" /> : <span>{ui.noImage}</span>}</div><div className="seller-product-card-body"><div><SellerProductStatusBadge status={product.status} locale={locale} /><small>{product.category[locale === "tr" ? "name_tr" : "name_en"]}</small></div><h2>{locale === "tr" ? product.title_tr : product.title_en || product.title_tr}</h2><dl><div><dt>{ui.price}</dt><dd>{new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", { style: "currency", currency: product.currency }).format(product.price_minor / 100)}</dd></div><div><dt>{ui.location}</dt><dd>{product.district}, {product.city}</dd></div><div><dt>{ui.stockStatus}</dt><dd>{ui.stockModes[product.stock_mode]}</dd></div><div><dt>{ui.preparation}</dt><dd>{product.preparation_days} {ui.days}</dd></div><div><dt>{ui.updatedAt}</dt><dd>{new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", { dateStyle: "medium" }).format(new Date(product.updated_at))}</dd></div></dl>{product.status === "rejected" && product.rejection_reason ? <p className="seller-rejection-preview"><strong>{ui.rejectionReason}:</strong> {product.rejection_reason}</p> : null}<Link className="btn btn-secondary" href={`/${locale}/seller/products/${product.id}/edit`}>{ui.editProduct}</Link></div></article>)}</div> : <EmptyState title={products.length ? ui.noMatch : ui.noProducts} text={ui.noProductsText} action={{ href: `/${locale}/seller/products/new`, label: ui.newProduct }} />}
  </div></section></>;
}
