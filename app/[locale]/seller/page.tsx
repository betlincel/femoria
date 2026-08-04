import type { Metadata } from "next";
import Link from "next/link";
import { SellerAccessStatePanel } from "@/components/SellerAccessStatePanel";
import { SellerProductStatusBadge } from "@/components/SellerProductStatusBadge";
import { sellerUi } from "@/lib/i18n";
import { listSellerProducts } from "@/lib/seller-catalog";
import { requireApprovedSeller } from "@/lib/supabase/seller";
import { getLocale } from "@/lib/i18n";
import { Icon } from "@/components/Icons";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale); return { title: sellerUi[locale].dashboardTitle };
}

export default async function SellerDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = getLocale((await params).locale); const ui = sellerUi[locale];
  const access = await requireApprovedSeller(locale, `/${locale}/seller`);
  if (!access.approved) return <SellerAccessStatePanel locale={locale} state={access.state} admin={access.profile.role === "admin"} />;
  const products = await listSellerProducts(access.supabase, access.user.id);
  const statuses = { draft: 0, pending: 0, approved: 0, rejected: 0 };
  products.forEach((product) => { statuses[product.status] += 1; });
  return <>
    <section className="page-hero seller-dashboard-hero"><div className="container"><p className="eyebrow">{ui.eyebrow}</p><h1 className="page-title">{ui.dashboardTitle}</h1><p>{ui.dashboardIntro}</p></div></section>
    <section className="section seller-dashboard"><div className="container">
      <article className="seller-profile-summary"><div><SellerProductStatusBadge locale={locale} status="approved" /><h2>{access.profile.display_name}</h2><p>{access.producerProfile?.approximate_area || [access.profile.district, access.profile.city].filter(Boolean).join(", ")}</p></div><span className="seller-verified-mark"><Icon name="shield" />{ui.verified}</span></article>
      <div className="seller-stat-grid">
        <article><strong>{products.length}</strong><span>{ui.totalProducts}</span></article>
        {(["draft", "pending", "approved", "rejected"] as const).map((status) => <article key={status}><strong>{statuses[status]}</strong><span>{ui[status]}</span></article>)}
      </div>
      <nav className="seller-dashboard-actions"><Link className="btn btn-primary" href={`/${locale}/seller/products/new`}>{ui.newProduct}<Icon name="arrow" /></Link><Link className="btn btn-secondary" href={`/${locale}/seller/products`}>{ui.products}</Link><Link className="btn btn-secondary" href={`/${locale}/producers`}>{ui.viewProfile}</Link><Link className="btn btn-secondary" href={`/${locale}/info/producer-application`}>{ui.applicationStatus}</Link></nav>
      <article className="seller-orders-soon"><Icon name="bag" /><div><h2>{ui.ordersSoon}</h2><p>{ui.ordersSoonText}</p></div></article>
    </div></section>
  </>;
}
