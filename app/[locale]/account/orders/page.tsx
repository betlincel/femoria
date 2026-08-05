import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { formatMinorPrice } from "@/lib/commerce";
import { commerceUi, getLocale } from "@/lib/i18n";
import { requireUser } from "@/lib/supabase/auth";
import { listBuyerOrders } from "@/lib/supabase/commerce";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: commerceUi[locale].ordersTitle };
}
export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = getLocale((await params).locale);
  const ui = commerceUi[locale];
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/account/orders`,
  );
  const orders = await listBuyerOrders(supabase, user.id);
  const groups = new Map<string, typeof orders>();
  for (const order of orders)
    groups.set(order.checkout_group_id, [
      ...(groups.get(order.checkout_group_id) ?? []),
      order,
    ]);
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">{ui.ordersEyebrow}</p>
          <h1 className="page-title">{ui.ordersTitle}</h1>
          <p>{ui.ordersIntro}</p>
        </div>
      </section>
      <section className="section commerce-section">
        <div className="container">
          {orders.length ? (
            <div className="order-history">
              {[...groups.entries()].map(([groupId, groupOrders]) => (
                <section className="order-group" key={groupId}>
                  <header>
                    <span>
                      {new Intl.DateTimeFormat(
                        locale === "tr" ? "tr-TR" : "en-GB",
                        { dateStyle: "long" },
                      ).format(new Date(groupOrders[0]!.created_at))}
                    </span>
                    <code>{groupId.slice(0, 8)}</code>
                  </header>
                  <div>
                    {groupOrders.map((order) => (
                      <article className="order-card" key={order.id}>
                        <div>
                          <p className="eyebrow">{ui.orderNumber}</p>
                          <h2>{order.order_number}</h2>
                          <p>
                            {ui.producer}:{" "}
                            <strong>{order.producer_name_snapshot}</strong>
                          </p>
                        </div>
                        <div className="order-badges">
                          <span
                            className={`order-status ${order.order_status}`}
                          >
                            {ui.orderStatus[order.order_status]}
                          </span>
                          <span
                            className={`payment-status ${order.payment_status}`}
                          >
                            {ui.paymentStatus[order.payment_status]}
                          </span>
                        </div>
                        <dl>
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
                            <dd>
                              {formatMinorPrice(order.total_minor, locale)}
                            </dd>
                          </div>
                        </dl>
                        {order.payment_status !== "paid" ? (
                          <p className="unpaid-inline">{ui.unpaidNotice}</p>
                        ) : null}
                        <Link
                          className="btn btn-secondary"
                          href={`/${locale}/account/orders/${order.id}`}
                        >
                          {ui.viewDetail}
                        </Link>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="bag"
              title={ui.noOrders}
              text={ui.ordersIntro}
              action={{ href: `/${locale}/products`, label: ui.explore }}
            />
          )}
        </div>
      </section>
    </>
  );
}
