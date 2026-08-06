import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { SellerAccessStatePanel } from "@/components/SellerAccessStatePanel";
import { formatMinorPrice, matchesSellerOrderFilter, sellerOrderFilterSchema } from "@/lib/commerce";
import { getLocale, sellerOrdersUi } from "@/lib/i18n";
import { listSellerOrders } from "@/lib/supabase/commerce";
import { requireApprovedSeller } from "@/lib/supabase/seller";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: sellerOrdersUi[locale].title };
}

export default async function SellerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = getLocale((await params).locale);
  const ui = sellerOrdersUi[locale];
  const query = await searchParams;
  const rawFilter = Array.isArray(query.status)
    ? query.status[0]
    : query.status;
  const parsedFilter = sellerOrderFilterSchema.safeParse(rawFilter);
  const filter = parsedFilter.success ? parsedFilter.data : "all";
  const access = await requireApprovedSeller(
    locale,
    `/${locale}/seller/orders?status=${filter}`,
  );
  if (!access.approved)
    return (
      <SellerAccessStatePanel
        locale={locale}
        state={access.state}
        admin={access.profile.role === "admin"}
      />
    );
  const orders = await listSellerOrders(access.supabase);
  const filtered = orders.filter((order) => matchesSellerOrderFilter(order, filter));
  const filters = [
    "all",
    "awaiting_payment",
    "confirmed",
    "preparing",
    "shipped",
    "delivered",
    "cancelled",
    "expired",
  ] as const;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">{ui.eyebrow}</p>
          <h1 className="page-title">{ui.title}</h1>
          <p>{ui.intro}</p>
        </div>
      </section>
      <section className="section seller-orders-section">
        <div className="container">
          <nav className="seller-order-filters" aria-label={ui.orderStatus}>
            {filters.map((item) => (
              <Link
                className={filter === item ? "active" : ""}
                href={`/${locale}/seller/orders?status=${item}`}
                key={item}
              >
                {ui[item]}
              </Link>
            ))}
          </nav>
          {filtered.length ? (
            <div className="seller-order-list">
              {filtered.map((order) => (
                <article className="seller-order-card" key={order.id}>
                  <div>
                    <p className="eyebrow">{ui.orderNumber}</p>
                    <h2>{order.order_number}</h2>
                    <p>
                      {ui.orderDate}:{" "}
                      {new Intl.DateTimeFormat(
                        locale === "tr" ? "tr-TR" : "en-GB",
                        { dateStyle: "medium", timeStyle: "short" },
                      ).format(new Date(order.created_at))}
                    </p>
                  </div>
                  <div>
                    <span className={`order-status ${order.order_status}`}>
                      {ui[order.order_status]}
                    </span>
                    <span className={`payment-status ${order.payment_status}`}>
                      {ui[order.payment_status]}
                    </span>
                  </div>
                  <dl>
                    <div>
                      <dt>{ui.recipient}</dt>
                      <dd>{order.recipient_name}</dd>
                    </div>
                    <div>
                      <dt>{ui.productCount}</dt>
                      <dd>
                        {order.items.reduce(
                          (sum, item) => sum + item.quantity,
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
                    href={`/${locale}/seller/orders/${order.id}`}
                  >
                    {ui.viewDetail}
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="bag"
              title={orders.length ? ui.noMatchingOrders : ui.noOrders}
              text={ui.intro}
            />
          )}
        </div>
      </section>
    </>
  );
}
