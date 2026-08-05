"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clearUserCart, removeCartItem, updateCartItemQuantity } from "@/app/[locale]/cart/actions";
import { formatMinorPrice, type CartItem, type CartSnapshot } from "@/lib/commerce";
import { commerceUi } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icons";
import { SafeImage } from "./SafeImage";

export function CartView({ cart, locale }: { cart: CartSnapshot; locale: Locale }) {
  const ui = commerceUi[locale];
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const groups = Map.groupBy(cart.items, (item) => item.producer_id);
  const hasInvalid = cart.items.some((item) => item.invalid_reason !== null);

  if (!cart.items.length) {
    return <EmptyState icon="bag" title={ui.cartEmptyTitle} text={ui.cartEmptyText} action={{ href: `/${locale}/products`, label: ui.explore }} />;
  }

  function resultMessage(status: string) {
    return status === "insufficient_stock" ? ui.insufficientStock
      : status === "unavailable" ? ui.unavailable
        : status === "forbidden" ? ui.ownProduct : ui.operationFailed;
  }

  function update(item: CartItem, quantity: number) {
    if (pending || quantity < 1 || quantity > 20) return;
    setFeedback(null); setPendingId(item.id);
    startTransition(async () => {
      const result = await updateCartItemQuantity({ locale, itemId: item.id, quantity });
      if (result.status !== "success") setFeedback(resultMessage(result.status));
      setPendingId(null); router.refresh();
    });
  }

  function remove(itemId: string) {
    if (pending) return;
    setFeedback(null); setPendingId(itemId);
    startTransition(async () => {
      const result = await removeCartItem({ locale, itemId });
      if (result.status !== "success") setFeedback(resultMessage(result.status));
      setPendingId(null); router.refresh();
    });
  }

  return (
    <div className="commerce-layout cart-layout">
      <div className="cart-groups">
        {feedback ? <p className="commerce-feedback error" role="alert">{feedback}</p> : null}
        {[...groups.entries()].map(([producerId, items]) => (
          <section className="cart-producer-card" key={producerId} aria-labelledby={`producer-${producerId}`}>
            <header><p className="eyebrow">{ui.producer}</p><h2 id={`producer-${producerId}`}>{items[0]?.producer_name}</h2></header>
            <div className="cart-items">{items.map((item) => {
              const itemPending = pendingId === item.id;
              const reason = item.invalid_reason === "insufficient_stock" ? ui.insufficientStock : item.invalid_reason === "own_product" ? ui.ownProduct : item.invalid_reason ? ui.unavailable : null;
              return <article className={`cart-item ${reason ? "invalid" : ""}`} key={item.id}>
                <Link className="cart-item-image" href={`/${locale}/products/${item.slug}`}><SafeImage src={item.imageUrl} alt={locale === "tr" ? item.title_tr : item.title_en || item.title_tr} sizes="120px" /></Link>
                <div className="cart-item-copy"><h3><Link href={`/${locale}/products/${item.slug}`}>{locale === "tr" ? item.title_tr : item.title_en || item.title_tr}</Link></h3>
                  <p>{item.stock_mode === "made_to_order" ? ui.preparationDays.replace("{days}", String(item.preparation_days)) : ui.inStock}</p>
                  {reason ? <p className="cart-item-warning" role="status">{reason}</p> : null}
                  <button className="text-link danger" type="button" disabled={pending} onClick={() => remove(item.id)}>{ui.remove}</button>
                </div>
                <div className="cart-item-price"><span>{ui.unitPrice}</span><strong>{formatMinorPrice(item.price_minor, locale)}</strong></div>
                <div className="quantity-control" aria-label={ui.quantity}>
                  <button type="button" aria-label={ui.decrease} disabled={pending || item.quantity <= 1 || Boolean(reason)} onClick={() => update(item, item.quantity - 1)}>−</button>
                  <output aria-live="polite">{itemPending ? "…" : item.quantity}</output>
                  <button type="button" aria-label={ui.increase} disabled={pending || item.quantity >= 20 || Boolean(reason) || (item.stock_mode === "in_stock" && item.quantity >= (item.stock_quantity ?? 0))} onClick={() => update(item, item.quantity + 1)}>+</button>
                </div>
                <div className="cart-line-total"><span>{ui.lineTotal}</span><strong>{formatMinorPrice(item.price_minor * item.quantity, locale)}</strong></div>
              </article>;
            })}</div>
          </section>
        ))}
        <button className="btn btn-secondary" type="button" disabled={pending} onClick={() => startTransition(async () => { await clearUserCart(locale); router.refresh(); })}>{ui.clearCart}</button>
      </div>
      <aside className="order-summary-card">
        <h2>{ui.checkoutTitle}</h2>
        <dl><div><dt>{ui.subtotal}</dt><dd>{formatMinorPrice(cart.subtotal_minor, locale)}</dd></div><div><dt>{ui.shipping}</dt><dd>—</dd></div><div className="total"><dt>{ui.total}</dt><dd>{formatMinorPrice(cart.subtotal_minor, locale)}</dd></div></dl>
        {hasInvalid ? <p className="commerce-notice warning"><Icon name="shield" />{ui.invalidItems}</p> : null}
        {hasInvalid ? <button className="btn btn-primary" type="button" disabled>{ui.checkout}</button> : <Link className="btn btn-primary" href={`/${locale}/checkout`}>{ui.checkout}<Icon name="arrow" /></Link>}
      </aside>
    </div>
  );
}
