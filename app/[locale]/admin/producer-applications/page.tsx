import type { Metadata } from "next";
import Link from "next/link";
import { AdminProducerApplicationsPanel } from "@/components/AdminProducerApplicationsPanel";
import { EmptyState } from "@/components/EmptyState";
import {
  filterAdminProducerApplications,
  mapAdminProducerApplication,
  parseAdminApplicationFilters,
  type AdminApplicationStatusFilter,
} from "@/lib/admin-producer-applications";
import { adminProducerApplicationsUi, getLocale } from "@/lib/i18n";
import { hasActiveAdminProfile } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/auth";
import type { Locale } from "@/lib/types";

const PAGE_SIZE = 20;
const QUERY_LIMIT = 200;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function applicationsHref(
  locale: Locale,
  status: AdminApplicationStatusFilter,
  query: string,
  page = 1,
): string {
  const params = new URLSearchParams();
  if (status !== "pending") params.set("status", status);
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return `/${locale}/admin/producer-applications${suffix ? `?${suffix}` : ""}`;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: adminProducerApplicationsUi[locale].title };
}

export default async function AdminProducerApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = getLocale((await params).locale);
  const ui = adminProducerApplicationsUi[locale];
  const rawSearch = await searchParams;
  const filters = parseAdminApplicationFilters({
    status: firstValue(rawSearch.status) ?? "pending",
    query: firstValue(rawSearch.q) ?? "",
    page: firstValue(rawSearch.page) ?? 1,
  });
  const returnTo = applicationsHref(locale, filters.status, filters.query, filters.page);
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

  let request = supabase
    .from("producer_profiles")
    .select(`
      profile_id,
      story_tr,
      story_en,
      verification_status,
      delivery_regions,
      approximate_area,
      approved_at,
      created_at,
      updated_at,
      profile:profiles!producer_profiles_profile_id_fkey!inner(
        display_name,
        city,
        district
      )
    `)
    .order("created_at", { ascending: false })
    .limit(QUERY_LIMIT);

  if (filters.status !== "all") request = request.eq("verification_status", filters.status);
  const { data, error } = await request;
  if (error) throw new Error("Producer applications could not be loaded.");

  const mapped = (data ?? [])
    .map((row) => mapAdminProducerApplication(row))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const matching = filterAdminProducerApplications(mapped, filters.status, filters.query);
  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const currentPage = Math.min(filters.page, pageCount);
  const applications = matching.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const tabs: Array<{ status: AdminApplicationStatusFilter; label: string }> = [
    { status: "pending", label: ui.pending },
    { status: "approved", label: ui.approved },
    { status: "rejected", label: ui.rejected },
    { status: "all", label: ui.all },
  ];

  return (
    <>
      <section className="page-hero admin-applications-hero">
        <div className="container">
          <p className="eyebrow">{ui.eyebrow}</p>
          <h1 className="page-title">{ui.title}</h1>
          <p>{ui.intro}</p>
        </div>
      </section>
      <section className="section admin-applications-section">
        <div className="container">
          <nav className="admin-filter-tabs" aria-label={ui.status}>
            {tabs.map((tab) => (
              <Link
                className={filters.status === tab.status ? "active" : ""}
                href={applicationsHref(locale, tab.status, filters.query)}
                aria-current={filters.status === tab.status ? "page" : undefined}
                key={tab.status}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          <form className="admin-application-search" method="get">
            <input type="hidden" name="status" value={filters.status} />
            <label htmlFor="admin-application-query">{ui.searchLabel}</label>
            <div>
              <input id="admin-application-query" name="q" defaultValue={filters.query} maxLength={80} placeholder={ui.searchPlaceholder} />
              <button className="btn btn-primary" type="submit">{ui.search}</button>
            </div>
            <small>{ui.searchLimit}</small>
          </form>

          {applications.length ? (
            <AdminProducerApplicationsPanel applications={applications} locale={locale} />
          ) : (
            <EmptyState title={ui.emptyTitle} text={ui.emptyText} icon="search" />
          )}

          {pageCount > 1 ? (
            <nav className="admin-pagination" aria-label={`${ui.page} ${currentPage}`}>
              {currentPage > 1 ? <Link className="btn btn-secondary" href={applicationsHref(locale, filters.status, filters.query, currentPage - 1)}>{ui.previous}</Link> : <span />}
              <span>{ui.page} {currentPage} / {pageCount}</span>
              {currentPage < pageCount ? <Link className="btn btn-secondary" href={applicationsHref(locale, filters.status, filters.query, currentPage + 1)}>{ui.next}</Link> : <span />}
            </nav>
          ) : null}
        </div>
      </section>
    </>
  );
}
