import type { Metadata } from "next";
import Link from "next/link";
import { AdminSectionNav } from "@/components/AdminSectionNav";
import { EmptyState } from "@/components/EmptyState";
import { SafeImage } from "@/components/SafeImage";
import {
  filterAdminProducts,
  parseAdminProductFilters,
  type AdminProductStatus,
} from "@/lib/admin-products";
import { adminProductsUi, getLocale } from "@/lib/i18n";
import { hasActiveAdminProfile } from "@/lib/supabase/admin";
import { getAdminProductCounts, listAdminProducts } from "@/lib/supabase/admin-products";
import { requireUser } from "@/lib/supabase/auth";
import type { Locale } from "@/lib/types";

const PAGE_SIZE = 20;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function productsHref(locale: Locale, status: AdminProductStatus, query: string, page = 1) {
  const params = new URLSearchParams();
  if (status !== "pending") params.set("status", status);
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return `/${locale}/admin/products${suffix ? `?${suffix}` : ""}`;
}

function formatDate(value: string | null, locale: Locale, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: adminProductsUi[locale].title };
}

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = getLocale((await params).locale);
  const ui = adminProductsUi[locale];
  const rawSearch = await searchParams;
  const filters = parseAdminProductFilters({
    status: firstValue(rawSearch.status) ?? "pending",
    query: firstValue(rawSearch.q) ?? "",
    page: firstValue(rawSearch.page) ?? 1,
  });
  const returnTo = productsHref(locale, filters.status, filters.query, filters.page);
  const { supabase, user } = await requireUser(locale, returnTo);
  const activeAdmin = await hasActiveAdminProfile(supabase, user.id);

  if (!activeAdmin) {
    return (
      <section className="prototype-page admin-access-denied">
        <div className="prototype-card">
          <span className="prototype-icon" aria-hidden="true"><span>403</span></span>
          <p className="eyebrow">{ui.eyebrow}</p>
          <h1>{ui.accessDeniedTitle}</h1>
          <p>{ui.accessDeniedText}</p>
          <Link className="btn btn-primary" href={`/${locale}/account`}>{ui.backAccount}</Link>
        </div>
      </section>
    );
  }

  const [allProducts, counts] = await Promise.all([
    listAdminProducts(supabase, filters.status),
    getAdminProductCounts(supabase),
  ]);
  const matching = filterAdminProducts(allProducts, filters.status, filters.query);
  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const currentPage = Math.min(filters.page, pageCount);
  const products = matching.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const tabs: Array<{ status: AdminProductStatus; label: string }> = [
    { status: "pending", label: ui.pending },
    { status: "approved", label: ui.approved },
    { status: "rejected", label: ui.rejected },
    { status: "all", label: ui.all },
  ];
  const stats = [
    { status: "pending" as const, label: ui.pending, value: counts.pending },
    { status: "approved" as const, label: ui.approved, value: counts.approved },
    { status: "rejected" as const, label: ui.rejected, value: counts.rejected },
    { status: "all" as const, label: ui.total, value: counts.total },
  ];

  return (
    <>
      <section className="page-hero admin-products-hero">
        <div className="container"><p className="eyebrow">{ui.eyebrow}</p><h1 className="page-title">{ui.title}</h1><p>{ui.intro}</p></div>
      </section>
      <section className="section admin-products-section">
        <div className="container">
          <AdminSectionNav locale={locale} active="products" />
          <div className="admin-product-stats">
            {stats.map((stat) => <Link className={filters.status === stat.status ? "active" : ""} href={productsHref(locale, stat.status, filters.query)} key={stat.status}><span>{stat.label}</span><strong>{stat.value}</strong></Link>)}
          </div>
          <nav className="admin-filter-tabs" aria-label={ui.status}>
            {tabs.map((tab) => <Link className={filters.status === tab.status ? "active" : ""} href={productsHref(locale, tab.status, filters.query)} aria-current={filters.status === tab.status ? "page" : undefined} key={tab.status}>{tab.label}</Link>)}
          </nav>
          <form className="admin-application-search" method="get">
            <input type="hidden" name="status" value={filters.status} />
            <label htmlFor="admin-product-query">{ui.searchLabel}</label>
            <div><input id="admin-product-query" name="q" defaultValue={filters.query} maxLength={80} placeholder={ui.searchPlaceholder} /><button className="btn btn-primary" type="submit">{ui.search}</button></div>
            <small>{ui.searchLimit}</small>
          </form>

          {products.length ? (
            <div className="admin-product-list">
              {products.map((product) => {
                const image = product.images[0];
                const title = locale === "tr" ? product.title_tr : product.title_en || product.title_tr;
                return (
                  <article className="admin-product-card" key={product.id}>
                    <div className="admin-product-card-image">
                      {image ? <SafeImage src={image.publicUrl} alt={(locale === "tr" ? image.alt_tr : image.alt_en) || title} sizes="(max-width: 720px) 100vw, 260px" /> : <span>{ui.noImage}</span>}
                      {image ? <small>{ui.mainImage}</small> : null}
                    </div>
                    <div className="admin-product-card-body">
                      <header><div><span className={`admin-status-badge ${product.status}`}>{ui.statusLabels[product.status]}</span><h2>{title}</h2><p><code>{product.slug}</code></p></div><strong>{new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", { style: "currency", currency: product.currency }).format(product.price_minor / 100)}</strong></header>
                      <dl>
                        <div><dt>{ui.category}</dt><dd>{locale === "tr" ? product.category.name_tr : product.category.name_en}</dd></div>
                        <div><dt>{ui.producer}</dt><dd>{product.producer.display_name}</dd></div>
                        <div><dt>{ui.location}</dt><dd>{product.district}, {product.city}</dd></div>
                        <div><dt>{ui.stockStatus}</dt><dd>{ui.stockModes[product.stock_mode]}</dd></div>
                        <div><dt>{ui.preparation}</dt><dd>{product.preparation_days} {ui.days}</dd></div>
                        <div><dt>{ui.createdAt}</dt><dd>{formatDate(product.created_at, locale, ui.notProvided)}</dd></div>
                        <div><dt>{ui.updatedAt}</dt><dd>{formatDate(product.updated_at, locale, ui.notProvided)}</dd></div>
                        <div><dt>{ui.reviewedAt}</dt><dd>{formatDate(product.reviewed_at, locale, ui.notProvided)}</dd></div>
                      </dl>
                      {product.rejection_reason ? <p className="admin-product-rejection-preview"><strong>{ui.rejectionPreview}:</strong> {product.rejection_reason}</p> : null}
                      <Link className="btn btn-secondary" href={`/${locale}/admin/products/${product.id}`}>{ui.reviewProduct}</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <EmptyState title={filters.status === "pending" && !filters.query ? ui.noPendingTitle : ui.emptyTitle} text={ui.emptyText} icon="search" />}

          {pageCount > 1 ? <nav className="admin-pagination" aria-label={`${ui.page} ${currentPage}`}>
            {currentPage > 1 ? <Link className="btn btn-secondary" href={productsHref(locale, filters.status, filters.query, currentPage - 1)}>{ui.previous}</Link> : <span />}
            <span>{ui.page} {currentPage} / {pageCount}</span>
            {currentPage < pageCount ? <Link className="btn btn-secondary" href={productsHref(locale, filters.status, filters.query, currentPage + 1)}>{ui.next}</Link> : <span />}
          </nav> : null}
        </div>
      </section>
    </>
  );
}
