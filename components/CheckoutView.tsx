"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createAwaitingPaymentOrders, deleteUserAddress, saveUserAddress, setDefaultUserAddress } from "@/app/[locale]/checkout/actions";
import { formatMinorPrice, type CartSnapshot, type UserAddress } from "@/lib/commerce";
import { commerceUi } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";
import { SafeImage } from "./SafeImage";

export function CheckoutView({ cart, addresses, locale }: { cart: CartSnapshot; addresses: UserAddress[]; locale: Locale }) {
  const ui = commerceUi[locale];
  const router = useRouter();
  const initialAddress = addresses.find((address) => address.is_default && address.neighborhood) ?? addresses.find((address) => address.neighborhood);
  const [selectedAddressId, setSelectedAddressId] = useState(initialAddress?.id ?? "");
  const [editing, setEditing] = useState<UserAddress | "new" | null>(addresses.length ? null : "new");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const groups = useMemo(() => {
    const result = new Map<string, typeof cart.items>();
    for (const item of cart.items) result.set(item.producer_id, [...(result.get(item.producer_id) ?? []), item]);
    return [...result.values()];
  }, [cart]);

  function submitAddress(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveUserAddress(formData);
      if (result.status === "success") {
        if (result.addressId) setSelectedAddressId(result.addressId);
        setEditing(null); router.refresh(); return;
      }
      setFeedback(result.status === "limit" ? ui.addressLimit : ui.operationFailed);
    });
  }

  function mutateAddress(action: "delete" | "default", addressId: string) {
    setFeedback(null);
    startTransition(async () => {
      const result = action === "delete" ? await deleteUserAddress({ locale, addressId }) : await setDefaultUserAddress({ locale, addressId });
      if (result.status !== "success") setFeedback(ui.operationFailed);
      if (action === "delete" && selectedAddressId === addressId) setSelectedAddressId("");
      router.refresh();
    });
  }

  function createOrder() {
    if (!selectedAddressId || pending) return;
    setFeedback(null);
    const attemptId = crypto.randomUUID();
    startTransition(async () => {
      const result = await createAwaitingPaymentOrders({ locale, addressId: selectedAddressId, attemptId });
      if (result.status === "success" && result.orderId) {
        router.push(`/${locale}/account/orders/${result.orderId}?created=1`);
        router.refresh();
        return;
      }
      setFeedback(result.status === "empty" || result.status === "unavailable" ? ui.invalidItems : ui.operationFailed);
    });
  }

  return (
    <div className="checkout-layout commerce-layout">
      <div className="checkout-main">
        {feedback ? <p className="commerce-feedback error" role="alert">{feedback}</p> : null}
        <section className="checkout-card"><div className="checkout-card-heading"><div><p className="eyebrow">01</p><h2>{ui.deliveryAddress}</h2></div><button className="btn btn-secondary" type="button" disabled={pending || addresses.length >= 10} onClick={() => setEditing("new")}>{ui.newAddress}</button></div>
          {addresses.length ? <div className="address-grid">{addresses.map((address) => <article className={`address-card ${selectedAddressId === address.id ? "selected" : ""} ${!address.neighborhood ? "invalid" : ""}`} key={address.id}>
            <label><input type="radio" name="delivery-address" value={address.id} checked={selectedAddressId === address.id} disabled={!address.neighborhood || pending} onChange={() => setSelectedAddressId(address.id)} /><span><strong>{address.label}</strong>{address.is_default ? <small>{ui.defaultAddress}</small> : null}</span></label>
            <p>{address.recipient_name} · {address.phone}</p><p>{address.neighborhood ? `${address.neighborhood}, ` : ""}{address.district}, {address.city}</p><p>{address.address_line}</p>
            {!address.neighborhood ? <p className="cart-item-warning">{ui.editAddress}: {ui.neighborhood}</p> : null}
            <div className="address-actions"><button type="button" disabled={pending} onClick={() => setEditing(address)}>{ui.editAddress}</button>{!address.is_default ? <button type="button" disabled={pending} onClick={() => mutateAddress("default", address.id)}>{ui.makeDefault}</button> : null}<button type="button" disabled={pending} onClick={() => mutateAddress("delete", address.id)}>{ui.deleteAddress}</button></div>
          </article>)}</div> : <p className="commerce-notice">{ui.noAddress}</p>}
          {editing ? <AddressForm locale={locale} address={editing === "new" ? null : editing} pending={pending} onCancel={() => setEditing(null)} action={submitAddress} /> : null}
        </section>

        <section className="checkout-card"><div className="checkout-card-heading"><div><p className="eyebrow">02</p><h2>{ui.checkoutTitle}</h2></div></div>
          <div className="checkout-product-groups">{groups.map((items) => <article key={items[0]?.producer_id}><h3>{items[0]?.producer_name}</h3>{items.map((item) => <div className="checkout-product" key={item.id}><span><SafeImage src={item.imageUrl} alt={locale === "tr" ? item.title_tr : item.title_en || item.title_tr} sizes="72px" /></span><div><strong>{locale === "tr" ? item.title_tr : item.title_en || item.title_tr}</strong><small>{ui.quantity}: {item.quantity}</small></div><b>{formatMinorPrice(item.price_minor * item.quantity, locale)}</b></div>)}</article>)}</div>
        </section>
      </div>
      <aside className="order-summary-card checkout-summary"><h2>{ui.checkoutTitle}</h2><dl><div><dt>{ui.subtotal}</dt><dd>{formatMinorPrice(cart.subtotal_minor, locale)}</dd></div><div><dt>{ui.shipping}</dt><dd>{formatMinorPrice(0, locale)}</dd></div><div className="total"><dt>{ui.total}</dt><dd>{formatMinorPrice(cart.subtotal_minor, locale)}</dd></div></dl><p className="commerce-notice"><Icon name="shield" />{ui.shippingNotice}</p><p className="commerce-notice important"><Icon name="shield" />{ui.paymentNotice}</p><button className="btn btn-primary" type="button" disabled={pending || !selectedAddressId} aria-busy={pending} onClick={createOrder}>{pending ? ui.processing : ui.createOrder}</button></aside>
    </div>
  );
}

