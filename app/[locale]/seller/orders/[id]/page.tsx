import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeImage } from "@/components/SafeImage";
import { SellerAccessStatePanel } from "@/components/SellerAccessStatePanel";
import { SellerOrderStatusActions } from "@/components/SellerOrderStatusActions";
import {
  commerceUuidSchema,
  formatMinorPrice,
  localizeOrderTitle,
  sellerCanViewDelivery,
} from "@/lib/commerce";
import { getLocale, sellerOrdersUi } from "@/lib/i18n";
import { getSellerOrder } from "@/lib/supabase/commerce";
import { requireApprovedSeller } from "@/lib/supabase/seller";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: sellerOrdersUi[locale].detail };
}
export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const values = await params;
  const locale = getLocale(values.locale);
  const ui = sellerOrdersUi[locale];
  const id = commerceUuidSchema.safeParse(values.id);
  if (!id.success) notFound();
  const access = await requireApprovedSeller(
    locale,
    `/${locale}/seller/orders/${values.id}`,
  );
  if (!access.approved)
    return (
      <SellerAccessStatePanel
        locale={locale}
        state={access.state}
        admin={access.profile.role === "admin"}
      />
    );
  const order = await getSellerOrder(access.supabase, id.data);
  if (!order) notFound();
  const statusLabel = ui[order.order_status];
  const canViewDelivery = sellerCanViewDelivery(order.payment_status);
  const hasDeliveryDetails = canViewDelivery && Boolean(
    order.phone && order.neighborhood && order.address_line,
  );
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">{ui.detail}</p>
          <h1 className="page-title">{order.order_number}</h1>
          <div className="order-badges">
            <span className={`order-status ${order.order_status}`}>
              {statusLabel}
            </span>
            <span className={`payment-status ${order.payment_status}`}>
              {ui[order.payment_status]}
            </span>
          </div>
        </div>
      </section>
      <section className="section seller-order-detail-section">
        <div className="container">
          {order.payment_status !== "paid" &&
          order.order_status !== "cancelled" &&
          order.order_status !== "expired" ? (
            <p className="seller-order-payment-guard" role="status">
              {ui.paymentRequired}
            </p>
          ) : null}
          {order.order_status === "cancelled" ? (
            <div className="seller-order-payment-guard" role="status">
              <strong>{ui.cancelledNotice}</strong>
              {order.cancellation_reason ? (
                <p>{ui.cancellationReason}: {order.cancellation_reason}</p>
              ) : null}
            </div>
          ) : null}
          {order.order_status === "expired" ? (
            <p className="seller-order-payment-guard" role="status">{ui.expiredNotice}</p>
          ) : null}
          <div className="seller-order-detail-layout">
            <div className="seller-order-detail-main">
              <section className="checkout-card">
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
                      </div>
                      <strong>
                        {formatMinorPrice(item.line_total_minor, locale)}
                      </strong>
                    </article>
                  ))}
                </div>
              </section>
              <section className="checkout-card">
                <h2>{ui.delivery}</h2>
                {hasDeliveryDetails ? (
                  <address>
                    <strong>{order.recipient_name}</strong>
                    <span>{order.phone}</span>
                    <span>{order.neighborhood}, {order.district}, {order.city}</span>
                    <span>{order.address_line}</span>
                    {order.postal_code ? <span>{order.postal_code}</span> : null}
                    {order.delivery_note ? <small>{order.delivery_note}</small> : null}
                  </address>
                ) : (
                  <p>{ui.deliveryHidden}</p>
                )}
              </section>
              <section className="checkout-card seller-shipping-detail">
                <h2>{ui.shipping}</h2>
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
                        <dt>{ui.trackingUrl}</dt>
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
                    {order.shipped_at ? (
                      <div>
                        <dt>{ui.shippedAt}</dt>
                        <dd>
                          {new Intl.DateTimeFormat(
                            locale === "tr" ? "tr-TR" : "en-GB",
                            { dateStyle: "medium", timeStyle: "short" },
                          ).format(new Date(order.shipped_at))}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <p>{ui.noShipping}</p>
                )}
              </section>
            </div>
            <aside className="seller-order-detail-sidebar">
              <section className="order-summary-card">
                <h2>{ui.detail}</h2>
                <dl>
                  <div>
                    <dt>{ui.recipient}</dt>
                    <dd>{order.recipient_name}</dd>
                  </div>
                  <div>
                    <dt>{ui.orderDate}</dt>
                    <dd>
                      {new Intl.DateTimeFormat(
                        locale === "tr" ? "tr-TR" : "en-GB",
                        { dateStyle: "medium", timeStyle: "short" },
                      ).format(new Date(order.created_at))}
                    </dd>
                  </div>
                  <div className="total">
                    <dt>{ui.total}</dt>
                    <dd>{formatMinorPrice(order.total_minor, locale)}</dd>
                  </div>
                </dl>
              </section>
              <SellerOrderStatusActions
                locale={locale}
                orderId={order.id}
                orderStatus={order.order_status}
                paymentStatus={order.payment_status}
              />
            </aside>
          </div>
          <Link className="text-link" href={`/${locale}/seller/orders`}>
            {ui.backOrders}
          </Link>
        </div>
      </section>
    </>
  );
}
