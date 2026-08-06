import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminOrderActions } from "@/components/AdminOrderActions";
import { AdminSectionNav } from "@/components/AdminSectionNav";
import { SafeImage } from "@/components/SafeImage";
import { adminOrderIdSchema } from "@/lib/admin-orders";
import { formatMinorPrice, localizeOrderTitle } from "@/lib/commerce";
import { adminOrdersUi, getLocale } from "@/lib/i18n";
import { hasActiveAdminProfile } from "@/lib/supabase/admin";
import {
  getAdminCheckoutGroupOrders,
  getAdminOrderById,
  hasAdminOrderDeadlinePassed,
} from "@/lib/supabase/admin-orders";
import { requireUser } from "@/lib/supabase/auth";
import type { Locale } from "@/lib/types";

function formatDate(value: string | null, locale: Locale, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: adminOrdersUi[locale].detail };
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const values = await params;
  const locale = getLocale(values.locale);
  const ui = adminOrdersUi[locale];
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/admin/orders/${values.id}`,
  );
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

  const orderId = adminOrderIdSchema.safeParse(values.id);
  if (!orderId.success) notFound();
  const order = await getAdminOrderById(supabase, orderId.data);
  if (!order) notFound();
  const checkoutOrders = await getAdminCheckoutGroupOrders(
    supabase,
    order.checkout_group_id,
  );
  const otherOrders = checkoutOrders.filter((item) => item.id !== order.id);
  const groupTotal = checkoutOrders.reduce(
    (total, item) => total + item.total_minor,
    0,
  );

  return (
    <>
      <section className="page-hero admin-order-detail-hero">
        <div className="container">
          <p className="eyebrow">{ui.detail}</p>
          <div className="admin-order-detail-heading">
            <h1 className="page-title">{order.order_number}</h1>
            <div className="order-badges">
              <span className={`order-status ${order.order_status}`}>
                {ui[order.order_status]}
              </span>
              <span className={`payment-status ${order.payment_status}`}>
                {ui[order.payment_status]}
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="section admin-order-detail-section">
        <div className="container">
          <AdminSectionNav locale={locale} active="orders" />
          <div className="admin-order-detail-layout">
            <div className="admin-order-detail-main">
              <section className="admin-detail-card">
                <h2>{ui.products}</h2>
                <div className="order-detail-items">
                  {order.items.map((item) => (
                    <article key={item.id}>
                      <span>
                        <SafeImage
                          src={item.imageUrl}
                          alt={localizeOrderTitle(item, locale)}
                          sizes="96px"
                        />
                      </span>
                      <div>
                        <h3>{localizeOrderTitle(item, locale)}</h3>
                        <p>
                          {ui.unitPrice}:{" "}
                          {formatMinorPrice(item.unit_price_minor, locale)} ·{" "}
                          {ui.quantity}: {item.quantity}
                        </p>
                        {item.product ? (
                          <Link
                            className="text-link"
                            href={`/${locale}/products/${item.product.slug}`}
                          >
                            {ui.currentProduct}
                          </Link>
                        ) : null}
                      </div>
                      <strong>
                        {formatMinorPrice(item.line_total_minor, locale)}
                      </strong>
                    </article>
                  ))}
                </div>
              </section>

              <div className="admin-order-party-grid">
                <section className="admin-detail-card">
                  <h2>{ui.buyerInfo}</h2>
                  <dl className="admin-product-detail-facts compact">
                    <div>
                      <dt>{ui.buyer}</dt>
                      <dd>{order.buyer.display_name}</dd>
                    </div>
                    <div>
                      <dt>{ui.profileId}</dt>
                      <dd>
                        <code>{order.buyer_id}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>{ui.profileStatus}</dt>
                      <dd>{ui[order.buyer.status]}</dd>
                    </div>
                    <div>
                      <dt>{ui.recipient}</dt>
                      <dd>{order.recipient_name}</dd>
                    </div>
                  </dl>
                </section>
                <section className="admin-detail-card">
                  <h2>{ui.producerInfo}</h2>
                  <dl className="admin-product-detail-facts compact">
                    <div>
                      <dt>{ui.producer}</dt>
                      <dd>{order.producer.display_name}</dd>
                    </div>
                    <div>
                      <dt>{ui.profileId}</dt>
                      <dd>
                        <code>{order.producer_id}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>{ui.profileStatus}</dt>
                      <dd>{ui[order.producer.status]}</dd>
                    </div>
                    <div>
                      <dt>{ui.verificationStatus}</dt>
                      <dd>
                        {order.producer.producerProfile
                          ? ui.verification[
                              order.producer.producerProfile.verification_status
                            ]
                          : ui.notProvided}
                      </dd>
                    </div>
                    <div>
                      <dt>{ui.producerSnapshot}</dt>
                      <dd>{order.producer_name_snapshot}</dd>
                    </div>
                  </dl>
                </section>
              </div>

              <section className="admin-detail-card">
                <h2>{ui.deliveryAddress}</h2>
                <address className="admin-order-address">
                  <strong>{order.recipient_name}</strong>
                  <span>{order.phone}</span>
                  <span>
                    {order.neighborhood}, {order.district}, {order.city}
                  </span>
                  <span>{order.address_line}</span>
                  {order.postal_code ? <span>{order.postal_code}</span> : null}
                  {order.delivery_note ? (
                    <small>{order.delivery_note}</small>
                  ) : null}
                </address>
              </section>

              <section className="admin-detail-card admin-checkout-group-card">
                <h2>{ui.otherCheckoutOrders}</h2>
                <p>
                  {ui.checkoutGroupTotal}:{" "}
                  <strong>{formatMinorPrice(groupTotal, locale)}</strong>
                </p>
                {otherOrders.length ? (
                  <div className="admin-checkout-order-list">
                    {otherOrders.map((groupOrder) => (
                      <article key={groupOrder.id}>
                        <div>
                          <strong>{groupOrder.order_number}</strong>
                          <span>{groupOrder.producer.display_name}</span>
                        </div>
                        <span
                          className={`order-status ${groupOrder.order_status}`}
                        >
                          {ui[groupOrder.order_status]}
                        </span>
                        <strong>
                          {formatMinorPrice(groupOrder.total_minor, locale)}
                        </strong>
                        <Link
                          className="text-link"
                          href={`/${locale}/admin/orders/${groupOrder.id}`}
                        >
                          {ui.viewDetail}
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>{ui.noOtherCheckoutOrders}</p>
                )}
              </section>
            </div>

            <aside className="admin-order-detail-sidebar">
              <section className="admin-detail-card">
                <h2>{ui.detail}</h2>
                <dl className="admin-product-detail-facts compact">
                  <div>
                    <dt>{ui.createdAt}</dt>
                    <dd>
                      {formatDate(order.created_at, locale, ui.notProvided)}
                    </dd>
                  </div>
                  <div>
                    <dt>{ui.updatedAt}</dt>
                    <dd>
                      {formatDate(order.updated_at, locale, ui.notProvided)}
                    </dd>
                  </div>
                  <div>
                    <dt>{ui.paidAt}</dt>
                    <dd>{formatDate(order.paid_at, locale, ui.notProvided)}</dd>
                  </div>
                  <div>
                    <dt>{ui.expiresAt}</dt>
                    <dd>
                      {formatDate(order.expires_at, locale, ui.notProvided)}
                    </dd>
                  </div>
                  <div>
                    <dt>{ui.subtotal}</dt>
                    <dd>{formatMinorPrice(order.subtotal_minor, locale)}</dd>
                  </div>
                  <div>
                    <dt>{ui.shippingFee}</dt>
                    <dd>{formatMinorPrice(order.shipping_minor, locale)}</dd>
                  </div>
                  <div>
                    <dt>{ui.total}</dt>
                    <dd>{formatMinorPrice(order.total_minor, locale)}</dd>
                  </div>
                </dl>
              </section>

              <section className="admin-detail-card seller-shipping-detail">
                <h2>{ui.shippingInfo}</h2>
                {order.shipping_carrier ? (
                  <dl>
                    <div>
                      <dt>{ui.carrier}</dt>
                      <dd>{order.shipping_carrier}</dd>
                    </div>
                    <div>
                      <dt>{ui.trackingNumber}</dt>
                      <dd>{order.tracking_number}</dd>
                    </div>
                    {order.tracking_url ? (
                      <div>
                        <dt>{ui.trackingLink}</dt>
                        <dd>
                          <a
                            href={order.tracking_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {order.tracking_url}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>{ui.shippedAt}</dt>
                      <dd>
                        {formatDate(order.shipped_at, locale, ui.notProvided)}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p>{ui.notShipped}</p>
                )}
              </section>

              {order.order_status === "cancelled" ? (
                <section className="admin-detail-card admin-cancellation-audit">
                  <h2>{ui.cancellationAudit}</h2>
                  <p>{order.cancellation_reason || ui.notProvided}</p>
                  <dl className="admin-product-detail-facts compact">
                    <div>
                      <dt>{ui.cancelledAt}</dt>
                      <dd>
                        {formatDate(order.cancelled_at, locale, ui.notProvided)}
                      </dd>
                    </div>
                    <div>
                      <dt>{ui.cancelledBy}</dt>
                      <dd>{order.canceller?.display_name || ui.notProvided}</dd>
                    </div>
                  </dl>
                </section>
              ) : null}

              <AdminOrderActions
                locale={locale}
                orderId={order.id}
                orderStatus={order.order_status}
                paymentStatus={order.payment_status}
                expiresAt={order.expires_at}
                deadlinePassed={hasAdminOrderDeadlinePassed(order.expires_at)}
              />

              <section className="admin-detail-card admin-technical-card">
                <h2>{ui.technicalInfo}</h2>
                <dl className="admin-product-detail-facts compact">
                  <div>
                    <dt>{ui.orderId}</dt>
                    <dd>
                      <code>{order.id}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>{ui.checkoutGroupId}</dt>
                    <dd>
                      <code>{order.checkout_group_id}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>{ui.checkoutAttemptId}</dt>
                    <dd>
                      <code>{order.checkout_attempt_id}</code>
                    </dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>
          <Link className="text-link" href={`/${locale}/admin/orders`}>
            {ui.backOrders}
          </Link>
        </div>
      </section>
    </>
  );
}