function AddressForm({ locale, address, pending, onCancel, action }: { locale: Locale; address: UserAddress | null; pending: boolean; onCancel: () => void; action: (formData: FormData) => void }) {
  const ui = commerceUi[locale];
  return <form className="address-form" action={action}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="addressId" value={address?.id ?? ""} />
    <div className="field-grid"><label><span>{ui.label}</span><input name="label" minLength={2} maxLength={50} required defaultValue={address?.label ?? ""} /></label><label><span>{ui.recipientName}</span><input name="recipientName" minLength={2} maxLength={120} required defaultValue={address?.recipient_name ?? ""} /></label><label><span>{ui.phone}</span><input name="phone" inputMode="tel" minLength={10} maxLength={30} required defaultValue={address?.phone ?? ""} /></label><label><span>{ui.city}</span><input name="city" minLength={2} maxLength={80} required defaultValue={address?.city ?? ""} /></label><label><span>{ui.district}</span><input name="district" minLength={2} maxLength={80} required defaultValue={address?.district ?? ""} /></label><label><span>{ui.neighborhood}</span><input name="neighborhood" minLength={2} maxLength={120} required defaultValue={address?.neighborhood ?? ""} /></label><label className="wide"><span>{ui.addressLine}</span><textarea name="addressLine" minLength={10} maxLength={500} required defaultValue={address?.address_line ?? ""} /></label><label><span>{ui.postalCode}</span><input name="postalCode" maxLength={20} defaultValue={address?.postal_code ?? ""} /></label><label className="wide"><span>{ui.deliveryNote}</span><textarea name="deliveryNote" maxLength={500} defaultValue={address?.delivery_instructions ?? ""} /></label></div>
    <label className="check"><input type="checkbox" name="isDefault" defaultChecked={address?.is_default ?? false} />{ui.defaultAddress}</label><div className="form-actions"><button className="btn btn-secondary" type="button" disabled={pending} onClick={onCancel}>{ui.cancel}</button><button className="btn btn-primary" type="submit" disabled={pending}>{pending ? ui.processing : ui.saveAddress}</button></div></form>;
}
