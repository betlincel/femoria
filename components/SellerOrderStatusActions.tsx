"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  markSellerOrderPreparing,
  markSellerOrderShipped,
} from "@/app/[locale]/seller/orders/actions";
import { sellerOrdersUi } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import type { Database } from "@/lib/supabase/database.types";

export function SellerOrderStatusActions({
  locale,
  orderId,
  orderStatus,
  paymentStatus,
}: {
  locale: Locale;
  orderId: string;
  orderStatus: Database["public"]["Enums"]["order_status"];
  paymentStatus: Database["public"]["Enums"]["payment_status"];
}) {
  const ui = sellerOrdersUi[locale];
  const router = useRouter();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  if (paymentStatus !== "paid") {
    return (
      <p className="seller-order-payment-guard" role="status">
        {ui.paymentRequired}
      </p>
    );
  }

  function handleResult(
    status: "success" | "invalid" | "forbidden" | "conflict" | "error",
  ) {
    if (status === "success") {
      setFeedback({ type: "success", text: ui.updated });
      router.refresh();
      return;
    }
    setFeedback({
      type: "error",
      text:
        status === "conflict" || status === "invalid"
          ? ui.invalidTransition
          : ui.operationFailed,
    });
  }

  if (orderStatus === "confirmed") {
    return (
      <section className="seller-order-actions">
        <h2>{ui.orderStatus}</h2>
        {feedback ? (
          <p
            className={`commerce-feedback ${feedback.type}`}
            role={feedback.type === "error" ? "alert" : "status"}
          >
            {feedback.text}
          </p>
        ) : null}
        <button
          className="btn btn-primary"
          type="button"
          disabled={pending}
          aria-busy={pending}
          onClick={() =>
            startTransition(async () =>
              handleResult(
                (await markSellerOrderPreparing({ locale, orderId })).status,
              ),
            )
          }
        >
          {pending ? ui.processing : ui.startPreparing}
        </button>
      </section>
    );
  }

  if (orderStatus === "preparing") {
    return (
      <section className="seller-order-actions">
        <h2>{ui.shipping}</h2>
        {feedback ? (
          <p
            className={`commerce-feedback ${feedback.type}`}
            role={feedback.type === "error" ? "alert" : "status"}
          >
            {feedback.text}
          </p>
        ) : null}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (pending) return;
            const form = new FormData(event.currentTarget);
            startTransition(async () =>
              handleResult(
                (
                  await markSellerOrderShipped({
                    locale,
                    orderId,
                    carrier: form.get("carrier"),
                    trackingNumber: form.get("trackingNumber"),
                    trackingUrl: form.get("trackingUrl"),
                  })
                ).status,
              ),
            );
          }}
        >
          <label>
            <span>{ui.carrier}</span>
            <input
              name="carrier"
              minLength={2}
              maxLength={80}
              required
              disabled={pending}
            />
          </label>
          <label>
            <span>{ui.trackingNumber}</span>
            <input
              name="trackingNumber"
              minLength={2}
              maxLength={120}
              required
              disabled={pending}
            />
          </label>
          <label>
            <span>{ui.trackingUrl}</span>
            <input
              name="trackingUrl"
              type="url"
              maxLength={500}
              placeholder={ui.trackingUrlOptional}
              disabled={pending}
            />
          </label>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? ui.processing : ui.markShipped}
          </button>
        </form>
      </section>
    );
  }

  return null;
}
