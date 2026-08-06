import type { Metadata } from "next";
import Link from "next/link";
import { AdminSectionNav } from "@/components/AdminSectionNav";
import { EmptyState } from "@/components/EmptyState";
import {
  filterAdminOrderSearch,
  parseAdminOrderFilters,
  type AdminOrderFilter,
} from "@/lib/admin-orders";
import { formatMinorPrice } from "@/lib/commerce";
import { adminOrdersUi, getLocale } from "@/lib/i18n";
import { hasActiveAdminProfile } from "@/lib/supabase/admin";
import { getAdminOrders } from "@/lib/supabase/admin-orders";
import { requireUser } from "@/lib/supabase/auth";
import type { Locale } from "@/lib/types";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ordersHref(locale: Locale, status: AdminOrderFilter, query: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (query) params.set("q", query);
  const suffix = params.toString();
  return `/${locale}/admin/orders${suffix ? `?${suffix}` : ""}`;
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: adminOrdersUi[locale].title };
}

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = getLocale((await params).locale);
  const ui = adminOrdersUi[locale];
  const rawSearch = await searchParams;
  const filters = parseAdminOrderFilters({
    status: firstValue(rawSearch.status) ?? "all",
    query: firstValue(rawSearch.q) ?? "",
  });
  const returnTo = ordersHref(locale, filters.status, filters.query);
  const { supabase, user } = await requireUser(locale, returnTo);
  const activeAdmin = await hasActiveAdminProfile(supabase, user.id);

  if (!activeAdmin) {
    return (
      <section className="prototype-page admin-access-denied">
        <div className="prototype-card">
          <span className="prototype-icon" aria-hidden="true">
            <span>403</span>
          </span>
          <p className="eyebrow">{ui.eyebrow}</p>
          <h1>{ui.accessDeniedTitle}</h1>
          <p>{ui.accessDeniedText}</p>
          <Link className="btn btn-primary" href={`/${locale}/account`}>
            {ui.backAccount}
          </Link>
        </div>
      </section>
    );
  }

  const loadedOrders = await getAdminOrders(supabase, filters.status);
  const orders = filterAdminOrderSearch(loadedOrders, filters.query);
  const filterOptions: AdminOrderFilter[] = [
    "all",
    "awaiting_payment",
    "paid",
    "unpaid",
    "confirmed",
    "preparing",
    "shipped",
    "delivered",
    "cancelled",
    "expired",
    "failed",
    "refunded",
  ];

  return (
    <>
      <section className="page-hero admin-orders-hero">
        <div className="container">
          <p className="eyebrow">{ui.eyebrow}</p>
          <h1 className="page-title">{ui.title}</h1>
          <p>{ui.intro}</p>
        </div>
      </section>
      <section className="section admin-orders-section">
        <div className="container">
          <AdminSectionNav locale={locale} active="orders" />
          <nav className="admin-order-filters" aria-label={ui.filterStatus}>
            {filterOptions.map((filter) => (
              <Link
                className={filters.status === filter ? "active" : ""}
                href={ordersHref(locale, filter, filters.query)}
                aria-current={filters.status === filter ? "page" : undefined}
                key={filter}
              >
                {ui[filter]}
              </Link>
            ))}
          </nav>
          <form className="admin-application-search" method="get">
            <input type="hidden" name="status" value={filters.status} />
            <label htmlFor="admin-order-query">{ui.searchLabel}</label>
            <div>
              <input
                id="admin-order-query"
                name="q"
                defaultValue={filters.query}
                maxLength={80}
                placeholder={ui.searchPlaceholder}
              />
              <button className="btn btn-primary" type="submit">
                {ui.search}
              </button>
            </div>
            <small>{ui.searchLimit}</small>
          </form>

          {orders.length ? (
            <div className="admin-order-list">
              {orders.map((order) => (
                <article className="admin-order-card" key={order.id}>
                  <header>
                    <div>
                      <p className="eyebrow">{ui.orderNumber}</p>
                      <h2>{order.order_number}</h2>
                      <p>{formatDate(order.created_at, locale)}</p>
                    </div>
                    <div className="order-badges">
                      <span className={`order-status ${order.order_status}`}>
                        {ui[order.order_status]}
                      </span>
                      <span
                        className={`payment-status ${order.payment_status}`}
                      >
                        {ui[order.payment_status]}
                      </span>
                    </div>
                  </header>
                  <dl>
                    <div>
                      <dt>{ui.buyer}</dt>
                      <dd>{order.buyer.display_name}</dd>
                    </div>
                    <div>
                      <dt>{ui.producer}</dt>
                      <dd>{order.producer.display_name}</dd>
                    </div>
                    <div>
                      <dt>{ui.productCount}</dt>
                      <dd>
                        {order.items.reduce(
                          (total, item) => total + item.quantity,
                          0,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>{ui.total}</dt>
                      <dd>{formatMinorPrice(order.total_minor, locale)}</dd>
                    </div>
                    <div>
                      <dt>{ui.shippingStatus}</dt>
                      <dd>{order.shipping_carrier || ui.notShipped}</dd>
                    </div>
                  </dl>
                  <Link
                    className="btn btn-secondary"
                    href={`/${locale}/admin/orders/${order.id}`}
                  >
                    {ui.viewDetail}
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="search"
              title={loadedOrders.length ? ui.noMatchingOrders : ui.noOrders}
              text={ui.intro}
            />
          )}
        </div>
      </section>
    </>
  );
}
